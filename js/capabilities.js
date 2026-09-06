"use strict";

(function () {
  function detailedStatus(entry) {
    return {
      releaseChannel: entry.releaseChannel,
      runtimeFamily: entry.runtimeFamily,
      userlandEntryAvailability: entry.userlandEntryAvailability,
      arbitraryUserlandReadWrite: entry.arbitraryUserlandReadWrite,
      kernelTriggerAvailability: entry.kernelTriggerAvailability,
      kernelReadAvailability: entry.kernelReadAvailability,
      kernelWriteAvailability: entry.kernelWriteAvailability,
      payloadCompatibility: entry.payloadCompatibility,
      hardwareVerificationStatus: entry.hardwareVerificationStatus
    };
  }

  var capabilityRows = [
    {
      firmware: "11.00",
      userland: "SlopKit",
      kernel: "Lapse",
      backendLabel: "Lapse",
      runtime: "./runtime/next/run_lapse.html",
      mode: "runtime",
      releaseChannel: "reference",
      runtimeFamily: "Lapse",
      userlandEntryAvailability: "source-confirmed",
      arbitraryUserlandReadWrite: "research",
      kernelTriggerAvailability: "upstream-verified",
      kernelReadAvailability: "research",
      kernelWriteAvailability: "research",
      payloadCompatibility: "research",
      hardwareVerificationStatus: "upstream-verified",
      evidence: "UPSTREAM-VERIFIED",
      verifiedByKillerNoS: false,
      henAllowed: true,
      researchOnly: false,
      notes: "Configured runtime key exists in NEXT offsets; local hardware validation has not been claimed."
    },
    {
      firmware: "11.50",
      userland: "SlopKit",
      kernel: "Lapse",
      backendLabel: "Lapse",
      runtime: "./runtime/next/run_lapse.html",
      mode: "runtime",
      releaseChannel: "reference",
      runtimeFamily: "Lapse",
      userlandEntryAvailability: "source-confirmed",
      arbitraryUserlandReadWrite: "research",
      kernelTriggerAvailability: "upstream-verified",
      kernelReadAvailability: "research",
      kernelWriteAvailability: "research",
      payloadCompatibility: "research",
      hardwareVerificationStatus: "upstream-verified",
      evidence: "UPSTREAM-VERIFIED",
      verifiedByKillerNoS: false,
      henAllowed: true,
      researchOnly: false,
      notes: "Configured runtime key exists in NEXT offsets; local hardware validation has not been claimed."
    },
    {
      firmware: "12.00",
      userland: "SlopKit",
      kernel: "Lapse",
      backendLabel: "Lapse",
      runtime: "./runtime/next/run_lapse.html",
      mode: "runtime",
      releaseChannel: "production",
      runtimeFamily: "Lapse",
      userlandEntryAvailability: "supported",
      arbitraryUserlandReadWrite: "supported",
      kernelTriggerAvailability: "supported",
      kernelReadAvailability: "supported",
      kernelWriteAvailability: "supported",
      payloadCompatibility: "compatible",
      hardwareVerificationStatus: "hardware-verified-12.00",
      evidence: "VERIFIED",
      verifiedByKillerNoS: true,
      henAllowed: true,
      researchOnly: false,
      notes: "Only firmware locally hardware-tested in this workspace."
    },
    {
      firmware: "12.02",
      userland: "SlopKit",
      kernel: "Lapse",
      backendLabel: "Lapse",
      runtime: "./runtime/next/run_lapse.html",
      mode: "runtime",
      releaseChannel: "research-testing",
      runtimeFamily: "Lapse",
      userlandEntryAvailability: "source-confirmed",
      arbitraryUserlandReadWrite: "research",
      kernelTriggerAvailability: "research",
      kernelReadAvailability: "research",
      kernelWriteAvailability: "research",
      payloadCompatibility: "research",
      hardwareVerificationStatus: "research",
      evidence: "RESEARCH",
      verifiedByKillerNoS: false,
      henAllowed: true,
      researchOnly: false,
      notes: "Configured runtime key exists; treat as research until independently validated."
    },
    {
      firmware: "12.50",
      userland: "Configured NEXT runtime",
      kernel: "Configured NEXT runtime",
      backendLabel: "NEXT Runtime",
      runtime: "./runtime/compat/index.html",
      mode: "compatibility",
      releaseChannel: "research-testing",
      runtimeFamily: "Lapse",
      userlandEntryAvailability: "research",
      arbitraryUserlandReadWrite: "research",
      kernelTriggerAvailability: "research",
      kernelReadAvailability: "unverified",
      kernelWriteAvailability: "unverified",
      payloadCompatibility: "disabled",
      hardwareVerificationStatus: "research",
      evidence: "RESEARCH",
      verifiedByKillerNoS: false,
      henAllowed: true,
      researchOnly: false,
      notes: "Research and testing metadata only. The public host keeps this firmware on the compatibility probe until a separately verified browser runtime is available."
    },
    {
      firmware: "12.52",
      userland: "Research / Testing",
      kernel: "Lapse Research",
      backendLabel: "Lapse Research",
      runtime: "./runtime/compat/index.html",
      mode: "compatibility",
      releaseChannel: "research-testing",
      runtimeFamily: "Lapse",
      userlandEntryAvailability: "research",
      arbitraryUserlandReadWrite: "research",
      kernelTriggerAvailability: "research",
      kernelReadAvailability: "unverified",
      kernelWriteAvailability: "unverified",
      payloadCompatibility: "disabled",
      hardwareVerificationStatus: "research",
      evidence: "RESEARCH",
      verifiedByKillerNoS: false,
      henAllowed: true,
      researchOnly: false,
      notes: "Research and testing only. Keep payload launch disabled until an independently verified runtime exists for this firmware."
    },
    {
      firmware: "13.00",
      userland: "Research / Testing",
      kernel: "Poops",
      backendLabel: "Poops Research",
      runtime: "./runtime/compat/index.html",
      mode: "compatibility",
      releaseChannel: "research-testing",
      runtimeFamily: "Poops",
      userlandEntryAvailability: "research",
      arbitraryUserlandReadWrite: "research",
      kernelTriggerAvailability: "research",
      kernelReadAvailability: "unverified",
      kernelWriteAvailability: "unverified",
      payloadCompatibility: "disabled",
      hardwareVerificationStatus: "upstream-verified",
      evidence: "UPSTREAM-VERIFIED",
      verifiedByKillerNoS: false,
      henAllowed: true,
      researchOnly: false,
      notes: "Research and testing only. Poops remains a research backend label here, not a browser-launched production chain."
    },
    {
      firmware: "13.02",
      userland: "SlopKit",
      kernel: "LOCKED",
      backendLabel: "NEXT 13.02 Research",
      runtime: "./runtime/next-1302/index.html",
      mode: "research",
      releaseChannel: "research-only",
      runtimeFamily: "Locked",
      userlandEntryAvailability: "research",
      arbitraryUserlandReadWrite: "research",
      kernelTriggerAvailability: "unavailable",
      kernelReadAvailability: "unavailable",
      kernelWriteAvailability: "unavailable",
      payloadCompatibility: "disabled",
      hardwareVerificationStatus: "research",
      featureFlagRequired: "ENABLE_1302_EXPERIMENTAL",
      evidence: "RESEARCH",
      verifiedByKillerNoS: false,
      henAllowed: false,
      researchOnly: true,
      notes: "Userland research laboratory only. Kernel, Celsius, HEN, and GoldHEN remain locked until independently verified."
    }
  ];

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

  function clone(value) {
    var copy = {};
    var key;
    for (key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) copy[key] = value[key];
    }
    return copy;
  }

  function evidenceClass(value) {
    if (value === "VERIFIED") return "LOCAL";
    if (value === "UPSTREAM-VERIFIED") return "COMMUNITY";
    return "UNVERIFIED";
  }

  function findExact(firmware) {
    var normalized = normalizeFirmware(firmware);
    var index;
    for (index = 0; index < capabilityRows.length; index++) {
      if (capabilityRows[index].firmware === normalized) {
        var exact = clone(capabilityRows[index]);
        exact.details = detailedStatus(capabilityRows[index]);
        return exact;
      }
    }
    return null;
  }

  function compatibilityCapability(firmware) {
    return {
      firmware: firmware,
      userland: "Compatibility Probe",
      kernel: "LOCKED",
      runtime: "./runtime/compat/index.html",
      mode: "compatibility",
      releaseChannel: "research-only",
      runtimeFamily: "Compatibility",
      userlandEntryAvailability: "research",
      arbitraryUserlandReadWrite: "unknown",
      kernelTriggerAvailability: "unavailable",
      kernelReadAvailability: "unavailable",
      kernelWriteAvailability: "unavailable",
      payloadCompatibility: "disabled",
      hardwareVerificationStatus: "unknown",
      evidence: "RESEARCH",
      verifiedByKillerNoS: false,
      henAllowed: false,
      researchOnly: true,
      notes: "Unknown firmware below 13.02 opens the compatibility probe and does not guess offsets."
    };
  }

  function unsupportedCapability(firmware) {
    return {
      firmware: firmware || "Unknown",
      userland: "Unknown",
      kernel: "Unknown",
      runtime: "",
      mode: "unsupported",
      releaseChannel: "unsupported",
      runtimeFamily: "Unsupported",
      userlandEntryAvailability: "unknown",
      arbitraryUserlandReadWrite: "unknown",
      kernelTriggerAvailability: "unknown",
      kernelReadAvailability: "unknown",
      kernelWriteAvailability: "unknown",
      payloadCompatibility: "unknown",
      hardwareVerificationStatus: "unknown",
      evidence: "UNKNOWN",
      verifiedByKillerNoS: false,
      henAllowed: false,
      researchOnly: true,
      notes: "No configured runtime or research path is exposed for this firmware."
    };
  }

  function resolve(firmware) {
    var normalized = normalizeFirmware(firmware);
    var exact = normalized ? findExact(normalized) : null;
    if (exact) return exact;
    if (normalized && firmwareNumber(normalized) < firmwareNumber("13.02")) return compatibilityCapability(normalized);
    return unsupportedCapability(normalized);
  }

  window.NEXTCapabilities = {
    all: capabilityRows.slice(),
    normalizeFirmware: normalizeFirmware,
    firmwareNumber: firmwareNumber,
    evidenceClass: evidenceClass,
    detailedStatus: detailedStatus,
    findExact: findExact,
    resolve: resolve
  };
})();