"use strict";

// Frontend-only recovery layer.
// Persistent keys:
// - ps4-webkit-next:disable-autoload
// - ps4-webkit-next:autoload-failures
// - ps4-webkit-next:autoload-pending
// - ps4-webkit-next:last-autoload-attempt
// - ps4-webkit-next:last-success

(function () {
  var STORAGE_KEYS = {
    disableAutoload: "ps4-webkit-next:disable-autoload",
    autoloadFailures: "ps4-webkit-next:autoload-failures",
    autoloadPending: "ps4-webkit-next:autoload-pending",
    lastAutoloadAttempt: "ps4-webkit-next:last-autoload-attempt",
    lastSuccess: "ps4-webkit-next:last-success"
  };
  var COUNTDOWN_SECONDS = 8;
  var MAX_FAILURES = 3;
  var RUNTIME_URL = "./runtime/next/run_lapse.html";
  var AUTOLOAD_NAVIGATION_ENABLED = false;
  var VERIFIED_OPTIONS_KEYS = [];
  var VERIFIED_OPTIONS_BUTTONS = [];

  var countdownTimer = null;
  var countdownValue = 0;
  var countdownActive = false;
  var countdownCancelled = false;
  var gamepadPollTimer = null;
  var observedInputs = {};
  var state = {
    storageAvailable: false,
    firmware: "Unknown",
    backend: "None",
    isPS4: false,
    forcedBackend: null,
    upstreamSupported: false,
    launcherReady: false,
    autoloadEnabled: false,
    disableAutoload: false,
    autoloadFailures: 0,
    pendingLaunch: null,
    lastAttempt: null,
    lastSuccess: null,
    holdAfterReenable: false
  };

  function emit(stage, message) {
    if (window.PS4Diag && typeof window.PS4Diag.info === "function") {
      window.PS4Diag.info(stage, message);
      return;
    }
    if (window.console && typeof window.console.log === "function") {
      window.console.log(stage + ": " + message);
    }
  }

  function createStorage() {
    try {
      var probeKey = "ps4-webkit-next:storage-probe";
      window.localStorage.setItem(probeKey, "1");
      window.localStorage.removeItem(probeKey);
      return {
        available: true,
        getBoolean: function (key, fallback) {
          var value = window.localStorage.getItem(key);
          if (value === null) return fallback;
          return value === "true";
        },
        getNumber: function (key, fallback) {
          var value = window.localStorage.getItem(key);
          if (value === null) return fallback;
          var parsed = parseInt(value, 10);
          return isNaN(parsed) ? fallback : parsed;
        },
        getJson: function (key, fallback) {
          var value = window.localStorage.getItem(key);
          if (!value) return fallback;
          try {
            return JSON.parse(value);
          } catch (error) {
            return fallback;
          }
        },
        setBoolean: function (key, value) {
          window.localStorage.setItem(key, value ? "true" : "false");
        },
        setNumber: function (key, value) {
          window.localStorage.setItem(key, String(value));
        },
        setJson: function (key, value) {
          window.localStorage.setItem(key, JSON.stringify(value));
        },
        remove: function (key) {
          window.localStorage.removeItem(key);
        }
      };
    } catch (error) {
      emit("AUTOLOAD-STORAGE-ERROR", "Persistent storage is unavailable. Automatic launch stays disabled and manual launch remains available.");
      return {
        available: false,
        getBoolean: function (key, fallback) { return fallback; },
        getNumber: function (key, fallback) { return fallback; },
        getJson: function (key, fallback) { return fallback; },
        setBoolean: function () {},
        setNumber: function () {},
        setJson: function () {},
        remove: function () {}
      };
    }
  }

  var storage = createStorage();
  state.storageAvailable = storage.available;

  function getElement(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var element = getElement(id);
    if (element) element.textContent = value;
  }

  function setHidden(id, hidden) {
    var element = getElement(id);
    if (!element) return;
    if (hidden) element.classList.add("is-hidden");
    else element.classList.remove("is-hidden");
  }

  function setPill(id, text, tone) {
    var element = getElement(id);
    if (!element) return;
    element.textContent = text;
    element.className = "status-pill " + tone;
  }

  function buildId() {
    if (!window.PS4_WEBKIT_BUILD) return "Unknown";
    return window.PS4_WEBKIT_BUILD.buildId || "Unknown";
  }

  function cacheRevision() {
    if (!window.PS4_WEBKIT_BUILD) return "Unknown";
    return window.PS4_WEBKIT_BUILD.cacheRevision || buildId();
  }

  function detect() {
    var match = /PlayStation\s+4[\/ ](\d+)\.(\d+)/.exec(navigator.userAgent);
    var firmware = null;
    var firmwareNumber = null;
    var forcedBackend = null;
    try {
      forcedBackend = new URLSearchParams(location.search).get("bug");
    } catch (error) {}

    if (match) {
      var minor = parseInt(match[2], 16);
      var normalizedMinor = minor.toString(16);
      if (normalizedMinor.length < 2) normalizedMinor = "0" + normalizedMinor;
      firmware = match[1] + "." + normalizedMinor;
      firmwareNumber = parseInt(match[1], 10) * 100 + parseInt(normalizedMinor, 10);
    }

    var backend = "None";
    var explanation = "User agent is not a PlayStation 4.";
    if (forcedBackend === "lapse" || forcedBackend === "poops") {
      backend = forcedBackend === "lapse" ? "Lapse" : "Poops";
      explanation = "Selected via ?bug=" + forcedBackend + ".";
    } else if (firmwareNumber !== null && firmwareNumber <= 1202) {
      backend = "Lapse";
      explanation = firmware + " is within the Lapse routing range.";
    } else if (firmwareNumber !== null && firmwareNumber >= 1250) {
      backend = "Poops";
      explanation = firmware + " is within the Poops routing range.";
    } else if (firmwareNumber !== null) {
      explanation = firmware + " has no matching backend from 12.03 through 12.49.";
    }

    state.firmware = firmware || "Unknown";
    state.backend = backend;
    state.isPS4 = firmware !== null;
    state.forcedBackend = forcedBackend;
    state.upstreamSupported = backend !== "None";
    state.launcherReady = state.firmware === "12.00" && backend === "Lapse";

    setText("firmware", state.firmware);
    setText("backend", state.backend);
    setPill("upstream-state", state.upstreamSupported ? "Supported Upstream" : "Unsupported Upstream", state.upstreamSupported ? "status-ready" : "status-bad");
    setPill("launcher-state", state.launcherReady ? "Ready" : "Unavailable", state.launcherReady ? "status-ready" : "status-bad");
    setText("routing-status", explanation + (state.launcherReady ? " Existing 12.00 runtime is ready for manual launch." : " Upstream support does not automatically imply a validated local launch path here."));

    window.PS4Runtime = {
      firmware: state.firmware,
      selectedBackend: state.backend,
      isPS4: state.isPS4,
      launcherReady: state.launcherReady,
      backendEntered: false,
      kernelRW: false
    };
  }

  function persistState() {
    if (!storage.available) return;
    storage.setBoolean(STORAGE_KEYS.disableAutoload, state.disableAutoload);
    storage.setNumber(STORAGE_KEYS.autoloadFailures, state.autoloadFailures);
    if (state.pendingLaunch) storage.setJson(STORAGE_KEYS.autoloadPending, state.pendingLaunch);
    else storage.remove(STORAGE_KEYS.autoloadPending);
    if (state.lastAttempt) storage.setJson(STORAGE_KEYS.lastAutoloadAttempt, state.lastAttempt);
    if (state.lastSuccess) storage.setJson(STORAGE_KEYS.lastSuccess, state.lastSuccess);
  }

  function loadPersistentState() {
    state.disableAutoload = storage.getBoolean(STORAGE_KEYS.disableAutoload, false);
    state.autoloadFailures = storage.getNumber(STORAGE_KEYS.autoloadFailures, 0);
    state.pendingLaunch = storage.getJson(STORAGE_KEYS.autoloadPending, null);
    state.lastAttempt = storage.getJson(STORAGE_KEYS.lastAutoloadAttempt, null);
    state.lastSuccess = storage.getJson(STORAGE_KEYS.lastSuccess, null);
  }

  function clearPendingLaunch() {
    state.pendingLaunch = null;
    storage.remove(STORAGE_KEYS.autoloadPending);
  }

  function markSuccess(details) {
    state.lastSuccess = {
      timestamp: new Date().toISOString(),
      attemptId: details && details.attemptId ? details.attemptId : null,
      buildId: buildId(),
      cacheRevision: cacheRevision()
    };
    clearPendingLaunch();
    persistState();
  }

  function noteObservedInput(source, value) {
    var key = source + ":" + value;
    if (observedInputs[key]) return;
    observedInputs[key] = true;
    setText("options-status", "OPTIONS cancellation is pending PS4 hardware verification. Observed input: " + source + " " + value + ". Use Cancel Autoload as the recovery control.");
    emit("AUTOLOAD-STATE", "Observed input during countdown: " + source + " " + value + ". OPTIONS mapping still needs PS4 12.00 hardware verification.");
  }

  function matchesVerifiedOptionsKey(event) {
    for (var i = 0; i < VERIFIED_OPTIONS_KEYS.length; i++) {
      if (VERIFIED_OPTIONS_KEYS[i] === event.code || VERIFIED_OPTIONS_KEYS[i] === event.key) return true;
    }
    return false;
  }

  function matchesVerifiedOptionsButton(index) {
    for (var i = 0; i < VERIFIED_OPTIONS_BUTTONS.length; i++) {
      if (VERIFIED_OPTIONS_BUTTONS[i] === index) return true;
    }
    return false;
  }

  function cancelCountdown(reason, message) {
    if (!countdownActive) return;
    countdownActive = false;
    countdownCancelled = true;
    if (countdownTimer) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (gamepadPollTimer) {
      window.clearInterval(gamepadPollTimer);
      gamepadPollTimer = null;
    }
    emit(reason, message);
    renderAutoloadState("Cancelled", "status-warn", message, false);
  }

  function handleKeydown(event) {
    if (!countdownActive) return;
    noteObservedInput("key", event.code || event.key || "unknown");
    if (matchesVerifiedOptionsKey(event)) {
      event.preventDefault();
      cancelCountdown("AUTOLOAD-CANCELLED-OPTIONS", "Automatic launch cancelled by verified OPTIONS input.");
    }
  }

  function pollGamepads() {
    if (!countdownActive || !navigator.getGamepads) return;
    var pads = navigator.getGamepads();
    if (!pads) return;
    for (var i = 0; i < pads.length; i++) {
      var pad = pads[i];
      if (!pad || !pad.buttons) continue;
      for (var j = 0; j < pad.buttons.length; j++) {
        if (!pad.buttons[j].pressed) continue;
        noteObservedInput("button", String(j));
        if (matchesVerifiedOptionsButton(j)) {
          cancelCountdown("AUTOLOAD-CANCELLED-OPTIONS", "Automatic launch cancelled by verified OPTIONS button input.");
          return;
        }
      }
    }
  }

  function registerPreviousFailureIfNeeded() {
    if (!storage.available || !state.pendingLaunch || state.pendingLaunch.counted) return;
    var successMatches = state.lastSuccess && state.lastSuccess.attemptId && state.lastSuccess.attemptId === state.pendingLaunch.attemptId;
    if (successMatches) {
      clearPendingLaunch();
      persistState();
      return;
    }
    state.pendingLaunch.counted = true;
    storage.setJson(STORAGE_KEYS.autoloadPending, state.pendingLaunch);
    state.autoloadFailures += 1;
    storage.setNumber(STORAGE_KEYS.autoloadFailures, state.autoloadFailures);
    emit("AUTOLOAD-PREVIOUS-FAILED", "A previous automatic launch returned without a success acknowledgement.");
    emit("AUTOLOAD-FAILURE-COUNT", "Automatic launch failure count is now " + state.autoloadFailures + " of " + MAX_FAILURES + ".");
    if (state.autoloadFailures >= MAX_FAILURES) {
      state.disableAutoload = true;
      storage.setBoolean(STORAGE_KEYS.disableAutoload, true);
      emit("AUTOLOAD-DISABLED", "Automatic launch disabled after reaching the failure limit.");
    }
  }

  function launchRuntime(manual) {
    if (!state.launcherReady) return;
    setPill("launcher-state", "Launching", "status-warn");
    try {
      sessionStorage.setItem("ps4-webkit-next:last-launch", JSON.stringify({
        firmware: state.firmware,
        backend: state.backend,
        buildId: buildId(),
        cacheRevision: cacheRevision(),
        manual: manual,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {}
    location.href = RUNTIME_URL;
  }

  function beginAutomaticNavigation() {
    emit("AUTOLOAD-LAUNCH-BEGIN", "Automatic launch countdown completed.");
    if (!AUTOLOAD_NAVIGATION_ENABLED) {
      renderAutoloadState("Ready", "status-warn", "Recovery countdown completed. Automatic navigation is intentionally disabled in this safety build; use Run 12.00 Runtime for manual entry.", true);
      emit("AUTOLOAD-STATE", "Automatic navigation remains disabled in this safety build until a later review enables it.");
      return;
    }

    var attemptId = new Date().toISOString() + ":" + buildId();
    state.pendingLaunch = {
      attemptId: attemptId,
      timestamp: new Date().toISOString(),
      buildId: buildId(),
      cacheRevision: cacheRevision(),
      counted: false
    };
    state.lastAttempt = {
      attemptId: attemptId,
      timestamp: state.pendingLaunch.timestamp,
      buildId: buildId()
    };
    persistState();
    launchRuntime(false);
  }

  function runCountdownTick() {
    emit("AUTOLOAD-COUNTDOWN", "Automatic launch in " + countdownValue + " second(s).");
    renderAutoloadState("Enabled", "status-ready", "Launching NEXT in " + countdownValue + " second" + (countdownValue === 1 ? "" : "s") + ". Hold OPTIONS to cancel once hardware mapping is verified, or use Cancel Autoload now.", false);
    if (countdownValue === 0) {
      countdownActive = false;
      if (countdownTimer) {
        window.clearInterval(countdownTimer);
        countdownTimer = null;
      }
      if (gamepadPollTimer) {
        window.clearInterval(gamepadPollTimer);
        gamepadPollTimer = null;
      }
      beginAutomaticNavigation();
      return;
    }
    countdownValue -= 1;
  }

  function startCountdown() {
    if (!state.launcherReady || state.disableAutoload || !storage.available || state.holdAfterReenable) return;
    countdownActive = true;
    countdownCancelled = false;
    countdownValue = COUNTDOWN_SECONDS;
    emit("AUTOLOAD-COUNTDOWN-BEGIN", "Recovery countdown started for an eligible 12.00 launch path.");
    renderAutoloadState("Enabled", "status-ready", "Launching NEXT in " + COUNTDOWN_SECONDS + " seconds. Hold OPTIONS to cancel once hardware mapping is verified, or use Cancel Autoload now.", false);
    runCountdownTick();
    countdownTimer = window.setInterval(runCountdownTick, 1000);
    if (navigator.getGamepads) gamepadPollTimer = window.setInterval(pollGamepads, 200);
  }

  function renderAutoloadState(pillText, pillTone, message, countdownVisible) {
    setPill("autoload-state", pillText, pillTone);
    setText("autoload-failures", state.autoloadFailures + " / " + MAX_FAILURES);
    setText("autoload-message", message);
    setHidden("launch-now", !countdownVisible || !state.launcherReady);
    setHidden("cancel-autoload", !countdownVisible);
    setHidden("disable-autoload", !state.launcherReady || state.disableAutoload);
    setHidden("reenable-autoload", !state.disableAutoload);
  }

  function render() {
    var runButton = getElement("run-1200");
    if (runButton) runButton.disabled = !state.launcherReady;

    if (!state.isPS4 || !state.launcherReady) {
      renderAutoloadState("Not Available", "status-bad", "Automatic launch is not available for this browser context. Manual runtime launch only remains visible when the verified 12.00 path is detected.", false);
      emit("AUTOLOAD-STATE", "Automatic launch unavailable for the current browser context.");
      return;
    }

    if (!storage.available) {
      state.disableAutoload = true;
      renderAutoloadState("Storage Error", "status-bad", "Persistent storage is unavailable. Automatic launch stays disabled so the host cannot enter an uncontrolled loop. Manual launch remains available.", false);
      return;
    }

    if (state.autoloadFailures >= MAX_FAILURES && !state.disableAutoload) {
      state.disableAutoload = true;
      persistState();
      emit("AUTOLOAD-DISABLED", "Automatic launch disabled after reaching the failure limit.");
    }

    if (state.disableAutoload) {
      renderAutoloadState("Disabled", "status-bad", "NEXT disabled automatic launch for recovery. Manual launch remains available, and Re-enable Autoload clears the failure lockout without launching immediately.", false);
      return;
    }

    if (state.holdAfterReenable) {
      renderAutoloadState("Enabled", "status-warn", "Autoload has been re-enabled. Manual launch is available now; the automatic countdown will resume on the next eligible page load.", false);
      return;
    }

    renderAutoloadState("Enabled", "status-ready", "Recovery layer armed for the verified 12.00 path. A visible countdown will run before any future automatic navigation is allowed.", true);
  }

  function disableAutoload() {
    cancelCountdown("AUTOLOAD-CANCELLED-UI", "Automatic launch countdown cancelled from the launcher UI.");
    state.disableAutoload = true;
    persistState();
    emit("AUTOLOAD-DISABLED", "Automatic launch manually disabled from the launcher UI.");
    render();
  }

  function reenableAutoload() {
    state.disableAutoload = false;
    state.autoloadFailures = 0;
    state.pendingLaunch = null;
    state.lastAttempt = null;
    state.holdAfterReenable = true;
    storage.remove(STORAGE_KEYS.disableAutoload);
    storage.remove(STORAGE_KEYS.autoloadFailures);
    storage.remove(STORAGE_KEYS.autoloadPending);
    storage.remove(STORAGE_KEYS.lastAutoloadAttempt);
    emit("AUTOLOAD-REENABLED", "Automatic launch re-enabled from the launcher UI. Countdown is intentionally held until the next eligible page load.");
    render();
  }

  function bindControls() {
    var runButton = getElement("run-1200");
    var launchNowButton = getElement("launch-now");
    var cancelButton = getElement("cancel-autoload");
    var disableButton = getElement("disable-autoload");
    var reenableButton = getElement("reenable-autoload");

    if (runButton) {
      runButton.addEventListener("click", function () {
        if (!state.launcherReady) return;
        launchRuntime(true);
      });
    }
    if (launchNowButton) {
      launchNowButton.addEventListener("click", function () {
        if (!state.launcherReady) return;
        emit("AUTOLOAD-LAUNCH-NOW", "Manual immediate launch selected from the recovery countdown UI.");
        cancelCountdown("AUTOLOAD-CANCELLED-UI", "Countdown dismissed in favor of an immediate manual launch.");
        launchRuntime(true);
      });
    }
    if (cancelButton) {
      cancelButton.addEventListener("click", function () {
        cancelCountdown("AUTOLOAD-CANCELLED-UI", "Automatic launch cancelled from the on-screen recovery control.");
      });
    }
    if (disableButton) disableButton.addEventListener("click", disableAutoload);
    if (reenableButton) reenableButton.addEventListener("click", reenableAutoload);
    document.addEventListener("keydown", handleKeydown);
  }

  document.addEventListener("DOMContentLoaded", function () {
    detect();
    bindControls();
    loadPersistentState();
    registerPreviousFailureIfNeeded();
    render();
    emit("AUTOLOAD-STATE", "Autoload controller initialized. Build " + buildId() + ", cache revision " + cacheRevision() + ".");
    window.PS4AutoloadController = {
      storageKeys: STORAGE_KEYS,
      countdownSeconds: COUNTDOWN_SECONDS,
      navigationEnabled: AUTOLOAD_NAVIGATION_ENABLED,
      state: state,
      markSuccess: markSuccess
    };
    if (state.launcherReady && !state.disableAutoload && !state.holdAfterReenable && storage.available) {
      startCountdown();
    }
  });
})();