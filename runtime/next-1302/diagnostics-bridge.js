import { BACKEND_NAME, BUILD_ID, CANDIDATE_NAME, KERNEL_CANDIDATE_NAME } from "./research-state.js";

function detailText(detail) {
  return detail == null || detail === "" ? "" : String(detail);
}

function stageStatus(stageName) {
  if (/FAIL|ERROR|LOCKED/.test(stageName)) return "fail";
  if (/PASS|VERIFIED|OBTAINED|INSTALLED|CONFIRMED|SUCCESS/.test(stageName)) return "pass";
  return "stage";
}

export function createDiagnosticsBridge(state) {
  function runtimeInfo() {
    return {
      firmware: state.snapshot.firmware,
      firmwareRaw: state.snapshot.firmware,
      firmwareNormalized: state.snapshot.firmware,
      firmwareSource: state.snapshot.simulation ? "query" : "user-agent",
      hardwareDetected: !state.snapshot.simulation,
      simulated: state.snapshot.simulation,
      selectedBackend: BACKEND_NAME,
      buildId: BUILD_ID,
      cacheRevision: window.PS4_WEBKIT_BUILD ? window.PS4_WEBKIT_BUILD.cacheRevision : BUILD_ID,
      pageName: "NEXT-1302-RESEARCH",
      relativePath: location.pathname || "./runtime/next-1302/index.html",
      researchMode: true,
      researchCandidate: KERNEL_CANDIDATE_NAME,
      candidateStatus: "locked",
      isPS4: !state.snapshot.simulation,
      launcherReady: true,
      backendEntered: state.snapshot.running,
      kernelRW: false,
      payloadId: "",
      payloadVersion: "Unknown"
    };
  }

  function emit(stageName, detail, extra) {
    const text = detailText(detail);
    const status = stageStatus(stageName);
    state.appendEvent(stageName, text, {
      attempt: extra && extra.attempt,
      success: status === "pass"
    });

    if (!window.PS4Diag) return;
    if (typeof window.PS4Diag.observeRuntimeEvent === "function") {
      window.PS4Diag.observeRuntimeEvent(stageName, text, extra || {});
      return;
    }
    if (status === "fail" && typeof window.PS4Diag.fail === "function") {
      window.PS4Diag.fail(stageName, text, { category: "RESEARCH", attempt: extra && extra.attempt });
      return;
    }
    if (status === "pass" && typeof window.PS4Diag.pass === "function") {
      window.PS4Diag.pass(stageName, text, { category: "RESEARCH", attempt: extra && extra.attempt });
      return;
    }
    if (typeof window.PS4Diag.stage === "function") {
      window.PS4Diag.stage(stageName, text, { category: "RESEARCH", attempt: extra && extra.attempt });
    }
  }

  return {
    connected() {
      return !!window.PS4Diag;
    },
    init() {
      if (window.PS4_WEBKIT_BUILD) {
        window.PS4_WEBKIT_BUILD.researchBuildId = BUILD_ID;
      }
      window.PS4Runtime = runtimeInfo();
      if (!window.PS4Diag) return;
      window.PS4Diag.markPage("NEXT-1302-RESEARCH", location.pathname || "./runtime/next-1302/index.html");
      window.PS4Diag.markBackend({ selected: BACKEND_NAME, entered: false, completed: false, failed: false });
    },
    emit,
    markRunning() {
      window.PS4Runtime = runtimeInfo();
      window.PS4Runtime.backendEntered = true;
      if (window.PS4Diag) {
        window.PS4Diag.markBackend({ selected: BACKEND_NAME, entered: true, completed: false, failed: false });
      }
    },
    markCompleted(success) {
      window.PS4Runtime = runtimeInfo();
      window.PS4Runtime.backendEntered = true;
      if (!window.PS4Diag) return;
      window.PS4Diag.markBackend({ selected: BACKEND_NAME, entered: true, completed: !!success, failed: !success });
      window.PS4Diag.info("NEXT-1302-REPORT", "13.02 research state updated.", {
        category: "RESEARCH",
        firmware: state.snapshot.firmware,
        hardware: state.snapshot.hardware,
        buildId: BUILD_ID,
        page: "NEXT-1302-RESEARCH",
        backend: BACKEND_NAME,
        slopkitAttempt: state.snapshot.slopkitAttempt,
        slopkitStage: state.snapshot.lastStage,
        lastSuccessfulStage: state.snapshot.lastSuccessfulStage,
        carrierObtained: state.snapshot.carrierObtained,
        windowPInstalled: state.snapshot.windowPInstalled,
        readVerified: state.snapshot.readVerified,
        writeVerified: state.snapshot.writeVerified,
        userlandARWVerified: state.snapshot.userlandARWVerified,
        jsError: state.snapshot.jsError,
        unexpectedTermination: state.snapshot.unexpectedTermination,
        testerOutcome: state.snapshot.testerOutcome,
        testerNotes: state.snapshot.testerNotes
      });
    },
    downloadReport() {
      if (window.PS4Diag && typeof window.PS4Diag.downloadCommunityReport === "function") {
        window.PS4Diag.downloadCommunityReport();
        return;
      }
      state.downloadReport();
    }
  };
}