"use strict";

window.NEXT_COMMUNITY_REPORT_ENDPOINT =
    "https://ps4next.duckdns.org/api/community-report";

/*
 * Compatibility bridge for next-community-report-2.
 * The full local report remains unchanged. Network submission is reduced to
 * the strict summary schema accepted by the private receiver so older/mixed
 * diagnostic records cannot invalidate an otherwise useful hardware report.
 */
(function () {
  if (typeof XMLHttpRequest === "undefined") return;

  var endpoint = String(window.NEXT_COMMUNITY_REPORT_ENDPOINT || "");
  var originalOpen = XMLHttpRequest.prototype.open;
  var originalSend = XMLHttpRequest.prototype.send;

  function text(value, fallback) {
    var result = value == null ? "" : String(value);
    result = result.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
    return result || (fallback || "");
  }

  function firmware(value) {
    var result = text(value, "Unknown");
    return /^(?:Unknown|\d+\.\d{2})$/.test(result) ? result : "Unknown";
  }

  function timestamp(value, fallback) {
    var result = text(value, "");
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(result)
      ? result
      : (fallback || new Date().toISOString());
  }

  function safePath(value) {
    var result = text(value, "").replace(/^https?:\/\/[^/]+/i, "").replace(/[?#].*$/, "");
    if (result.indexOf("\\") !== -1 || /(^|\/)\.\.(\/|$)/.test(result)) return "";
    return result.slice(0, 260);
  }

  function allowed(value, choices, fallback) {
    var result = text(value, fallback);
    return choices.indexOf(result) !== -1 ? result : fallback;
  }

  function integer(value, max) {
    var result = Number(value);
    if (!isFinite(result) || result < 0) return 0;
    result = Math.floor(result);
    return Math.min(result, max);
  }

  function strictRuntime(value) {
    value = value || {};
    return {
      firmwareCapability: text(value.firmwareCapability, "unknown").slice(0, 32),
      runtimeConfigured: !!value.runtimeConfigured,
      runtimeMode: text(value.runtimeMode, "unsupported").slice(0, 32),
      runtimeBackend: text(value.runtimeBackend, "Unknown").slice(0, 80),
      runtimeTarget: safePath(value.runtimeTarget),
      nextAccess: text(value.nextAccess, "UNSUPPORTED").slice(0, 32),
      hardwareVerification: text(value.hardwareVerification, "UNVERIFIED").slice(0, 32)
    };
  }

  function strictPayload(value) {
    value = value || {};
    return {
      payloadId: text(value.payloadId, "unknown").slice(0, 80),
      payloadDisplayName: text(value.payloadDisplayName, "Unknown").slice(0, 120),
      payloadVersion: text(value.payloadVersion, "Unknown").slice(0, 32),
      payloadPath: safePath(value.payloadPath),
      payloadVerificationStatus: text(value.payloadVerificationStatus, "unknown").slice(0, 32),
      payloadExpectedSize: integer(value.payloadExpectedSize, 2147483647),
      payloadExpectedSha256: text(value.payloadExpectedSha256, "").slice(0, 128),
      payloadFirmwareCompatible: !!value.payloadFirmwareCompatible,
      payloadRecommended: !!value.payloadRecommended,
      payloadActualSize: integer(value.payloadActualSize, 2147483647),
      payloadActualSha256: text(value.payloadActualSha256, "").slice(0, 128)
    };
  }

  function strictHen(value) {
    value = value || {};
    return {
      henFamily: text(value.henFamily, "none").slice(0, 32),
      henSelection: text(value.henSelection, "none").slice(0, 32),
      henDisplayName: text(value.henDisplayName, "No HEN").slice(0, 120),
      henIdentifier: text(value.henIdentifier, "none").slice(0, 32),
      henVersion: value.henVersion == null ? null : text(value.henVersion, "").slice(0, 32),
      henPayloadPath: value.henPayloadPath == null ? null : safePath(value.henPayloadPath),
      henLoaderReference: text(value.henLoaderReference, "skip").slice(0, 32),
      henEvidence: text(value.henEvidence, "source-confirmed").slice(0, 32),
      henCompatibility: text(value.henCompatibility, "skipped").slice(0, 32),
      henLoadRequested: !!value.henLoadRequested,
      henLoadAttempted: !!value.henLoadAttempted,
      henLoadStatus: text(value.henLoadStatus, "SKIPPED").slice(0, 32),
      henLoadError: text(value.henLoadError, "").slice(0, 240)
    };
  }

  function strictStorage(value) {
    value = value || {};
    var choices = ["Unknown", "unknown", "pass", "fail", "present", "unavailable", "online", "offline", "CACHE-UNKNOWN", "CACHE-INIT", "CACHE-READY"];
    return {
      localStorage: allowed(value.localStorage, choices, "unknown"),
      sessionStorage: allowed(value.sessionStorage, choices, "unknown"),
      appCache: allowed(value.appCache, choices, "unknown"),
      cacheApi: allowed(value.cacheApi, choices, "unknown")
    };
  }

  function strictResearch(value) {
    value = value || {};
    return {
      researchMode: !!value.researchMode,
      candidate: text(value.candidate, "").slice(0, 120),
      candidateStatus: text(value.candidateStatus, "").slice(0, 32),
      entryReady: !!value.entryReady,
      candidateReady: !!value.candidateReady,
      kernelFaultObserved: !!value.kernelFaultObserved,
      kernelLeak: !!value.kernelLeak,
      kernelRead: !!value.kernelRead,
      kernelWrite: !!value.kernelWrite,
      kernelExecution: !!value.kernelExecution,
      lastResearchStage: text(value.lastResearchStage, "").slice(0, 80),
      slopkitAttempt: integer(value.slopkitAttempt, 10000),
      slopkitLastStage: text(value.slopkitLastStage, "").slice(0, 80),
      carrierState: text(value.carrierState, "NOT OBTAINED").slice(0, 32),
      windowPState: text(value.windowPState, "NOT INSTALLED").slice(0, 32),
      readPrimitiveState: text(value.readPrimitiveState, "NOT VERIFIED").slice(0, 32),
      writePrimitiveState: text(value.writePrimitiveState, "NOT VERIFIED").slice(0, 32),
      userlandARWState: text(value.userlandARWState, "NOT VERIFIED").slice(0, 32),
      nativeSyscallState: text(value.nativeSyscallState, "LOCKED").slice(0, 32),
      celsiusState: text(value.celsiusState, "LOCKED").slice(0, 32),
      kernelFaultState: text(value.kernelFaultState, "NOT OBSERVED").slice(0, 32),
      kernelReadState: text(value.kernelReadState, "NOT VERIFIED").slice(0, 32),
      kernelWriteState: text(value.kernelWriteState, "NOT VERIFIED").slice(0, 32),
      kernelExecutionState: text(value.kernelExecutionState, "NOT VERIFIED").slice(0, 32)
    };
  }

  function makeStrictSubmission(report) {
    var now = new Date().toISOString();
    var createdAt = timestamp(report.createdAt, now);
    var backend = report.backend || {};
    var cache = report.cacheStatus || {};
    var evidence = report.evidence || {};
    var page = report.page || {};

    return {
      schema: "next-community-report-2",
      reportId: text(report.reportId, "NEXT-REPORT-UNKNOWN").replace(/[^A-Z0-9-]/g, "-").slice(0, 40),
      sessionId: text(report.sessionId, "NEXT-SESSION-UNKNOWN").replace(/[^A-Z0-9-]/g, "-").slice(0, 40),
      createdAt: createdAt,
      timestamp: timestamp(report.timestamp, createdAt),
      firmware: firmware(report.firmware),
      firmwareSource: allowed(report.firmwareSource, ["query", "user-agent", "desktop", "unknown"], "unknown"),
      hardwareDetected: !!report.hardwareDetected,
      simulated: !!report.simulated,
      buildId: text(report.buildId, "Unknown").slice(0, 80),
      cacheRevision: text(report.cacheRevision, "Unknown").slice(0, 80),
      diagnosticsSchema: "next-diagnostics-2",
      researchBuildId: text(report.researchBuildId, "").slice(0, 80),
      consoleModel: allowed(report.consoleModel, ["Original", "Slim", "Pro", "Unknown"], "Unknown"),
      page: {
        pageName: text(page.pageName, "UNKNOWN").slice(0, 40),
        relativePath: safePath(page.relativePath)
      },
      entrypoint: text(report.entrypoint, "Unknown").slice(0, 80),
      candidate: text(report.candidate, "None").slice(0, 120),
      backend: {
        backendSelected: text(backend.backendSelected, "Unknown").slice(0, 80),
        backendEntered: !!backend.backendEntered,
        backendCompleted: !!backend.backendCompleted,
        backendFailed: !!backend.backendFailed
      },
      runtime: strictRuntime(report.runtime),
      payload: strictPayload(report.payload),
      hen: strictHen(report.hen),
      attemptCount: integer(report.attemptCount, 10000),
      passCount: integer(report.passCount, 100000),
      failureCount: integer(report.failureCount, 100000),
      firstStage: text(report.firstStage, "").slice(0, 80),
      firstNormalizedStage: text(report.firstNormalizedStage, "").slice(0, 80),
      lastStage: text(report.lastStage, "").slice(0, 80),
      lastNormalizedStage: text(report.lastNormalizedStage, "").slice(0, 80),
      previousSessionIncomplete: !!report.previousSessionIncomplete,
      previousLastStage: text(report.previousLastStage, "").slice(0, 80),
      previousLastNormalizedStage: text(report.previousLastNormalizedStage, "").slice(0, 80),
      previousFirmware: firmware(report.previousFirmware),
      previousBuildId: text(report.previousBuildId, "").slice(0, 80),
      previousBackend: text(report.previousBackend, "").slice(0, 80),
      previousPayload: text(report.previousPayload, "").slice(0, 120),
      previousLastTimestamp: timestamp(report.previousLastTimestamp, createdAt),
      cacheStatus: {
        status: text(cache.status, "CACHE-UNKNOWN").slice(0, 32),
        revision: text(cache.revision, "Unknown").slice(0, 80),
        buildRevision: text(cache.buildRevision, "Unknown").slice(0, 80),
        offline: text(cache.offline, "unknown").slice(0, 32)
      },
      storageStatus: strictStorage(report.storageStatus),
      onlineState: allowed(report.onlineState, ["online", "offline", "unknown"], "unknown"),
      javaScriptErrors: integer(report.javaScriptErrors, 100000),
      resourceErrors: integer(report.resourceErrors, 100000),
      testerSelectedOutcome: text(report.testerSelectedOutcome, "").slice(0, 80),
      testerAlias: text(report.testerAlias, "").slice(0, 80),
      testerNotes: text(report.testerNotes, "").slice(0, 2000),
      includeDiagnostics: false,
      consentConfirmed: !!report.consentConfirmed,
      evidence: {
        previousSessionIncomplete: text(evidence.previousSessionIncomplete, "OBSERVED").slice(0, 32),
        testerSelectedOutcome: text(evidence.testerSelectedOutcome, "OBSERVED").slice(0, 32)
      },
      research: strictResearch(report.research),
      userAgent: Object.prototype.hasOwnProperty.call(report, "userAgent") ? text(report.userAgent, "").slice(0, 512) : "",
      diagnostics: [],
      diagnosticRecords: []
    };
  }

  function showServerReason(xhr) {
    if (!xhr || xhr.status !== 400) return;
    var response;
    try { response = JSON.parse(xhr.responseText || "{}"); } catch (error) { response = {}; }
    window.setTimeout(function () {
      var box = document.getElementById("submission-status");
      if (!box) return;
      box.textContent = "REPORT REJECTED. Server reason: " + text(response.error, "invalid-report").slice(0, 160) + ". Your full report is still stored locally.";
      box.className = "status-box bad";
    }, 0);
  }

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__nextCommunityReportRequest = String(method || "").toUpperCase() === "POST" && String(url || "") === endpoint;
    if (this.__nextCommunityReportRequest && typeof this.addEventListener === "function") {
      var xhr = this;
      this.addEventListener("loadend", function () { showServerReason(xhr); });
    }
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (!this.__nextCommunityReportRequest || typeof body !== "string") return originalSend.call(this, body);
    try {
      var report = JSON.parse(body);
      if (report && report.schema === "next-community-report-2") body = JSON.stringify(makeStrictSubmission(report));
    } catch (error) {
      /* Preserve unexpected bodies so receiver validation remains authoritative. */
    }
    return originalSend.call(this, body);
  };
})();
