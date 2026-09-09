"use strict";

window.NEXT_COMMUNITY_REPORT_ENDPOINT =
    "https://ps4next.mooo.com/api/community-report";

/*
 * Compatibility bridge for next-community-report-2.
 *
 * The private receiver validates an exact key set. Older live diagnostics
 * omitted userAgent when the tester left the opt-in checkbox unchecked and
 * emitted empty previous-session placeholders. That made otherwise valid
 * reports fail validation with HTTP 400.
 *
 * This bridge only normalizes outgoing JSON for the configured NEXT report
 * endpoint. It does not add identifying data: userAgent remains an empty
 * string unless diagnostics already included it.
 */
(function () {
  if (typeof XMLHttpRequest === "undefined") return;

  var endpoint = String(window.NEXT_COMMUNITY_REPORT_ENDPOINT || "");
  var originalOpen = XMLHttpRequest.prototype.open;
  var originalSend = XMLHttpRequest.prototype.send;

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
        body = JSON.stringify(report);
      }
    } catch (error) {
      /* Leave malformed/unexpected bodies untouched so the receiver rejects them normally. */
    }

    return originalSend.call(this, body);
  };
})();
