import { establishPrimitive } from "./slopkit/core.js";
import { installWindowP } from "./slopkit/mem.js";
import { BUILD_ID, createResearchState } from "./research-state.js";
import { createDiagnosticsBridge } from "./diagnostics-bridge.js";

function parseQuery(name) {
  const pairs = (location.search || "").replace(/^\?/, "").split("&");
  for (let index = 0; index < pairs.length; index += 1) {
    const pair = pairs[index].split("=");
    if (decodeURIComponent(pair[0] || "") === name) {
      return decodeURIComponent((pair[1] || "").replace(/\+/g, " "));
    }
  }
  return "";
}

function detectRuntimeContext() {
  const match = /PlayStation\s+4[\/ ](\d+)\.(\d+)/.exec(navigator.userAgent || "");
  const forcedFirmware = (parseQuery("fw") || "").replace(/\s+/g, "").trim();
  const researchMode = parseQuery("research") === "1";
  const simulated = forcedFirmware === "13.02" && researchMode;

  if (match) {
    const minorValue = parseInt(match[2], 16);
    let minor = minorValue.toString(16);
    if (minor.length < 2) minor = "0" + minor;
    const firmware = match[1] + "." + minor;
    return {
      firmware,
      hardwareDetected: true,
      exact1302: firmware === "13.02",
      simulated: false,
      researchMode
    };
  }

  return {
    firmware: simulated ? "13.02" : "Unknown",
    hardwareDetected: false,
    exact1302: false,
    simulated,
    researchMode
  };
}

function hasWindowP(prim) {
  return !!(prim
    && typeof prim.read1 === "function"
    && typeof prim.read2 === "function"
    && typeof prim.read4 === "function"
    && typeof prim.read8 === "function"
    && typeof prim.write1 === "function"
    && typeof prim.write2 === "function"
    && typeof prim.write4 === "function"
    && typeof prim.write8 === "function"
    && typeof prim.leakval === "function");
}

function readVerified(carrier, prim) {
  if (!carrier || !prim || typeof prim.read1 !== "function") return false;
  try {
    return !!carrier.assertHome() && typeof prim.read1(carrier.hostAddress) === "number";
  } catch (error) {
    return false;
  }
}

function writeVerified(carrier) {
  if (!carrier || typeof carrier.aim !== "function" || !carrier.view) return false;
  try {
    carrier.aim(carrier.hostAddress);
    const original = carrier.view[0];
    const mutated = original ^ 1;
    carrier.view[0] = mutated;
    const wrote = carrier.view[0] === mutated;
    carrier.view[0] = original;
    const restored = carrier.view[0] === original;
    carrier.restore();
    return !!carrier.assertHome() && wrote && restored;
  } catch (error) {
    try {
      carrier.restore();
    } catch (restoreError) { }
    return false;
  }
}

const doc = document;
const state = createResearchState(doc);
const diagnostics = createDiagnosticsBridge(state);
const runButton = doc.getElementById("run-test");
const stopButton = doc.getElementById("stop-test");
const downloadButton = doc.getElementById("download-report");
const context = detectRuntimeContext();

state.setFirmware(context.firmware === "Unknown" ? "13.02" : context.firmware);
state.setSimulation(context.simulated);
state.setHardware(context.simulated ? "simulation" : context.exact1302 ? "hardware" : "not-13.02");
state.setHen("none", "No HEN", "none", null, null, "source-confirmed", false, false, "LOCKED", "HEN loading is locked during the 13.02 userland research test.");
state.setStatus(context.simulated
  ? "Simulation mode is enabled for page and diagnostics testing only."
  : "Awaiting manual start.");
diagnostics.init();

if (window.PS4Diag && typeof window.PS4Diag.markHen === "function") {
  window.PS4Diag.markHen({
    family: "none",
    selection: "none",
    displayName: "No HEN",
    identifier: "none",
    version: null,
    payloadPath: null,
    loaderReference: "skip",
    evidence: "source-confirmed",
    compatibility: "LOCKED",
    requested: false,
    attempted: false,
    status: "LOCKED",
    error: "HEN loading is locked during the 13.02 userland research test."
  });
}

window.addEventListener("error", function (event) {
  state.setJsError(event && event.message ? event.message : "JavaScript error");
});

window.addEventListener("beforeunload", function () {
  if (state.snapshot.running) {
    state.setUnexpectedTermination("page-unloaded-while-running");
    diagnostics.markCompleted(false);
  }
});

