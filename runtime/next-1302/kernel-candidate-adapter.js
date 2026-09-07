const REPORT_SCHEMA = "next-1302-kernel-candidate-probe-1";
const PAGE_NAME = "NEXT-1302-KERNEL-CANDIDATE-PROBE";
const CANDIDATE_NAME = "Celsius / ffs_mountfs";
const EVENT_LIMIT = 500;

// Intentionally empty until a device node and a harmless read-only query are
// independently verified for 13.02. The probe never enumerates the filesystem.
export const DEVICE_NODE_ALLOWLIST = Object.freeze([]);

export const READ_ONLY_SIGNAL_ALLOWLIST = Object.freeze([
  "secure-context",
  "cross-origin-isolated",
  "shared-array-buffer",
  "atomics",
  "bigint",
  "webassembly",
  "worker",
  "performance-timer"
]);

function text(value) {
  return value == null ? "" : String(value);
}

function isoNow(clock) {
  return new Date(clock()).toISOString();
}

export function detectPS4Firmware(userAgent) {
  const match = /PlayStation\s+4[\/ ](\d+)\.(\d+)/.exec(text(userAgent));
  if (!match) return { firmware: "Unknown", hardwareDetected: false, exact1302: false };
  const minorValue = parseInt(match[2], 16);
  let minor = minorValue.toString(16);
  if (minor.length < 2) minor = "0" + minor;
  const firmware = match[1] + "." + minor;
  return { firmware, hardwareDetected: true, exact1302: firmware === "13.02" };
}

function signal(id, available, detail) {
  return {
    id,
    status: available ? "AVAILABLE" : "UNAVAILABLE",
    detail: text(detail)
  };
}

export function collectReadOnlySignals(environment) {
  const env = environment || {};
  const win = env.window || {};
  const perf = env.performance || win.performance || null;
  return [
    signal("secure-context", win.isSecureContext === true, win.isSecureContext === true ? "true" : "false-or-not-exposed"),
    signal("cross-origin-isolated", win.crossOriginIsolated === true, win.crossOriginIsolated === true ? "true" : "false-or-not-exposed"),
    signal("shared-array-buffer", typeof win.SharedArrayBuffer === "function", typeof win.SharedArrayBuffer),
    signal("atomics", typeof win.Atomics === "object", typeof win.Atomics),
    signal("bigint", typeof win.BigInt === "function", typeof win.BigInt),
    signal("webassembly", typeof win.WebAssembly === "object", typeof win.WebAssembly),
    signal("worker", typeof win.Worker === "function", typeof win.Worker),
    signal("performance-timer", !!(perf && typeof perf.now === "function"), perf && typeof perf.now === "function" ? "available" : "not-exposed")
  ];
}

export function createKernelCandidateProbe(options) {
  const opts = options || {};
  const clock = typeof opts.clock === "function" ? opts.clock : Date.now;
  const userAgent = text(opts.userAgent);
  const firmwareState = opts.firmwareState || detectPS4Firmware(userAgent);
  const simulated = opts.simulated === true;
  const buildId = text(opts.buildId) || "Unknown";
  const environment = opts.environment || {};
  const onEvent = typeof opts.onEvent === "function" ? opts.onEvent : function () {};
  const events = [];

  function emit(stage, detail, extra) {
    const entry = {
      at: isoNow(clock),
      stage: text(stage),
      detail: text(detail),
      success: !!(extra && extra.success)
    };
    events.push(entry);
    if (events.length > EVENT_LIMIT) events.shift();
    onEvent(entry);
    return entry;
  }

  function reportBase() {
    return {
      schema: REPORT_SCHEMA,
      page: PAGE_NAME,
      buildId,
      firmware: firmwareState.firmware,
      hardwareDetected: !!firmwareState.hardwareDetected,
      simulation: simulated,
      candidate: CANDIDATE_NAME,
      consentGranted: false,
      mode: "diagnostics-only",
      deviceNodePolicy: {
        mode: "fixed-allowlist",
        allowlist: DEVICE_NODE_ALLOWLIST.slice(),
        filesystemEnumeration: false,
        deviceNodeProbingAttempted: false,
        status: DEVICE_NODE_ALLOWLIST.length ? "CONFIGURED_NOT_RUN" : "NO_APPROVED_NODES_CONFIGURED"
      },
      prohibitedActions: {
        slopkitImport: true,
        kernelTrigger: true,
        kernelRead: true,
        kernelWrite: true,
        offsetGuessing: true,
        filesystemEnumeration: true,
        payloadLaunch: true,
        henLaunch: true,
        networkSubmission: true
      },
      signals: [],
      result: "NOT_RUN",
      conclusion: "No kernel claim can be made from this probe.",
      events: events.slice()
    };
  }

  function run(runOptions) {
    const consent = !!(runOptions && runOptions.consent === true);
    const report = reportBase();
    if (!consent) {
      emit("NEXT-1302-KERNEL-CANDIDATE-PROBE-BLOCKED", "Explicit consent was not granted.");
      report.result = "BLOCKED_NO_CONSENT";
      report.events = events.slice();
      return report;
    }
    report.consentGranted = true;
    if (!firmwareState.exact1302 && !simulated) {
      emit("NEXT-1302-KERNEL-CANDIDATE-PROBE-BLOCKED", "Exact PS4 13.02 hardware is required.");
      report.result = "BLOCKED_WRONG_FIRMWARE";
      report.events = events.slice();
      return report;
    }

    emit("NEXT-1302-KERNEL-CANDIDATE-PROBE-STARTED", "Collecting fixed read-only browser signals.");
    report.signals = collectReadOnlySignals(environment);
    report.signals.forEach(function (item) {
      emit("NEXT-1302-KERNEL-CANDIDATE-SIGNAL", item.id + "=" + item.status, { success: true });
    });
    emit("NEXT-1302-KERNEL-CANDIDATE-PROBE-COMPLETED", "Diagnostics collection completed; kernel path remained locked.", { success: true });
    report.result = simulated ? "SIMULATION_COMPLETE" : "READ_ONLY_SIGNALS_COLLECTED";
    report.events = events.slice();
    return report;
  }

  return {
    run,
    getPolicy: reportBase,
    getEvents: function () { return events.slice(); }
  };
}

