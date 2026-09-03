export const BUILD_ID = "1302-next-slopkit-probe-0003";
export const BACKEND_NAME = "NEXT 13.02 Research";
export const CANDIDATE_NAME = "SlopKit Userland";
export const KERNEL_CANDIDATE_NAME = "Celsius / ffs_mountfs";

const SUCCESS_STAGE_NAMES = {
  "NEXT-1302-HARDWARE-CONFIRMED": true,
  "SLOPKIT-CARRIER-OBTAINED": true,
  "SLOPKIT-WINDOW-P-INSTALLED": true,
  "SLOPKIT-READ-VERIFIED": true,
  "SLOPKIT-WRITE-VERIFIED": true,
  "USERLAND-ARW-VERIFIED": true
};

function isoNow() {
  return new Date().toISOString();
}

function text(value) {
  return value == null || value === "" ? "" : String(value);
}

export function createResearchState(doc) {
  const fields = {
    firmware: doc.getElementById("field-firmware"),
    entrypoint: doc.getElementById("field-entrypoint"),
    primitive: doc.getElementById("field-primitive"),
    carrier: doc.getElementById("field-carrier"),
    windowP: doc.getElementById("field-window-p"),
    userlandRead: doc.getElementById("field-userland-read"),
    userlandWrite: doc.getElementById("field-userland-write"),
    userlandARW: doc.getElementById("field-userland-arw"),
    nativeSyscall: doc.getElementById("field-native-syscall"),
    celsius: doc.getElementById("field-celsius"),
    kernelRead: doc.getElementById("field-kernel-read"),
    kernelWrite: doc.getElementById("field-kernel-write"),
    kernelExecution: doc.getElementById("field-kernel-execution"),
    goldhen: doc.getElementById("field-goldhen")
  };

  const statusCopy = doc.getElementById("status-copy");
  const successCopy = doc.getElementById("success-copy");
  const lastStage = doc.getElementById("last-stage");
  const lastSuccessfulStage = doc.getElementById("last-successful-stage");
  const slopkitAttempt = doc.getElementById("slopkit-attempt");
  const eventLog = doc.getElementById("event-log");
  const simulationBanner = doc.getElementById("simulation-banner");
  const buildId = doc.getElementById("build-id");
  const backendName = doc.getElementById("backend-name");
  const candidateName = doc.getElementById("candidate-name");

  const snapshot = {
    buildId: BUILD_ID,
    backend: BACKEND_NAME,
    candidate: CANDIDATE_NAME,
    kernelCandidate: KERNEL_CANDIDATE_NAME,
    firmware: "13.02",
    hardware: "UNKNOWN",
    simulation: false,
    running: false,
    stopRequested: false,
    lastStage: "Not reported",
    lastSuccessfulStage: "Not reported",
    slopkitAttempt: 0,
    carrierObtained: false,
    windowPInstalled: false,
    readVerified: false,
    writeVerified: false,
    userlandARWVerified: false,
    henFamily: "none",
    selectedHen: "No HEN",
    henIdentifier: "none",
    henVersion: null,
    henPayloadPath: null,
    henEvidence: "source-confirmed",
    henLoadRequested: false,
    henLoadAttempted: false,
    henLoadStatus: "LOCKED",
    henLoadError: "",
    jsError: "",
    unexpectedTermination: "",
    testerOutcome: "",
    testerNotes: "",
    events: []
  };

  if (buildId) buildId.textContent = BUILD_ID;
  if (backendName) backendName.textContent = BACKEND_NAME;
  if (candidateName) candidateName.textContent = CANDIDATE_NAME;

  function setField(name, value) {
    if (fields[name]) fields[name].textContent = text(value);
  }

  function setStatus(message, kind) {
    statusCopy.textContent = text(message);
    statusCopy.className = "status-copy" + (kind === "bad" ? " bad" : kind === "ok" ? " ok" : "");
  }

  function appendEvent(stage, detail, extra) {
    const entry = {
      at: isoNow(),
      stage: text(stage),
      detail: text(detail),
      attempt: extra && extra.attempt != null ? extra.attempt : null,
      success: !!(extra && extra.success)
    };
    snapshot.events.push(entry);
    if (snapshot.events.length > 300) snapshot.events.shift();
    snapshot.lastStage = entry.stage || snapshot.lastStage;
    if (entry.attempt != null) snapshot.slopkitAttempt = entry.attempt;
    if (entry.success || SUCCESS_STAGE_NAMES[entry.stage]) {
      snapshot.lastSuccessfulStage = entry.stage || snapshot.lastSuccessfulStage;
    }
    lastStage.textContent = snapshot.lastStage;
    lastSuccessfulStage.textContent = snapshot.lastSuccessfulStage;
    slopkitAttempt.textContent = String(snapshot.slopkitAttempt || 0);
    eventLog.textContent = snapshot.events.map(function (item) {
      return item.at + " " + item.stage + (item.attempt != null ? " [" + item.attempt + "]" : "") + (item.detail ? " :: " + item.detail : "");
    }).join("\n");
  }

  return {
    snapshot,
    setSimulation(enabled) {
      snapshot.simulation = !!enabled;
      snapshot.hardware = enabled ? "simulation" : snapshot.hardware;
      if (simulationBanner) simulationBanner.hidden = !enabled;
    },
    setHardware(value) {
      snapshot.hardware = text(value);
    },
    setFirmware(value) {
      snapshot.firmware = text(value) || snapshot.firmware;
      setField("firmware", snapshot.firmware);
    },
    setRunning(value) {
      snapshot.running = !!value;
    },
    requestStop() {
      snapshot.stopRequested = true;
    },
    clearStopRequest() {
      snapshot.stopRequested = false;
    },
    setStatus,
    appendEvent,
    setPrimitive(value) {
      setField("primitive", value);
    },
    setCarrier(value, obtained) {
      snapshot.carrierObtained = !!obtained;
      setField("carrier", value);
    },
    setWindowP(value, installed) {
      snapshot.windowPInstalled = !!installed;
      setField("windowP", value);
    },
    setRead(value, verified) {
      snapshot.readVerified = !!verified;
      setField("userlandRead", value);
    },
    setWrite(value, verified) {
      snapshot.writeVerified = !!verified;
      setField("userlandWrite", value);
    },
    setARW(value, verified) {
      snapshot.userlandARWVerified = !!verified;
      setField("userlandARW", value);
      if (verified) successCopy.hidden = false;
    },
    setHen(family, displayName, identifier, version, payloadPath, evidence, requested, attempted, status, error) {
      snapshot.henFamily = text(family) || "none";
      snapshot.selectedHen = text(displayName) || "No HEN";
      snapshot.henIdentifier = text(identifier) || "none";
      snapshot.henVersion = version == null || version === "" ? null : String(version);
      snapshot.henPayloadPath = payloadPath == null || payloadPath === "" ? null : String(payloadPath);
      snapshot.henEvidence = text(evidence) || "source-confirmed";
      snapshot.henLoadRequested = !!requested;
      snapshot.henLoadAttempted = !!attempted;
      snapshot.henLoadStatus = text(status) || "LOCKED";
      snapshot.henLoadError = text(error);
    },
    setJsError(value) {
      snapshot.jsError = text(value);
    },
    setUnexpectedTermination(value) {
      snapshot.unexpectedTermination = text(value);
    },
    downloadReport() {
      const report = {
        firmware: snapshot.firmware,
        hardware: snapshot.hardware,
        simulation: snapshot.simulation,
        buildId: snapshot.buildId,
        page: "NEXT-1302-RESEARCH",
        backend: snapshot.backend,
        candidate: snapshot.candidate,
        kernelCandidate: snapshot.kernelCandidate,
        slopkitAttempt: snapshot.slopkitAttempt,
        slopkitStage: snapshot.lastStage,
        lastSuccessfulStage: snapshot.lastSuccessfulStage,
        carrierObtained: snapshot.carrierObtained,
        windowPInstalled: snapshot.windowPInstalled,
        readVerified: snapshot.readVerified,
        writeVerified: snapshot.writeVerified,
        userlandARWVerified: snapshot.userlandARWVerified,
        henFamily: snapshot.henFamily,
        selectedHen: snapshot.selectedHen,
        henIdentifier: snapshot.henIdentifier,
        henVersion: snapshot.henVersion,
        henPayloadPath: snapshot.henPayloadPath,
        henEvidence: snapshot.henEvidence,
        henLoadRequested: snapshot.henLoadRequested,
        henLoadAttempted: snapshot.henLoadAttempted,
        henLoadStatus: snapshot.henLoadStatus,
        henLoadError: snapshot.henLoadError,
        jsError: snapshot.jsError,
        unexpectedTermination: snapshot.unexpectedTermination,
        testerOutcome: snapshot.testerOutcome,
        testerNotes: snapshot.testerNotes,
        events: snapshot.events.slice()
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const link = doc.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "next-1302-slopkit-report.json";
      link.click();
      setTimeout(function () {
        URL.revokeObjectURL(link.href);
      }, 0);
    }
  };
}