async function runProbe() {
  let carrier;
  let prim;

  state.clearStopRequest();
  state.setRunning(true);
  state.setStatus("Starting isolated SlopKit userland probe.");
  state.setPrimitive("NOT TESTED");
  state.setCarrier("NOT OBTAINED", false);
  state.setWindowP("NOT INSTALLED", false);
  state.setRead("NOT VERIFIED", false);
  state.setWrite("NOT VERIFIED", false);
  state.setARW("NOT VERIFIED", false);
  diagnostics.markRunning();
  diagnostics.emit("NEXT-1302-BOOT", "build=" + BUILD_ID);

  if (context.simulated) {
    state.setStatus("Simulation mode does not execute SlopKit. UI and diagnostics only.", "bad");
    diagnostics.emit("SLOPKIT-FAIL", "simulation-only-page-ui-test");
    state.setRunning(false);
    diagnostics.markCompleted(false);
    return;
  }

  if (!context.exact1302) {
    state.setStatus("This page only accepts exact PS4 13.02 hardware.", "bad");
    diagnostics.emit("SLOPKIT-FAIL", "requires-exact-ps4-13.02-hardware");
    state.setRunning(false);
    diagnostics.markCompleted(false);
    return;
  }

  diagnostics.emit("NEXT-1302-HARDWARE-CONFIRMED", navigator.userAgent);
  diagnostics.emit("SLOPKIT-BEGIN", "maxAttempts=6");
  state.setPrimitive("RUNNING");

  try {
    carrier = await establishPrimitive({
      maxAttempts: 6,
      onEvent: function (tag, detail, attempt) {
        diagnostics.emit(tag, detail, { attempt: attempt });
      }
    });
  } catch (error) {
    state.setPrimitive("FAILED");
    state.setStatus("SlopKit did not obtain a carrier.", "bad");
    diagnostics.emit("SLOPKIT-FAIL", error && error.message ? error.message : "establishPrimitive-threw");
    state.setRunning(false);
    diagnostics.markCompleted(false);
    return;
  }

  if (state.snapshot.stopRequested) {
    state.setStatus("Stop requested. Probe halted before validation.", "bad");
    state.setRunning(false);
    diagnostics.markCompleted(false);
    return;
  }

  if (!carrier) {
    state.setPrimitive("FAILED");
    state.setStatus("SlopKit returned without a carrier.", "bad");
    diagnostics.emit("SLOPKIT-FAIL", "carrier-not-returned");
    state.setRunning(false);
    diagnostics.markCompleted(false);
    return;
  }

  state.setPrimitive("OBTAINED");
  state.setCarrier("OBTAINED", true);
  diagnostics.emit("SLOPKIT-CARRIER-OBTAINED", "carrier-returned");

  try {
    installWindowP(carrier, { promote: false });
    prim = window.p;
  } catch (error) {
    state.setStatus("window.p installation failed.", "bad");
    diagnostics.emit("SLOPKIT-FAIL", error && error.message ? error.message : "installWindowP-threw");
    state.setRunning(false);
    diagnostics.markCompleted(false);
    return;
  }

  if (!hasWindowP(prim)) {
    state.setStatus("window.p did not expose the expected userland methods.", "bad");
    diagnostics.emit("SLOPKIT-FAIL", "window-p-methods-missing");
    state.setRunning(false);
    diagnostics.markCompleted(false);
    return;
  }

  state.setWindowP("INSTALLED", true);
  diagnostics.emit("SLOPKIT-WINDOW-P-INSTALLED", "promote=false");

  if (readVerified(carrier, prim)) {
    state.setRead("VERIFIED", true);
    diagnostics.emit("SLOPKIT-READ-VERIFIED", "carrier-self-validation-pass");
  } else {
    state.setStatus("Carrier returned but userland read could not be verified.", "bad");
    diagnostics.emit("SLOPKIT-FAIL", "userland-read-not-verified");
    state.setRunning(false);
    diagnostics.markCompleted(false);
    return;
  }

  if (writeVerified(carrier)) {
    state.setWrite("VERIFIED", true);
    diagnostics.emit("SLOPKIT-WRITE-VERIFIED", "page-owned-memory-restored");
  } else {
    state.setStatus("Userland write could not be safely verified.", "bad");
    diagnostics.emit("SLOPKIT-FAIL", "userland-write-not-verified");
    state.setRunning(false);
    diagnostics.markCompleted(false);
    return;
  }

  state.setARW("VERIFIED", true);
  state.setStatus("13.02 userland validation completed. Kernel path remains locked.", "ok");
  diagnostics.emit("USERLAND-ARW-VERIFIED", "read-and-write-verified");
  state.setRunning(false);
  diagnostics.markCompleted(true);
}

runButton.addEventListener("click", function () {
  if (state.snapshot.running) return;
  runProbe();
});

stopButton.addEventListener("click", function () {
  state.requestStop();
  if (state.snapshot.running) {
    state.setStatus("Stop requested. Waiting for the current SlopKit attempt to return.", "bad");
  } else {
    state.setStatus("No active test is running.");
  }
});

downloadButton.addEventListener("click", function () {
  diagnostics.downloadReport();
});