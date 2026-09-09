"use strict";

window.NEXT_COMMUNITY_REPORT_ENDPOINT =
    "https://ps4next.mooo.com/api/community-report";

/*
 * Compatibility bridge for next-community-report-2.
 *
 * The private receiver validates an exact key set and caps request bodies at
 * 65,536 bytes. Full reports remain available through the local download;
 * only the network submission is compacted when needed.
 */
(function () {
  if (typeof XMLHttpRequest === "undefined") return;

  var endpoint = String(window.NEXT_COMMUNITY_REPORT_ENDPOINT || "");
  var originalOpen = XMLHttpRequest.prototype.open;
  var originalSend = XMLHttpRequest.prototype.send;
  var SAFE_SUBMISSION_CHARS = 48000;

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

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__nextCommunityReportRequest =
      String(method || "").toUpperCase() === "POST" && String(url || "") === endpoint;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (!this.__nextCommunityReportRequest || typeof body !== "string") {
      return originalSend.call(this, body);
    }

    try {
      var report = JSON.parse(body);
      if (report && report.schema === "next-community-report-2") {
        if (!Object.prototype.hasOwnProperty.call(report, "userAgent")) {
          report.userAgent = "";
        }
        if (!report.previousFirmware) {
          report.previousFirmware = "Unknown";
        }
        if (!report.previousLastTimestamp) {
          report.previousLastTimestamp = report.createdAt || report.timestamp || new Date().toISOString();
        }
        body = compactForSubmission(report);
      }
    } catch (error) {
      /* Leave malformed/unexpected bodies untouched so the receiver rejects them normally. */
    }

    return originalSend.call(this, body);
  };
})();
