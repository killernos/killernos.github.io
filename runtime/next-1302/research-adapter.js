const NOT_IMPLEMENTED = "NOT_IMPLEMENTED";
const ADAPTER_NAME = "NEXT1302ResearchAdapter";
const DEFAULT_RETRY_DELAY_MS = 250;
const CHECKPOINTS = Object.freeze({
  IDLE: "IDLE",
  ENTRY_STARTED: "ENTRY_STARTED",
  ENTRY_CONFIRMED: "ENTRY_CONFIRMED",
  USERLAND_ARW_CONFIRMED: "USERLAND_ARW_CONFIRMED",
  KERNEL_TRIGGER_STARTED: "KERNEL_TRIGGER_STARTED",
  KERNEL_TRIGGER_CONFIRMED: "KERNEL_TRIGGER_CONFIRMED",
  KERNEL_BASE_CONFIRMED: "KERNEL_BASE_CONFIRMED",
  KERNEL_READ_CONFIRMED: "KERNEL_READ_CONFIRMED",
  KERNEL_WRITE_CONFIRMED: "KERNEL_WRITE_CONFIRMED",
  UCRED_POINTER_CONFIRMED: "UCRED_POINTER_CONFIRMED",
  SCECAPS_FIELD_CONFIRMED: "SCECAPS_FIELD_CONFIRMED",
  HEN_PAYLOAD_STARTED: "HEN_PAYLOAD_STARTED",
  HEN_PAYLOAD_CONFIRMED: "HEN_PAYLOAD_CONFIRMED"
});

function isoNow() {
  return new Date().toISOString();
}

function text(value) {
  return value == null ? "" : String(value);
}

function currentFlags(explicitFlags) {
  if (explicitFlags) return explicitFlags;
  if (typeof window !== "undefined") {
    if (window.PS4_WEBKIT_FLAGS) return window.PS4_WEBKIT_FLAGS;
    if (window.PS4_WEBKIT_BUILD && window.PS4_WEBKIT_BUILD.flags) return window.PS4_WEBKIT_BUILD.flags;
  }
  return {};
}

export function is1302ExperimentalEnabled(explicitFlags) {
  var flags = currentFlags(explicitFlags);
  if (flags.ENABLE_1302_EXPERIMENTAL === true) return true;
  if (typeof globalThis !== "undefined" && globalThis.ENABLE_1302_EXPERIMENTAL === true) return true;
  return false;
}

export function normalizeAddressValue(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Math.floor(value) !== value) return NaN;
    return value;
  }
  if (typeof value === "bigint") {
    if (value < 0n || value > 0xffffffffffffn) return NaN;
    return Number(value);
  }
  if (typeof value === "string") {
    var clean = value.trim().toLowerCase();
    if (!clean) return NaN;
    if (/^0x[0-9a-f]+$/.test(clean)) {
      return normalizeAddressValue(BigInt(clean));
    }
    if (/^[0-9]+$/.test(clean)) {
      return normalizeAddressValue(Number(clean));
    }
  }
  if (value && typeof value === "object") {
    if (typeof value.low === "number") {
      var low = value.low >>> 0;
      var high = typeof value.hi === "number" ? value.hi >>> 0 : (typeof value.high === "number" ? value.high >>> 0 : 0);
      return high * 0x100000000 + low;
    }
  }
  return NaN;
}

export function isPlaceholderAddress(value) {
  var normalized = normalizeAddressValue(value);
  var hex;
  var lastPair;
  var index;
  if (!Number.isFinite(normalized) || normalized <= 0x100000000 || normalized > 0xffffffffffff) return true;
  if (normalized === 0 || normalized === 0x41414141 || normalized === 0xdeadbeef || normalized === 0xfeedface || normalized === 0x13371337) return true;
  hex = Math.floor(normalized).toString(16).padStart(12, "0");
  if (/^(?:00)+$/.test(hex) || /^(?:ff)+$/.test(hex)) return true;
  if (/^(41)+$/.test(hex) || /^(de)+(?:ad)+(?:be)+(?:ef)+$/.test(hex)) return true;
  lastPair = hex.slice(0, 2);
  for (index = 2; index < hex.length; index += 2) {
    if (hex.slice(index, index + 2) !== lastPair) {
      lastPair = "";
      break;
    }
  }
  return lastPair !== "";
}

export function assertVerifiedAddress(value, label) {
  var normalized = normalizeAddressValue(value);
  if (!Number.isFinite(normalized) || isPlaceholderAddress(normalized)) {
    throw new RangeError((label || "address") + " is not a verified canonical address");
  }
  return normalized;
}

