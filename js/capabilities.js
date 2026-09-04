"use strict";

(function () {
  var capabilityRows = [
    {
      firmware: "11.00",
      userland: "SlopKit",
      kernel: "Lapse",
      backendLabel: "Lapse",
      runtime: "./runtime/next/run_lapse.html",
      mode: "runtime",
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
      runtime: "./runtime/next/run_lapse.html",
      mode: "runtime",
      evidence: "RESEARCH",
      verifiedByKillerNoS: false,
      henAllowed: true,
      researchOnly: false,
      notes: "Configured firmware key exists, but the active browser runtime surface is the shared run_lapse.html and chain_lapse.js path. This pass does not claim a distinct browser-exposed Poops/Netctrl launcher file."
    },
    {
      firmware: "12.52",
      userland: "Configured NEXT runtime",
      kernel: "Configured NEXT runtime",
      backendLabel: "NEXT Runtime",
      runtime: "./runtime/next/run_lapse.html",
      mode: "runtime",
      evidence: "RESEARCH",
      verifiedByKillerNoS: false,
      henAllowed: true,
      researchOnly: false,
      notes: "Alias of 12.50 support in current router metadata, using the same shared browser runtime path."
    },
    {
      firmware: "13.00",
      userland: "Configured NEXT runtime",
      kernel: "Configured NEXT runtime",
      backendLabel: "NEXT Runtime",
      runtime: "./runtime/next/run_lapse.html",
      mode: "runtime",
      evidence: "UPSTREAM-VERIFIED",
      verifiedByKillerNoS: false,
      henAllowed: true,
      researchOnly: false,
      notes: "Configured firmware key exists on the shared browser runtime path; do not imply local 13.00 testing or a separate browser Poops entry."
    },
    {
      firmware: "13.02",
      userland: "SlopKit",
      kernel: "LOCKED",
      backendLabel: "NEXT 13.02 Research",
      runtime: "./runtime/next-1302/index.html",
      mode: "research",
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
      if (capabilityRows[index].firmware === normalized) return clone(capabilityRows[index]);
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
    findExact: findExact,
    resolve: resolve
  };
})();