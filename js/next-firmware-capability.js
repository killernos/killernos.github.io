(function () {
  var capabilityRegistry = window.NEXTCapabilities || null;
  var CONFIGURED_KEYS = capabilityRegistry && Array.isArray(capabilityRegistry.all)
    ? capabilityRegistry.all.filter(function (entry) { return entry && entry.mode === "runtime"; }).map(function (entry) { return entry.firmware; })
    : [];

  function firmwareNumber(value) {
    var clean = String(value || "").trim();
    var parts = clean.split(".");
    var major = parseInt(parts[0] || "0", 10);
    var minor = parseInt(parts[1] || "0", 10);
    return major * 100 + minor;
  }

  function normalizeFirmware(value) {
    var clean = String(value || "").replace(/\s+/g, "").trim();
    var parsed = /^(\d+)(?:\.(\d{1,2}))?$/.exec(clean);
    var minor;
    if (!parsed) return "";
    minor = parsed[2] || "00";
    if (minor.length < 2) minor = "0" + minor;
    return parsed[1] + "." + minor;
  }

  function backendNameFor(entry, firmware) {
    if (!entry) return "Unsupported";
    if (entry.backendLabel) return String(entry.backendLabel);
    if (entry.mode === "research") return "NEXT 13.02 Research";
    if (/netctrl/i.test(String(entry.kernel || ""))) return "Poops";
    if (/lapse/i.test(String(entry.kernel || ""))) return "Lapse";
    return String(entry.kernel || "Unsupported");
  }

  function hardwareVerificationFor(entry, firmware) {
    if (!entry) return "UNVERIFIED";
    if (entry.verifiedByKillerNoS) return "LOCAL";
    if (entry.evidence === "UPSTREAM-VERIFIED") return "COMMUNITY";
    return "UNVERIFIED";
  }

  function configuredCapability(firmware, entry) {
    return {
      firmware: firmware,
      firmwareNumber: firmwareNumber(firmware),
      buttonAllowed: true,
      mode: "runtime",
      backend: backendNameFor(entry, firmware),
      target: entry.runtime || "./runtime/next/run_lapse.html",
      runtimeConfigured: true,
      research: false,
      nextAccess: "AVAILABLE",
      runtimeStatus: "CONFIGURED RUNTIME",
      hardwareVerification: hardwareVerificationFor(entry, firmware),
      researchCandidate: "",
      candidateStatus: "configured",
      exact: true,
      offsetKey: firmware
    };
  }

  function compatibilityCapability(firmware) {
    return {
      firmware: firmware,
      firmwareNumber: firmwareNumber(firmware),
      buttonAllowed: true,
      mode: "compatibility",
      backend: "Compatibility",
      target: "./runtime/compat/index.html",
      runtimeConfigured: false,
      research: false,
      nextAccess: "AVAILABLE",
      runtimeStatus: "COMPATIBILITY TEST",
      hardwareVerification: "UNVERIFIED",
      researchCandidate: "WebKit Compatibility Probe",
      candidateStatus: "research",
      exact: false,
      offsetKey: ""
    };
  }

  function researchCapability() {
    var entry = capabilityRegistry && typeof capabilityRegistry.findExact === "function" ? capabilityRegistry.findExact("13.02") : null;
    return {
      firmware: "13.02",
      firmwareNumber: 1302,
      buttonAllowed: true,
      mode: "research",
      backend: "NEXT 13.02 Research",
      target: entry && entry.runtime ? entry.runtime : "./runtime/next-1302/index.html",
      runtimeConfigured: false,
      research: true,
      nextAccess: "AVAILABLE",
      runtimeStatus: "RESEARCH",
      hardwareVerification: "UNVERIFIED",
      researchCandidate: "SlopKit Userland",
      candidateStatus: "research",
      exact: true,
      offsetKey: ""
    };
  }

  function unsupportedCapability(firmware) {
    return {
      firmware: firmware || "Unknown",
      firmwareNumber: firmwareNumber(firmware),
      buttonAllowed: false,
      mode: "unsupported",
      backend: "Unsupported",
      target: "",
      runtimeConfigured: false,
      research: false,
      nextAccess: "UNSUPPORTED",
      runtimeStatus: "UNSUPPORTED",
      hardwareVerification: "UNVERIFIED",
      researchCandidate: "",
      candidateStatus: "",
      exact: false,
      offsetKey: ""
    };
  }

  function getNextFirmwareCapability(firmware) {
    var normalized = normalizeFirmware(firmware);
    var exact = normalized && capabilityRegistry && typeof capabilityRegistry.findExact === "function"
      ? capabilityRegistry.findExact(normalized)
      : null;
    if (normalized === "13.02") return researchCapability();
    if (exact) return configuredCapability(normalized, exact);
    if (normalized && firmwareNumber(normalized) < firmwareNumber("13.02")) return compatibilityCapability(normalized);
    return unsupportedCapability(normalized);
  }

  window.NEXTFirmwareCapability = {
    configuredFirmwares: CONFIGURED_KEYS.slice(),
    firmwareNumber: firmwareNumber,
    normalizeFirmware: normalizeFirmware,
    getNextFirmwareCapability: getNextFirmwareCapability
  };
})();
