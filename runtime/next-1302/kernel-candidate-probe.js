import {
  createKernelCandidateProbe,
  detectPS4Firmware,
  DEVICE_NODE_ALLOWLIST
} from "./kernel-candidate-adapter.js";

const doc = document;
const consent = doc.getElementById("probe-consent");
const runButton = doc.getElementById("run-probe");
const downloadButton = doc.getElementById("download-report");
const firmwareField = doc.getElementById("probe-firmware");
const hardwareField = doc.getElementById("probe-hardware");
const consentField = doc.getElementById("probe-consent-state");
const resultField = doc.getElementById("probe-result");
const nodesField = doc.getElementById("probe-device-nodes");
const statusBox = doc.getElementById("probe-status");
const output = doc.getElementById("probe-output");

function queryValue(name) {
  const params = (location.search || "").replace(/^\?/, "").split("&");
  for (let index = 0; index < params.length; index += 1) {
    const pair = params[index].split("=");
    if (decodeURIComponent(pair[0] || "") === name) return decodeURIComponent((pair[1] || "").replace(/\+/g, " "));
  }
  return "";
}

const forcedFirmware = queryValue("fw").replace(/\s+/g, "");
const simulation = forcedFirmware === "13.02" && queryValue("research") === "1";
const detected = detectPS4Firmware(navigator.userAgent || "");
const firmwareState = simulation ? { firmware: "13.02", hardwareDetected: false, exact1302: false } : detected;
const buildId = window.PS4_WEBKIT_BUILD && window.PS4_WEBKIT_BUILD.buildId ? window.PS4_WEBKIT_BUILD.buildId : "Unknown";
let lastReport = null;

function diagnosticsEvent(entry) {
  if (!window.PS4Diag) return;
  const meta = { category: "RESEARCH", candidate: "Celsius / ffs_mountfs", diagnosticsOnly: true };
  if (entry.success && typeof window.PS4Diag.pass === "function") {
    window.PS4Diag.pass(entry.stage, entry.detail, meta);
  } else if (typeof window.PS4Diag.info === "function") {
    window.PS4Diag.info(entry.stage, entry.detail, meta);
  }
}

const probe = createKernelCandidateProbe({
  buildId,
  userAgent: navigator.userAgent || "",
  firmwareState,
  simulated: simulation,
  environment: { window, performance: window.performance },
  onEvent: diagnosticsEvent
});

function refreshGate() {
  const allowedFirmware = firmwareState.exact1302 || simulation;
  const granted = consent.checked === true;
  runButton.disabled = !(allowedFirmware && granted);
  consentField.textContent = granted ? "GRANTED" : "REQUIRED";
  if (!allowedFirmware) {
    statusBox.textContent = "Locked: this diagnostics-only probe requires exact PS4 13.02 hardware.";
    statusBox.className = "status bad";
  } else if (!granted) {
    statusBox.textContent = "Read the boundary statement and check consent to enable one read-only collection.";
    statusBox.className = "status warn";
  } else {
    statusBox.textContent = "Ready. The probe collects browser-visible signals only; kernel and device-node operations remain locked.";
    statusBox.className = "status ok";
  }
}

function initializeDiagnostics() {
  window.PS4Runtime = {
    firmware: firmwareState.firmware,
    firmwareRaw: firmwareState.firmware,
    firmwareNormalized: firmwareState.firmware,
    firmwareSource: simulation ? "query" : "user-agent",
    hardwareDetected: firmwareState.hardwareDetected,
    simulated: simulation,
    selectedBackend: "Diagnostics only",
    buildId,
    cacheRevision: window.PS4_WEBKIT_BUILD ? window.PS4_WEBKIT_BUILD.cacheRevision : buildId,
    pageName: "NEXT-1302-KERNEL-CANDIDATE-PROBE",
    relativePath: location.pathname || "./runtime/next-1302/kernel-candidate.html",
    researchMode: true,
    researchCandidate: "Celsius / ffs_mountfs",
    candidateStatus: "locked",
    isPS4: firmwareState.hardwareDetected,
    launcherReady: false,
    backendEntered: false,
    kernelRW: false,
    payloadId: "",
    payloadVersion: "Unknown"
  };
  if (window.PS4Diag) {
    window.PS4Diag.markPage("NEXT-1302-KERNEL-CANDIDATE-PROBE", location.pathname || "./runtime/next-1302/kernel-candidate.html");
    window.PS4Diag.markBackend({ selected: "Diagnostics only", entered: false, completed: false, failed: false });
  }
}

function downloadReport() {
  if (!lastReport) return;
  const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: "application/json" });
  const link = doc.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "next-1302-kernel-candidate-probe.json";
  link.click();
  setTimeout(function () { URL.revokeObjectURL(link.href); }, 0);
}

firmwareField.textContent = firmwareState.firmware;
hardwareField.textContent = simulation ? "SIMULATION" : firmwareState.exact1302 ? "EXACT 13.02" : "LOCKED";
nodesField.textContent = DEVICE_NODE_ALLOWLIST.length ? DEVICE_NODE_ALLOWLIST.join(", ") : "NONE CONFIGURED";
downloadButton.disabled = true;
initializeDiagnostics();
refreshGate();

consent.addEventListener("change", refreshGate);
runButton.addEventListener("click", function () {
  lastReport = probe.run({ consent: consent.checked });
  resultField.textContent = lastReport.result;
  output.textContent = JSON.stringify(lastReport, null, 2);
  downloadButton.disabled = false;
  statusBox.textContent = "Collection complete. No kernel action was attempted and no kernel conclusion was produced.";
  statusBox.className = "status ok";
});
downloadButton.addEventListener("click", downloadReport);