export function create1302ResearchAdapter(options) {
  var opts = options || {};
  var primitiveFactory = opts.primitiveFactory;
  var installWindowP = opts.installWindowP;
  var hasWindowP = opts.hasWindowP;
  var verifyRead = opts.verifyRead;
  var verifyWrite = opts.verifyWrite;
  var diagnostics = opts.diagnostics || null;
  var scheduler = typeof opts.scheduler === "function" ? opts.scheduler : setTimeout;
  var cancelScheduler = typeof opts.cancelScheduler === "function" ? opts.cancelScheduler : clearTimeout;
  var abortPrimitive = typeof opts.abortPrimitive === "function" ? opts.abortPrimitive : function () { return { aborted: false }; };
  var releaseTemporaryAllocations = typeof opts.releaseTemporaryAllocations === "function" ? opts.releaseTemporaryAllocations : function () { return null; };
  var featureFlags = currentFlags(opts.featureFlags);
  var managedListeners = [];
  var retryTimer = null;
  var entryAttempts = 0;
  var stopped = false;
  var currentCarrier = null;
  var currentPrimitive = null;
  var startedAt = Date.now();
  var pendingEntryResolver = null;
  var snapshot = {
    adapterName: ADAPTER_NAME,
    firmware: text(opts.firmware || "13.02") || "13.02",
    entryMethod: text(opts.entryMethod || "SlopKit") || "SlopKit",
    currentCheckpoint: CHECKPOINTS.IDLE,
    lastVerifiedPrimitive: "NONE",
    verificationEvidence: "",
    failureReason: "",
    exceptionName: "",
    exceptionMessage: "",
    elapsedMilliseconds: 0,
    sessionId: text(opts.sessionId || ""),
    reportSubmissionStatus: "IDLE",
    experimentalEnabled: is1302ExperimentalEnabled(featureFlags),
    stopRequested: false,
    payloadLaunchPrevented: true,
    retriesPending: 0,
    updatedAt: isoNow()
  };

  function updateSnapshot(partial) {
    var key;
    for (key in partial) {
      if (Object.prototype.hasOwnProperty.call(partial, key)) snapshot[key] = partial[key];
    }
    snapshot.elapsedMilliseconds = Math.max(0, Date.now() - startedAt);
    snapshot.updatedAt = isoNow();
    if (typeof opts.onSnapshot === "function") opts.onSnapshot(snapshot);
  }

  function emit(stageName, detail, extra) {
    var payload = extra || {};
    updateSnapshot({
      currentCheckpoint: stageName || snapshot.currentCheckpoint,
      lastVerifiedPrimitive: payload.verifiedPrimitive || snapshot.lastVerifiedPrimitive,
      verificationEvidence: payload.verificationMethod || snapshot.verificationEvidence,
      failureReason: payload.failureReason || snapshot.failureReason,
      exceptionName: payload.exceptionName || snapshot.exceptionName,
      exceptionMessage: payload.exceptionMessage || snapshot.exceptionMessage,
      sessionId: payload.sessionId || snapshot.sessionId
    });
    if (diagnostics && typeof diagnostics.emit === "function") {
      diagnostics.emit(stageName, detail, {
        checkpoint: stageName,
        verifiedPrimitive: snapshot.lastVerifiedPrimitive,
        verificationMethod: snapshot.verificationEvidence,
        failureReason: snapshot.failureReason,
        exceptionName: snapshot.exceptionName,
        exceptionMessage: snapshot.exceptionMessage,
        elapsedMilliseconds: snapshot.elapsedMilliseconds,
        sessionId: snapshot.sessionId,
        researchAdapter: ADAPTER_NAME,
        timestamp: snapshot.updatedAt,
        entryMethod: snapshot.entryMethod,
        experimentalEnabled: snapshot.experimentalEnabled,
        payloadLaunchPrevented: snapshot.payloadLaunchPrevented,
        detail: text(detail),
        attempt: payload.attempt,
        success: payload.success === true
      });
    }
  }

  function setFailure(reason, error) {
    updateSnapshot({
      failureReason: text(reason) || snapshot.failureReason,
      exceptionName: error && error.name ? String(error.name) : "",
      exceptionMessage: error && error.message ? String(error.message) : ""
    });
  }

  function addManagedListener(target, type, handler, listenerOptions) {
    if (!target || typeof target.addEventListener !== "function") return;
    target.addEventListener(type, handler, listenerOptions || false);
    managedListeners.push({ target: target, type: type, handler: handler, options: listenerOptions || false });
  }

  function removeManagedListeners() {
    while (managedListeners.length) {
      var entry = managedListeners.pop();
      try {
        entry.target.removeEventListener(entry.type, entry.handler, entry.options);
      } catch (error) { }
    }
  }

  function clearRetryTimer() {
    if (retryTimer !== null) {
      cancelScheduler(retryTimer);
      retryTimer = null;
    }
    updateSnapshot({ retriesPending: 0 });
  }

  function resolvePendingAbort() {
    if (pendingEntryResolver) {
      var resolver = pendingEntryResolver;
      pendingEntryResolver = null;
      resolver({ ok: false, status: "ABORTED", failureReason: snapshot.failureReason || "stop-requested" });
    }
  }

  function notImplemented(operation, checkpoint) {
    if (checkpoint) {
      emit(checkpoint, operation + " requested but remains unavailable on 13.02 research.", {
        failureReason: NOT_IMPLEMENTED,
        success: false
      });
    }
    updateSnapshot({ payloadLaunchPrevented: true });
    return Promise.resolve({ ok: false, status: NOT_IMPLEMENTED, operation: operation, checkpoint: snapshot.currentCheckpoint });
  }

  function confirm(stageName, detail, extra) {
    emit(stageName, detail, extra || {});
    return { ok: true, status: "CONFIRMED", checkpoint: stageName, detail: text(detail) };
  }

  async function finalizeEntry(carrier) {
    var primitive;
    if (!carrier || typeof installWindowP !== "function") {
      setFailure("carrier-not-usable");
      return { ok: false, status: "FAILED", failureReason: snapshot.failureReason };
    }
    installWindowP(carrier, { promote: false });
    primitive = typeof window !== "undefined" ? window.p : null;
    if (!hasWindowP || !hasWindowP(primitive) || !carrier.assertHome || !carrier.assertHome()) {
      setFailure("entry-integrity-check-failed");
      return { ok: false, status: "FAILED", failureReason: snapshot.failureReason };
    }
    currentCarrier = carrier;
    currentPrimitive = primitive;
    return confirm(CHECKPOINTS.ENTRY_CONFIRMED, "Carrier returned and window.p integrity checks passed.", {
      verifiedPrimitive: "ENTRY",
      verificationMethod: "carrier-returned-and-window-p-methods-validated",
      success: true
    });
  }

  function scheduleRetry(runAttempt, error) {
    clearRetryTimer();
    if (stopped || snapshot.stopRequested) {
      setFailure("stop-requested", error || null);
      return;
    }
    retryTimer = scheduler(function () {
      retryTimer = null;
      updateSnapshot({ retriesPending: 0 });
      runAttempt();
    }, typeof opts.retryDelayMs === "number" ? opts.retryDelayMs : DEFAULT_RETRY_DELAY_MS);
    updateSnapshot({ retriesPending: 1 });
  }

  return {
    name: ADAPTER_NAME,
    NOT_IMPLEMENTED: NOT_IMPLEMENTED,
    checkpoints: CHECKPOINTS,
    getSnapshot: function () { return Object.assign({}, snapshot); },
    setReportSubmissionStatus: function (value) {
      updateSnapshot({ reportSubmissionStatus: text(value) || "IDLE" });
    },
    initialize: function () {
      startedAt = Date.now();
      stopped = false;
      clearRetryTimer();
      updateSnapshot({
        currentCheckpoint: CHECKPOINTS.IDLE,
        failureReason: "",
        exceptionName: "",
        exceptionMessage: "",
        payloadLaunchPrevented: true,
        experimentalEnabled: is1302ExperimentalEnabled(featureFlags)
      });
      if (typeof opts.onInitialize === "function") opts.onInitialize(snapshot);
      if (!snapshot.experimentalEnabled) {
        setFailure("experimental-runtime-disabled");
        return { ok: false, status: "DISABLED", failureReason: snapshot.failureReason };
      }
      if (opts.lifecycleTarget && typeof opts.onLifecycleEvent === "function") {
        addManagedListener(opts.lifecycleTarget, "beforeunload", opts.onLifecycleEvent);
      }
      return { ok: true, status: "READY" };
    },
    runUserlandEntry: function () {
      return new Promise(function (resolve) {
        pendingEntryResolver = resolve;
        function runAttempt() {
          entryAttempts += 1;
          emit(CHECKPOINTS.ENTRY_STARTED, "Starting 13.02 userland entry attempt.", {
            verificationMethod: "awaiting-integrity-check",
            attempt: entryAttempts,
            success: false
          });
          if (!snapshot.experimentalEnabled) {
            setFailure("experimental-runtime-disabled");
            pendingEntryResolver = null;
            resolve({ ok: false, status: "DISABLED", failureReason: snapshot.failureReason });
            return;
          }
          if (stopped || snapshot.stopRequested) {
            setFailure("stop-requested");
            pendingEntryResolver = null;
            resolve({ ok: false, status: "ABORTED", failureReason: snapshot.failureReason });
            return;
          }
          Promise.resolve()
            .then(function () {
              return primitiveFactory({
                maxAttempts: 6,
                onEvent: opts.onPrimitiveEvent
              });
            })
            .then(function (carrier) {
              return finalizeEntry(carrier);
            })
            .then(function (result) {
              if (result && result.ok) {
                pendingEntryResolver = null;
                resolve(result);
              }
              else if (entryAttempts <= (typeof opts.maxAdapterRetries === "number" ? opts.maxAdapterRetries : 1) && !snapshot.stopRequested) {
                scheduleRetry(runAttempt, null);
              } else {
                pendingEntryResolver = null;
                resolve(result || { ok: false, status: "FAILED", failureReason: snapshot.failureReason });
              }
            })
            .catch(function (error) {
              setFailure("entry-threw", error);
              if (entryAttempts <= (typeof opts.maxAdapterRetries === "number" ? opts.maxAdapterRetries : 1) && !snapshot.stopRequested) {
                scheduleRetry(runAttempt, error);
                return;
              }
              pendingEntryResolver = null;
              resolve({ ok: false, status: "FAILED", failureReason: snapshot.failureReason, error: error });
            });
        }
        runAttempt();
      });
    },
    verifyUserlandReadWrite: function () {
      var readOk;
      var writeOk;
      if (!currentCarrier || !currentPrimitive) {
        setFailure("entry-not-confirmed");
        return Promise.resolve({ ok: false, status: "FAILED", failureReason: snapshot.failureReason });
      }
      readOk = typeof verifyRead === "function" ? !!verifyRead(currentCarrier, currentPrimitive) : false;
      if (!readOk) {
        setFailure("userland-readback-failed");
        return Promise.resolve({ ok: false, status: "FAILED", failureReason: snapshot.failureReason });
      }
      writeOk = typeof verifyWrite === "function" ? !!verifyWrite(currentCarrier, currentPrimitive) : false;
      if (!writeOk) {
        setFailure("userland-write-readback-failed");
        return Promise.resolve({ ok: false, status: "FAILED", failureReason: snapshot.failureReason });
      }
      return Promise.resolve(confirm(CHECKPOINTS.USERLAND_ARW_CONFIRMED, "Read-back and restored write verification passed.", {
        verifiedPrimitive: "USERLAND_ARW",
        verificationMethod: "owned-carrier-readback-and-restored-write",
        success: true
      }));
    },
    runKernelTrigger: function () {
      return notImplemented("runKernelTrigger", CHECKPOINTS.KERNEL_TRIGGER_STARTED);
    },
    verifyKernelRead: function () {
      return notImplemented("verifyKernelRead");
    },
    verifyKernelWrite: function () {
      return notImplemented("verifyKernelWrite");
    },
    locateUcred: function () {
      return notImplemented("locateUcred");
    },
    verifySceCaps: function () {
      return notImplemented("verifySceCaps");
    },
    launchHen: function () {
      updateSnapshot({ payloadLaunchPrevented: true });
      return notImplemented("launchHen");
    },
    abort: function () {
      stopped = true;
      setFailure("stop-requested");
      updateSnapshot({ stopRequested: true, payloadLaunchPrevented: true, currentCheckpoint: CHECKPOINTS.IDLE });
      clearRetryTimer();
      removeManagedListeners();
      try {
        abortPrimitive();
      } catch (error) {
        setFailure("abort-threw", error);
      }
      try {
        releaseTemporaryAllocations();
      } catch (error) {
        setFailure("cleanup-threw", error);
      }
      currentCarrier = null;
      currentPrimitive = null;
      resolvePendingAbort();
      return { ok: true, status: "ABORTED", checkpoint: snapshot.currentCheckpoint };
    },
    cleanup: function () {
      clearRetryTimer();
      removeManagedListeners();
      currentCarrier = null;
      currentPrimitive = null;
      try {
        releaseTemporaryAllocations();
      } catch (error) {
        setFailure("cleanup-threw", error);
      }
      updateSnapshot({ currentCheckpoint: CHECKPOINTS.IDLE, payloadLaunchPrevented: true });
      return { ok: true, status: "CLEAN" };
    }
  };
}

export { ADAPTER_NAME, CHECKPOINTS, NOT_IMPLEMENTED };