import { establishPrimitive } from "./slopkit/core.js";
import { abortPrimitive, cleanupTemporaryAllocations } from "./slopkit/core.js";
import { installWindowP } from "./slopkit/mem.js";
import { BUILD_ID, createResearchState } from "./research-state.js";
import { createDiagnosticsBridge } from "./diagnostics-bridge.js";
import { create1302ResearchAdapter } from "./research-adapter.js";

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
    firmware: forcedFirmware || (simulated ? "13.02" : "Unknown"),
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
const adapter = create1302ResearchAdapter({
  firmware: context.firmware,
  entryMethod: "SlopKit",
  diagnostics: diagnostics,
  primitiveFactory: establishPrimitive,
  installWindowP: installWindowP,
  hasWindowP: hasWindowP,
  verifyRead: readVerified,
  verifyWrite: writeVerified,
  abortPrimitive: abortPrimitive,
  releaseTemporaryAllocations: cleanupTemporaryAllocations,
  onPrimitiveEvent: function (tag, detail, attempt) {
    diagnostics.emit(tag, detail, { attempt: attempt });
  }
});

state.setFirmware(context.firmware === "Unknown" ? "Unknown" : context.firmware);
state.setSimulation(context.simulated);
state.setHardware(context.simulated ? "simulation" : context.exact1302 ? "hardware" : "not-13.02");
state.setHen("none", "No HEN", "none", null, null, "source-confirmed", false, false, "LOCKED", "HEN loading is locked during the 13.02 userland research test.");
if (context.simulated) {
  state.setHardwareTest("READY", "Simulation mode is enabled for UI and diagnostics testing only.");
  state.setStatus("Simulation mode is enabled for page and diagnostics testing only.");
} else if (context.exact1302) {
  state.setHardwareTest("READY", "Hardware firmware matches. Manual SlopKit test available.");
  state.setStatus("Awaiting manual start.");
} else {
  state.setHardwareTest("LOCKED", "This console is not running firmware 13.02.");
  state.setStatus("NEXT 13.02 Research Laboratory loaded for inspection only. Exploit execution is locked on non-13.02 hardware.", "bad");
  runButton.disabled = true;
}
diagnostics.init();

const adapterInit = adapter.initialize();
if (!adapterInit.ok) {
  runButton.disabled = true;
  state.setStatus("13.02 experimental runtime is disabled in this build. Enable ENABLE_1302_EXPERIMENTAL only for development builds.", "bad");
}

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
  let entryResult;
  let verifyResult;

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
  entryResult = await adapter.runUserlandEntry();
  if (!entryResult || !entryResult.ok) {
    state.setPrimitive("FAILED");
    state.setStatus("SlopKit did not complete a verified entry stage.", "bad");
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

  state.setPrimitive("OBTAINED");
  state.setCarrier("OBTAINED", true);
  state.setWindowP("INSTALLED", true);
  diagnostics.emit("SLOPKIT-CARRIER-OBTAINED", "carrier-returned");
  diagnostics.emit("SLOPKIT-WINDOW-P-INSTALLED", "promote=false");

  verifyResult = await adapter.verifyUserlandReadWrite();
  if (!verifyResult || !verifyResult.ok) {
    state.setStatus("Userland read/write could not be verified.", "bad");
    state.setRunning(false);
    diagnostics.markCompleted(false);
    return;
  }

  state.setRead("VERIFIED", true);
  state.setWrite("VERIFIED", true);
  diagnostics.emit("SLOPKIT-READ-VERIFIED", "carrier-self-validation-pass");
  diagnostics.emit("SLOPKIT-WRITE-VERIFIED", "page-owned-memory-restored");

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
  adapter.abort();
  if (state.snapshot.running) {
    state.setStatus("Stop requested. Waiting for the current SlopKit attempt to return.", "bad");
  } else if (!context.exact1302 && !context.simulated) {
    state.setStatus("13.02 hardware test remains locked because this console is not running firmware 13.02.", "bad");
  } else {
    state.setStatus("No active test is running.");
  }
});

downloadButton.addEventListener("click", function () {
  diagnostics.downloadReport();
});