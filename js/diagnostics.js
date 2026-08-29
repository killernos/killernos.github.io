"use strict";

(function () {
  var records = [];
  var attempts = 0;
  var passes = 0;
  var failures = 0;
  var lastStage = "Not reported";

  function detect() {
    var match = /PlayStation\s+4[\/ ](\d+)\.(\d+)/.exec(navigator.userAgent);
    var firmware = "Unknown";
    var backend = "None";
    if (match) {
      var minor = parseInt(match[2], 16);
      var normalizedMinor = minor.toString(16);
      if (normalizedMinor.length < 2) normalizedMinor = "0" + normalizedMinor;
      firmware = match[1] + "." + normalizedMinor;
      var n = parseInt(match[1], 10) * 100 + parseInt(normalizedMinor, 10);
      if (n <= 1202) backend = "Lapse";
      else if (n >= 1250) backend = "Poops";
    }
    return { firmware: firmware, backend: backend };
  }

  function runtime() {
    var detected = detect();
    var value = window.PS4Runtime || {};
    return {
      firmware: value.firmware || detected.firmware,
      backend: value.selectedBackend || detected.backend,
      buildId: window.PS4_WEBKIT_BUILD ? window.PS4_WEBKIT_BUILD.buildId : "Unknown"
    };
  }

  function render() {
    var state = runtime();
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
    var ids = Object.keys(fields);
    for (var i = 0; i < ids.length; i++) {
      var element = document.getElementById(ids[i]);
      if (element) element.textContent = fields[ids[i]];
    }
    var log = document.getElementById("log");
    if (log) {
      var lines = [];
      for (var j = 0; j < records.length; j++) {
        var r = records[j];
        lines.push("[" + r.timestamp + "] " + r.status + " " + r.stage + " " + r.message);
      }
      log.textContent = lines.join("\n") || "No diagnostic records.";
    }
  }

  function emit(status, stage, message) {
    var state = runtime();
    records.push({ timestamp: new Date().toISOString(), stage: stage, status: status, message: message || "", firmware: state.firmware, backend: state.backend, buildId: state.buildId });
    lastStage = stage;
    if (status === "PASS") passes++;
    if (status === "FAIL") failures++;
    render();
  }

  window.PS4Diag = {
    stage: function (name, details) { emit("STAGE", name, details); },
    pass: function (name, details) { emit("PASS", name, details); },
    fail: function (name, details) { emit("FAIL", name, details); },
    info: function (name, details) { emit("INFO", name, details); },
    reset: function () { records = []; attempts = 0; passes = 0; failures = 0; lastStage = "Not reported"; emit("INFO", "BOOT", "Diagnostic log reset."); },
    exportLog: function () {
      var blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "ps4-webkit-diagnostics-" + runtime().buildId + ".json";
      link.click();
      URL.revokeObjectURL(link.href);
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    var reset = document.getElementById("reset-log");
    var exportButton = document.getElementById("export-log");
    if (reset) reset.addEventListener("click", window.PS4Diag.reset);
    if (exportButton) exportButton.addEventListener("click", window.PS4Diag.exportLog);
    emit("INFO", "BOOT", "Diagnostics initialized.");
    emit("INFO", "FW-DETECTED", "Current browser routing state recorded.");
    emit("INFO", "RUNTIME-READY", "12.00 launcher is available from the home page when detected on PS4.");
  });
})();
