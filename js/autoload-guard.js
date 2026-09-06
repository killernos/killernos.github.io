(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PS4AutoloadGuard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var STORAGE_KEYS = {
    autoloadEnabled: "autoloadEnabled",
    consecutiveFailures: "consecutiveFailures",
    launchPending: "launchPending",
    lastLaunchTimestamp: "lastLaunchTimestamp",
    disableReason: "disableReason",
    savedFirmware: "savedFirmware"
  };

  var DEFAULT_CONFIG = {
    autoloadEnabled: false,
    reason: "config-unavailable",
    loaded: false,
    scope: "global-emergency-kill-switch",
    revision: "unavailable",
    disabledBy: "private-repository-deployment",
    expiresAt: "",
    updatedAt: "",
    valid: false
  };

  function globalSetTimeout(callback, delay) {
    if (typeof globalThis !== "undefined" && typeof globalThis.setTimeout === "function") {
      return globalThis.setTimeout(callback, delay);
    }
    throw new Error("setTimeout is unavailable");
  }

  function globalClearTimeout(token) {
    if (typeof globalThis !== "undefined" && typeof globalThis.clearTimeout === "function") {
      globalThis.clearTimeout(token);
    }
  }

  function asBoolean(value) {
    if (value === true || value === "true" || value === "1" || value === 1) return true;
    return false;
  }

  function asInteger(value) {
    var parsed = parseInt(String(value == null ? "0" : value), 10);
    return isFinite(parsed) ? parsed : 0;
  }

  function canUseStorage(storage) {
    return !!(storage && typeof storage.getItem === "function" && typeof storage.setItem === "function");
  }

  function safeGet(storage, key) {
    if (!canUseStorage(storage)) return "";
    try {
      return storage.getItem(key);
    } catch (error) {
      return "";
    }
  }

  function safeSet(storage, key, value) {
    if (!canUseStorage(storage)) return false;
    try {
      storage.setItem(key, String(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function readState(storage) {
    return {
      autoloadEnabled: asBoolean(safeGet(storage, STORAGE_KEYS.autoloadEnabled)),
      consecutiveFailures: asInteger(safeGet(storage, STORAGE_KEYS.consecutiveFailures)),
      launchPending: asBoolean(safeGet(storage, STORAGE_KEYS.launchPending)),
      lastLaunchTimestamp: safeGet(storage, STORAGE_KEYS.lastLaunchTimestamp) || "",
      disableReason: safeGet(storage, STORAGE_KEYS.disableReason) || "",
      savedFirmware: safeGet(storage, STORAGE_KEYS.savedFirmware) || ""
    };
  }

  function writeState(storage, patch) {
    var current = readState(storage);
    var next = {
      autoloadEnabled: patch && patch.autoloadEnabled !== undefined ? !!patch.autoloadEnabled : current.autoloadEnabled,
      consecutiveFailures: patch && patch.consecutiveFailures !== undefined ? Math.max(0, asInteger(patch.consecutiveFailures)) : current.consecutiveFailures,
      launchPending: patch && patch.launchPending !== undefined ? !!patch.launchPending : current.launchPending,
      lastLaunchTimestamp: patch && patch.lastLaunchTimestamp !== undefined ? String(patch.lastLaunchTimestamp || "") : current.lastLaunchTimestamp,
      disableReason: patch && patch.disableReason !== undefined ? String(patch.disableReason || "") : current.disableReason,
      savedFirmware: patch && patch.savedFirmware !== undefined ? String(patch.savedFirmware || "") : current.savedFirmware
    };
    safeSet(storage, STORAGE_KEYS.autoloadEnabled, next.autoloadEnabled ? "true" : "false");
    safeSet(storage, STORAGE_KEYS.consecutiveFailures, String(next.consecutiveFailures));
    safeSet(storage, STORAGE_KEYS.launchPending, next.launchPending ? "true" : "false");
    safeSet(storage, STORAGE_KEYS.lastLaunchTimestamp, next.lastLaunchTimestamp);
    safeSet(storage, STORAGE_KEYS.disableReason, next.disableReason);
    safeSet(storage, STORAGE_KEYS.savedFirmware, next.savedFirmware);
    return next;
  }

  function cloneConfig(config) {
    return {
      autoloadEnabled: !!config.autoloadEnabled,
      reason: String(config.reason || ""),
      loaded: !!config.loaded,
      scope: String(config.scope || DEFAULT_CONFIG.scope),
      revision: String(config.revision || DEFAULT_CONFIG.revision),
      disabledBy: String(config.disabledBy || DEFAULT_CONFIG.disabledBy),
      expiresAt: String(config.expiresAt || ""),
      updatedAt: String(config.updatedAt || ""),
      valid: config.valid === true
    };
  }

  function invalidConfig(reason, raw) {
    var revision = raw && raw.revision ? String(raw.revision) : "invalid";
    return {
      autoloadEnabled: false,
      reason: reason || "config-invalid",
      loaded: true,
      scope: raw && raw.scope ? String(raw.scope) : DEFAULT_CONFIG.scope,
      revision: revision,
      disabledBy: raw && raw.disabledBy ? String(raw.disabledBy) : "private-repository-deployment",
      expiresAt: raw && raw.expiresAt ? String(raw.expiresAt) : "",
      updatedAt: raw && raw.updatedAt ? String(raw.updatedAt) : "",
      valid: false
    };
  }

  function isValidDateString(value) {
    if (!value) return false;
    return !isNaN(Date.parse(String(value)));
  }

  function normalizeConfig(config) {
    var normalized;
    if (!config || typeof config !== "object") return cloneConfig(DEFAULT_CONFIG);
    if (String(config.scope || "") !== DEFAULT_CONFIG.scope) return invalidConfig("config-invalid", config);
    if (!config.revision || !String(config.revision).trim()) return invalidConfig("config-invalid", config);
    if (!config.disabledBy || !String(config.disabledBy).trim()) return invalidConfig("config-invalid", config);
    if (!config.reason || !String(config.reason).trim()) return invalidConfig("config-invalid", config);
    if (!config.updatedAt || !isValidDateString(config.updatedAt)) return invalidConfig("config-invalid", config);
    if (!config.expiresAt || !isValidDateString(config.expiresAt)) return invalidConfig("config-invalid", config);
    normalized = {
      autoloadEnabled: config.autoloadEnabled === true,
      reason: String(config.reason || (config.autoloadEnabled === true ? "enabled" : "config-disabled")),
      loaded: true,
      scope: DEFAULT_CONFIG.scope,
      revision: String(config.revision),
      disabledBy: String(config.disabledBy),
      expiresAt: String(config.expiresAt),
      updatedAt: String(config.updatedAt),
      valid: true
    };
    if (Date.parse(normalized.expiresAt) <= Date.now()) {
      normalized.autoloadEnabled = false;
      normalized.reason = "config-expired";
      normalized.valid = false;
    }
    return normalized;
  }

  async function loadConfig(fetchImpl, url) {
    if (typeof fetchImpl !== "function") return cloneConfig(DEFAULT_CONFIG);
    try {
      var response = await fetchImpl(url, { cache: "no-store" });
      if (!response || !response.ok) return cloneConfig(DEFAULT_CONFIG);
      return normalizeConfig(await response.json());
    } catch (error) {
      return cloneConfig(DEFAULT_CONFIG);
    }
  }

  function handleInterruptedLaunch(storage, currentFirmware) {
    var state = readState(storage);
    var patch = {};
    var interruptedLaunch = state.launchPending === true;
    var firmwareMismatch = !!(state.savedFirmware && currentFirmware && state.savedFirmware !== currentFirmware);
    if (interruptedLaunch) {
      patch.launchPending = false;
      if (!state.disableReason) patch.disableReason = "previous-launch-unfinished";
    }
    if (firmwareMismatch) {
      patch.autoloadEnabled = false;
      patch.disableReason = "firmware-mismatch";
    }
    if (state.consecutiveFailures >= 3 && interruptedLaunch) {
      patch.autoloadEnabled = false;
      patch.disableReason = "three-consecutive-failures";
    }
    if (Object.keys(patch).length) state = writeState(storage, patch);
    return {
      state: state,
      interruptedLaunch: interruptedLaunch,
      firmwareMismatch: firmwareMismatch,
      lockedOut: state.consecutiveFailures >= 3 && state.disableReason === "three-consecutive-failures"
    };
  }

  function beginLaunch(storage, firmware, now) {
    var state = readState(storage);
    return writeState(storage, {
      launchPending: true,
      consecutiveFailures: state.consecutiveFailures + 1,
      lastLaunchTimestamp: now || new Date().toISOString(),
      savedFirmware: firmware || state.savedFirmware,
      disableReason: ""
    });
  }

  function acknowledgeSuccess(storage) {
    return writeState(storage, {
      launchPending: false,
      consecutiveFailures: 0,
      disableReason: ""
    });
  }

  function applySafeMode(storage, reason) {
    return writeState(storage, {
      autoloadEnabled: false,
      launchPending: false,
      disableReason: reason || "safe-mode"
    });
  }

  function isPositiveSuccessSignal(text) {
    var normalized = String(text || "").replace(/\s+/g, " ").trim().toUpperCase();
    return normalized === "ALL DONE"
      || normalized === "ROOT + KERNEL PATCHED -- NO REBOOT"
      || normalized === "ROOT -- NO REBOOT NEEDED"
      || normalized === "REPAIRED -- NO REBOOT NEEDED";
  }

  function canAutoload(capability, config, state, options) {
    var evaluation = {
      allowed: false,
      reason: "autoload-disabled"
    };
    if (!state || state.autoloadEnabled !== true) return evaluation;
    if (!config || config.autoloadEnabled !== true) {
      evaluation.reason = config && config.reason ? config.reason : "config-unavailable";
      return evaluation;
    }
    if (options && options.safeMode) {
      evaluation.reason = "safe-mode";
      return evaluation;
    }
    if (options && options.firmwareMismatch) {
      evaluation.reason = "firmware-mismatch";
      return evaluation;
    }
    if (state.disableReason === "three-consecutive-failures") {
      evaluation.reason = "three-consecutive-failures";
      return evaluation;
    }
    if (!capability || capability.mode !== "runtime") {
      evaluation.reason = "unsupported-firmware";
      return evaluation;
    }
    if (capability.releaseChannel !== "production" || capability.hardwareVerification !== "LOCAL") {
      evaluation.reason = "firmware-not-verified";
      return evaluation;
    }
    evaluation.allowed = true;
    evaluation.reason = "";
    return evaluation;
  }

  function describeGlobalConfig(config) {
    var current = config && typeof config === "object" ? config : DEFAULT_CONFIG;
    return {
      status: current.autoloadEnabled === true && current.valid === true ? "ENABLED" : "DISABLED",
      disabledBy: current.disabledBy || DEFAULT_CONFIG.disabledBy,
      reason: current.reason || DEFAULT_CONFIG.reason,
      revision: current.revision || DEFAULT_CONFIG.revision,
      updatedAt: current.updatedAt || "Not recorded",
      expiresAt: current.expiresAt || "Not recorded",
      scope: current.scope || DEFAULT_CONFIG.scope,
      valid: current.valid === true,
      loaded: current.loaded === true
    };
  }

  function createCancellationController(options) {
    var config = options || {};
    var holdDelayMs = config.holdDelayMs || 800;
    var onCancel = typeof config.onCancel === "function" ? config.onCancel : function () {};
    var scheduler = typeof config.scheduler === "function" ? config.scheduler : globalSetTimeout;
    var cancelScheduler = typeof config.cancelScheduler === "function" ? config.cancelScheduler : globalClearTimeout;
    var optionTimer = null;
    var cancelled = false;

    function optionKey(event) {
      var key = String((event && event.key) || "");
      var code = String((event && event.code) || "");
      var keyCode = event && typeof event.keyCode === "number" ? event.keyCode : -1;
      return key === "SoftRight" || key === "ContextMenu" || key === "Options" || code === "ContextMenu" || keyCode === 93 || keyCode === 135;
    }

    function escapeKey(event) {
      var key = String((event && event.key) || "");
      var code = String((event && event.code) || "");
      var keyCode = event && typeof event.keyCode === "number" ? event.keyCode : -1;
      return key === "Escape" || key === "Esc" || code === "Escape" || keyCode === 27;
    }

    function cancel(reason) {
      if (cancelled) return false;
      cancelled = true;
      if (optionTimer) {
        cancelScheduler(optionTimer);
        optionTimer = null;
      }
      onCancel(reason || "cancelled");
      return true;
    }

    function onKeyDown(event) {
      if (escapeKey(event)) {
        cancel("escape");
        return;
      }
      if (!optionKey(event) || optionTimer || cancelled) return;
      optionTimer = scheduler(function () {
        optionTimer = null;
        cancel("options-hold");
      }, holdDelayMs);
    }

    function onKeyUp(event) {
      if (!optionKey(event) || !optionTimer) return;
      cancelScheduler(optionTimer);
      optionTimer = null;
    }

    function attach(target) {
      if (!target || typeof target.addEventListener !== "function") return;
      target.addEventListener("keydown", onKeyDown, true);
      target.addEventListener("keyup", onKeyUp, true);
    }

    function bindButton(button) {
      if (!button || typeof button.addEventListener !== "function") return;
      button.addEventListener("click", function () {
        cancel("button");
      });
    }

    return {
      attach: attach,
      bindButton: bindButton,
      cancel: cancel,
      isCancelled: function () { return cancelled; }
    };
  }

  function createCountdown(options) {
    var config = options || {};
    var totalSeconds = Math.max(1, asInteger(config.seconds || 8));
    var scheduler = typeof config.scheduler === "function" ? config.scheduler : globalSetTimeout;
    var cancelScheduler = typeof config.cancelScheduler === "function" ? config.cancelScheduler : globalClearTimeout;
    var onTick = typeof config.onTick === "function" ? config.onTick : function () {};
    var onDone = typeof config.onDone === "function" ? config.onDone : function () {};
    var onCancel = typeof config.onCancel === "function" ? config.onCancel : function () {};
    var token = null;
    var active = false;
    var remaining = totalSeconds;

    function step() {
      if (!active) return;
      onTick(remaining);
      if (remaining <= 0) {
        active = false;
        onDone();
        return;
      }
      remaining -= 1;
      token = scheduler(step, 1000);
    }

    return {
      start: function () {
        if (active) return;
        active = true;
        remaining = totalSeconds;
        step();
      },
      cancel: function (reason) {
        if (!active) return false;
        active = false;
        if (token) {
          cancelScheduler(token);
          token = null;
        }
        onCancel(reason || "cancelled");
        return true;
      },
      isActive: function () { return active; }
    };
  }

  return {
    STORAGE_KEYS: STORAGE_KEYS,
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    readState: readState,
    writeState: writeState,
    normalizeConfig: normalizeConfig,
    loadConfig: loadConfig,
    describeGlobalConfig: describeGlobalConfig,
    handleInterruptedLaunch: handleInterruptedLaunch,
    beginLaunch: beginLaunch,
    acknowledgeSuccess: acknowledgeSuccess,
    applySafeMode: applySafeMode,
    isPositiveSuccessSignal: isPositiveSuccessSignal,
    canAutoload: canAutoload,
    createCancellationController: createCancellationController,
    createCountdown: createCountdown
  };
});