"use strict";

window.NEXT_COMMUNITY_REPORT_ENDPOINT =
    "https://ps4next.mooo.com/api/community-report";

/*
 * Compatibility bridge for next-community-report-2.
 * Keeps network submissions compatible with the strict private receiver while
 * preserving the full local report/download unchanged.
 */
(function () {
  if (typeof XMLHttpRequest === "undefined") return;

  var endpoint = String(window.NEXT_COMMUNITY_REPORT_ENDPOINT || "");
  var originalOpen = XMLHttpRequest.prototype.open;
  var originalSend = XMLHttpRequest.prototype.send;
  var SAFE_SUBMISSION_CHARS = 48000;

  function scalarDetails(value) {
    if (value == null) return "";
    if (typeof value === "string") return value.slice(0, 500);
    try {
      return JSON.stringify(value).slice(0, 500);
    } catch (error) {
      return String(value).slice(0, 500);
    }
  }

  function normalizeRecord(record) {
    record = record || {};
    return {
      timestamp: record.timestamp || new Date().toISOString(),
      elapsedMs: typeof record.elapsedMs === "number" && isFinite(record.elapsedMs) ? Math.max(0, Math.floor(record.elapsedMs)) : 0,
      status: record.status || "INFO",
      stage: record.stage || "",
      message: record.message || "",
      category: record.category || "COMMUNITY",
      firmware: record.firmware || "Unknown",
      firmwareSource: record.firmwareSource || "unknown",
      hardwareDetected: !!record.hardwareDetected,
      simulated: !!record.simulated,
      backend: record.backend || "Unknown",
      buildId: record.buildId || "Unknown",
      cacheRevision: record.cacheRevision || "Unknown",
      pageName: record.pageName || "UNKNOWN",
      relativePath: record.relativePath || "",
      sessionId: record.sessionId || "",
      normalizedStage: record.normalizedStage || "",
      evidence: record.evidence || "OBSERVED",
      runtime: record.runtime || {
        firmwareCapability: "unknown",
        runtimeConfigured: false,
        runtimeMode: "unsupported",
        runtimeBackend: "Unknown",
        runtimeTarget: "",
        nextAccess: "UNSUPPORTED",
        hardwareVerification: "UNVERIFIED"
      },
      payload: record.payload || {
        id: "unknown",
        displayName: "Unknown",
        version: "Unknown",
        path: "",
        verificationStatus: "unknown",
        byteSize: 0,
        sha256: "",
        firmwareCompatible: false,
        recommended: false,
        actualSize: 0,
        actualSha256: ""
      },
      detailsText: scalarDetails(Object.prototype.hasOwnProperty.call(record, "detailsText") ? record.detailsText : record.details)
    };
  }

  function normalizeRecordList(records) {
    if (!Array.isArray(records)) return [];
    var output = [];
    for (var i = 0; i < records.length; i++) output.push(normalizeRecord(records[i]));
    return output;
  }

  function compactRecords(records, keepCount) {
    if (!Array.isArray(records) || records.length <= keepCount) return records || [];
    var headCount = Math.min(8, Math.floor(keepCount / 4));
    var tailCount = Math.max(0, keepCount - headCount);
    return records.slice(0, headCount).concat(records.slice(records.length - tailCount));
  }

  function compactForSubmission(report) {
    var serialized = JSON.stringify(report);
    var keepCount;
    var compacted;

    if (serialized.length <= SAFE_SUBMISSION_CHARS) return serialized;

    keepCount = Array.isArray(report.diagnostics) ? Math.min(report.diagnostics.length, 120) : 0;
    if (!keepCount) return serialized;

    while (keepCount >= 10) {
      compacted = compactRecords(report.diagnostics, keepCount);
      report.diagnostics = compacted;
      report.diagnosticRecords = compacted.slice();
      serialized = JSON.stringify(report);
      if (serialized.length <= SAFE_SUBMISSION_CHARS) return serialized;
      keepCount = Math.floor(keepCount / 2);
    }

    compacted = compactRecords(report.diagnostics, 10);
    report.diagnostics = compacted;
    report.diagnosticRecords = compacted.slice();
    return JSON.stringify(report);
  }

  function showServerReason(xhr) {
    if (!xhr || xhr.status !== 400) return;
    var response;
    try {
      response = JSON.parse(xhr.responseText || "{}");
    } catch (error) {
      response = {};
    }
    if (!response || !response.error) return;

    window.setTimeout(function () {
      var box = document.getElementById("submission-status");
      if (!box) return;
      box.textContent = "REPORT REJECTED. Server reason: " + String(response.error).slice(0, 160) + ". Your report is still stored locally.";
      box.className = "status-box bad";
    }, 0);
  }

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__nextCommunityReportRequest =
      String(method || "").toUpperCase() === "POST" && String(url || "") === endpoint;
    if (this.__nextCommunityReportRequest && typeof this.addEventListener === "function") {
      var xhr = this;
      this.addEventListener("loadend", function () { showServerReason(xhr); });
    }
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (!this.__nextCommunityReportRequest || typeof body !== "string") {
      return originalSend.call(this, body);
    }

    try {
      var report = JSON.parse(body);
      if (report && report.schema === "next-community-report-2") {
        if (!Object.prototype.hasOwnProperty.call(report, "userAgent")) report.userAgent = "";
        if (!report.previousFirmware) report.previousFirmware = "Unknown";
        if (!report.previousLastTimestamp) {
          report.previousLastTimestamp = report.createdAt || report.timestamp || new Date().toISOString();
        }
        report.diagnostics = normalizeRecordList(report.diagnostics);
        report.diagnosticRecords = report.diagnostics.slice();
        body = compactForSubmission(report);
      }
    } catch (error) {
      /* Preserve unexpected bodies so receiver validation remains authoritative. */
    }

    return originalSend.call(this, body);
  };
})();
