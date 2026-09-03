"use strict";

(function () {
  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function detectFirmware() {
    var params = new URLSearchParams(location.search || "");
    var forced = String(params.get("fw") || "").trim();
    if (forced) return forced;
    if (window.PS4PayloadLoader && typeof window.PS4PayloadLoader.currentFirmware === "function") {
      return window.PS4PayloadLoader.currentFirmware().firmware || "Unknown";
    }
    return "Unknown";
  }

  function mark(status, stage, message, details) {
    if (!window.PS4Diag) return;
    if (status === "FAIL") window.PS4Diag.fail(stage, message, details || {});
    else if (status === "PASS") window.PS4Diag.pass(stage, message, details || {});
    else window.PS4Diag.info(stage, message, details || {});
  }

  function appendLog(text) {
    var node = document.getElementById("log");
    if (!node) return;
    node.textContent = node.textContent === "Waiting for diagnostics..." ? text : node.textContent + "\n" + text;
  }

  function runProbe() {
    var firmware = detectFirmware();
    var storageOk = false;
    var cacheOk = typeof window.caches !== "undefined";
    try {
      localStorage.setItem("__next_compat_probe__", "1");
      localStorage.removeItem("__next_compat_probe__");
      storageOk = true;
    } catch (error) { }

    setText("field-firmware", firmware || "Unknown");
    setText("field-runtime", "NOT CURRENTLY CONFIGURED");
    setText("field-webkit", "TESTING / OBSERVATION ONLY");
    setText("field-kernel", "NOT STARTED");
    setText("field-hen", "LOCKED");
    setText("field-storage", (storageOk ? "storage ready" : "storage unavailable") + " / " + (cacheOk ? "cache present" : "cache unavailable"));
    setText("status-copy", "Compatibility probe completed. No exploit, kernel offsets, or HEN execution were attempted.");

    window.PS4Runtime = window.PS4Runtime || {};
    window.PS4Runtime.firmware = firmware || "Unknown";
    window.PS4Runtime.selectedBackend = "Compatibility";
    window.PS4Runtime.pageName = "NEXT-COMPATIBILITY-TEST";
    window.PS4Runtime.relativePath = location.pathname || "./runtime/compat/index.html";
    window.PS4Runtime.researchMode = true;
    window.PS4Runtime.henSelection = "none";
    window.PS4Runtime.henDisplayName = "No HEN";

    if (window.PS4Diag) {
      window.PS4Diag.markPage("NEXT-COMPATIBILITY-TEST", location.pathname || "./runtime/compat/index.html");
      window.PS4Diag.markBackend({ selected: "Compatibility", entered: false, completed: false, failed: false });
      window.PS4Diag.markLaunch({
        firmware: firmware,
        backend: "Compatibility",
        pageName: "NEXT-COMPATIBILITY-TEST",
        message: "Compatibility probe opened for firmware without an exact configured runtime.",
        runtime: {
          firmwareCapability: firmware,
          runtimeConfigured: false,
          runtimeMode: "compatibility",
          runtimeBackend: "Compatibility",
          runtimeTarget: "./runtime/compat/index.html",
          nextAccess: "AVAILABLE",
          hardwareVerification: "UNVERIFIED"
        }
      });
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
        error: "HEN execution is locked during compatibility testing."
      });
      mark("INFO", "FW-CAPABILITY-CHECK", "Compatibility probe selected because this firmware has no exact configured NEXT runtime.", { category: "ROUTING", firmware: firmware, runtimeMode: "compatibility", runtimeConfigured: false, runtimeTarget: "./runtime/compat/index.html", backend: "Compatibility", researchMode: true, selectedHen: "none" });
      mark("INFO", "RUNTIME-COMPATIBILITY", "Opened NEXT compatibility test without running a configured exploit chain.", { category: "ROUTING", firmware: firmware, runtimeMode: "compatibility", runtimeConfigured: false, runtimeTarget: "./runtime/compat/index.html", backend: "Compatibility", researchMode: true, selectedHen: "none" });
      mark(storageOk ? "PASS" : "INFO", "CACHE-READY", cacheOk ? "Cache API detected for compatibility probe." : "Cache API unavailable for compatibility probe.", { category: "CACHE" });
    }

    appendLog("Firmware: " + (firmware || "Unknown"));
    appendLog("Exact runtime: NOT CURRENTLY CONFIGURED");
    appendLog("WebKit compatibility: TESTING / OBSERVATION ONLY");
    appendLog("Kernel exploit: NOT STARTED");
    appendLog("HEN: LOCKED");
    appendLog("Storage / Cache: " + (storageOk ? "storage ready" : "storage unavailable") + " / " + (cacheOk ? "cache present" : "cache unavailable"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    var button = document.getElementById("run-probe");
    if (button) button.addEventListener("click", runProbe);
    runProbe();
  });
})();