"use strict";

(function () {
  var records = [];
  var attempts = 0;
  var passes = 0;
  var failures = 0;
  var lastStage = "Not reported";

  function runtime() {
    var value = window.PS4Runtime || {};
    return {
      firmware: value.firmware || "Unknown",
      backend: value.selectedBackend || "None",
      isPS4: Boolean(value.isPS4),
      buildId: window.PS4_WEBKIT_BUILD ? window.PS4_WEBKIT_BUILD.buildId : "Unknown"
    };
  }

  function render() {
    var state = runtime();
    var log = document.getElementById("log");
    var fields = {
      "diag-firmware": state.firmware,
      "diag-backend": state.backend,
      "diag-build": state.buildId,
      "diag-user-agent": navigator.userAgent,
      "diag-last-stage": lastStage,
      "diag-attempts": String(attempts),
      "diag-passes": String(passes),
      "diag-failures": String(failures)
    };
    Object.keys(fields).forEach(function (id) {
      var element = document.getElementById(id);
      if (element) element.textContent = fields[id];
    });
    if (log) {
      log.textContent = records.map(function (record) {
        return "[" + record.timestamp + "] " + record.status + " " + record.stage + " " + record.message;
      }).join("\n") || "No diagnostic records.";
      log.scrollTop = log.scrollHeight;
    }
  }

  function emit(status, stage, message) {
    var state = runtime();
    var record = {
      timestamp: new Date().toISOString(),
      stage: stage,
      status: status,
      message: message || "",
      firmware: state.firmware,
      backend: state.backend,
      buildId: state.buildId
    };
    records.push(record);
    lastStage = stage;
    if (status === "PASS") passes++;
    if (status === "FAIL") failures++;
    render();
    return record;
  }

  window.PS4Diag = {
    stage: function (name, details) { return emit("STAGE", name, details); },
    pass: function (name, details) { return emit("PASS", name, details); },
    fail: function (name, details) { return emit("FAIL", name, details); },
    info: function (name, details) { return emit("INFO", name, details); },
    exportLog: function () {
      var blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "ps4-webkit-diagnostics-" + runtime().buildId + ".json";
      link.click();
      URL.revokeObjectURL(link.href);
    },
    reset: function () {
      records = [];
      attempts = 0;
      passes = 0;
      failures = 0;
      lastStage = "Not reported";
      emit("INFO", "BOOT", "Diagnostic log reset. No runtime action was performed.");
    },
    records: function () { return records.slice(); }
  };

  window.PS4WebKitProbe = {
    run: function () {
      attempts++;
      emit("INFO", "WK-TRIGGER-BEGIN", "Probe harness is not implemented in this diagnostic scaffold.");
      return { name: "webkit-probe", success: false, observations: ["unavailable"], iterations: 1, error: "Probe implementation unavailable" };
    },
    reset: function () { window.PS4Diag.reset(); },
    status: function () { return { attempts: attempts, passes: passes, failures: failures, lastStage: lastStage }; }
  };

  function runMany(count) {
    for (var index = 0; index < count; index++) window.PS4WebKitProbe.run();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var once = document.getElementById("run-once");
    var ten = document.getElementById("run-ten");
    var reset = document.getElementById("reset-log");
    var exportButton = document.getElementById("export-log");
    if (once) once.addEventListener("click", function () { runMany(1); });
    if (ten) ten.addEventListener("click", function () { runMany(10); });
    if (reset) reset.addEventListener("click", window.PS4Diag.reset);
    if (exportButton) exportButton.addEventListener("click", window.PS4Diag.exportLog);
    emit("INFO", "BOOT", "Diagnostics initialized.");
    emit("INFO", "FW-DETECTED", "Firmware routing state recorded without backend execution.");
    emit("INFO", "CACHE-REVISION", "No AppCache manifest is configured for this private diagnostic site.");
  });
})();