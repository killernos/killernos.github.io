"use strict";

(function () {
  var VALID_VERIFICATION = {
    "hardware-verified-12.00": true,
    "upstream-verified": true,
    "source-confirmed": true,
    research: true,
    unknown: true
  };
  var ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
  var scriptElement = document.currentScript;
  var baseHref = scriptElement && scriptElement.src
    ? new URL("../", scriptElement.src).href
    : new URL("./", location.href).href;
  var catalogAnnounced = false;
  var NO_HEN_ID = "none";
  var LEGACY_NO_HEN_ID = "no-hen";

  function familyLabel(value) {
    var family = String(value || "other").trim();
    if (!family || family === "none") return "No HEN";
    family = family.charAt(0).toUpperCase() + family.slice(1);
    return family.replace(/hen$/i, "HEN");
  }

  function noHenEntry() {
    return {
      id: NO_HEN_ID,
      family: "none",
      name: "No HEN",
      displayName: "No HEN",
      version: null,
      channel: "manual",
      author: "None",
      payloadPath: null,
      file: "",
      loader: "skip",
      byteSize: 0,
      sha256: "",
      supportedFirmware: [],
      supportedFirmwares: [],
      enabled: true,
      recommendedFor: [],
      evidence: "source-confirmed",
      verification: "source-confirmed",
      loaderReference: "skip",
      notes: "Skips HEN loading entirely.",
      compatibilityNote: "Skips HEN loading entirely."
    };
  }

  function toHenEntry(entry) {
    var normalized = entry || {};
    var supportedFirmware = Array.isArray(normalized.supportedFirmware)
      ? normalized.supportedFirmware.slice()
      : (Array.isArray(normalized.supportedFirmwares) ? normalized.supportedFirmwares.slice() : []);
    return {
      id: normalized.id,
      family: normalized.family || "other",
      name: familyLabel(normalized.family),
      displayName: normalized.displayName || familyLabel(normalized.family),
      version: normalized.version || null,
      channel: normalized.channel || "manual",
      author: normalized.author || "Unknown",
      payloadPath: normalized.payloadPath || normalized.file || null,
      file: normalized.file || normalized.payloadPath || "",
      loader: normalized.loader || normalized.loaderReference || "payload-bin",
      byteSize: normalized.byteSize || 0,
      sha256: normalized.sha256 || "",
      supportedFirmware: supportedFirmware,
      supportedFirmwares: supportedFirmware.slice(),
      enabled: normalized.enabled === true,
      recommendedFor: Array.isArray(normalized.recommendedFor) ? normalized.recommendedFor.slice() : [],
      evidence: normalized.evidence || normalized.verification || "unknown",
      verification: normalized.verification || normalized.evidence || "unknown",
      loaderReference: normalized.loaderReference || normalized.loader || "payload-bin",
      notes: normalized.notes || "",
      compatibilityNote: normalized.compatibilityNote || ""
    };
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

  function detectFirmware(userAgent) {
    var match = /PlayStation\s+4[\/ ](\d+)\.(\d+)/.exec(String(userAgent || ""));
    var minor;
    var normalizedMinor;
    if (!match) {
      return {
        firmware: "Unknown",
        firmwareSource: "desktop",
        hardwareDetected: false,
        simulated: false
      };
    }
    minor = parseInt(match[2], 16);
    normalizedMinor = minor.toString(16);
    if (normalizedMinor.length < 2) normalizedMinor = "0" + normalizedMinor;
    return {
      firmware: normalizeFirmware(match[1] + "." + normalizedMinor),
      firmwareSource: "user-agent",
      hardwareDetected: true,
      simulated: false
    };
  }

  function currentFirmware() {
    return detectFirmware(navigator.userAgent || "");
  }

  function currentDiag() {
    return window.PS4Diag || null;
  }

  function markPayload(entry, firmwareCompatible, actualSize, actualSha256) {
    var diag = currentDiag();
    if (!diag || typeof diag.markPayload !== "function") return;
    diag.markPayload({
      id: entry.id,
      displayName: entry.displayName,
      version: entry.version,
      path: entry.file,
      verificationStatus: entry.verification,
      byteSize: entry.byteSize,
      sha256: entry.sha256,
      firmwareCompatible: firmwareCompatible,
      recommended: isRecommended(entry, currentFirmware().firmware),
      actualSize: actualSize,
      actualSha256: actualSha256
    });
  }

  function markHen(entry, status, errorText, requested, attempted, firmwareCompatible) {
    var diag = currentDiag();
    if (!diag || typeof diag.markHen !== "function") return;
    diag.markHen({
      selection: entry && entry.id ? entry.id : NO_HEN_ID,
      displayName: entry && entry.displayName ? entry.displayName : "No HEN",
      identifier: entry && entry.id ? entry.id : NO_HEN_ID,
      loaderReference: entry && entry.file ? entry.file : "skip",
      compatibility: entry && Array.isArray(entry.supportedFirmwares) ? entry.supportedFirmwares.join(", ") : "skipped",
      requested: !!requested,
      attempted: !!attempted,
      status: status || "UNKNOWN",
      error: errorText || ""
    });
    if (entry && !isNoHenSelection(entry) && typeof diag.markPayload === "function") {
      diag.markPayload({
        id: entry.id,
        displayName: entry.displayName,
        version: entry.version,
        path: entry.file,
        verificationStatus: entry.verification,
        byteSize: entry.byteSize,
        sha256: entry.sha256,
        firmwareCompatible: !!firmwareCompatible,
        recommended: isRecommended(entry, currentFirmware().firmware)
      });
    }
  }

  function emit(stage, message, details) {
    var diag = currentDiag();
    var method = /FAIL|INCOMPATIBLE|VALIDATION/.test(stage) ? "fail" : /PASS|COMPATIBLE|LOADED|BEGIN|UNAVAILABLE/.test(stage) ? "pass" : "info";
    if (!diag || typeof diag[method] !== "function") return;
    diag[method](stage, message, details || {});
  }

  function getCatalog() {
    var catalog = Array.isArray(window.PS4PayloadCatalog) ? window.PS4PayloadCatalog.slice() : [];
    var index;
    for (index = 0; index < catalog.length; index++) catalog[index] = toHenEntry(catalog[index]);
    if (!catalogAnnounced && catalog.length) {
      catalogAnnounced = true;
      emit("PAYLOAD-CATALOG-LOADED", catalog.length + " payload definitions available.", {
        category: "PAYLOAD",
        payloadCount: catalog.length
      });
    }
    return catalog;
  }

  function getById(id) {
    var catalog = getCatalog();
    var index;
    for (index = 0; index < catalog.length; index++) {
      if (catalog[index].id === id) return catalog[index];
    }
    return null;
  }

  function isNoHenSelection(value) {
    var id = typeof value === "string" ? value : value && value.id;
    id = String(id || "").trim();
    return id === NO_HEN_ID || id === LEGACY_NO_HEN_ID;
  }

  function getSelectionById(id) {
    if (isNoHenSelection(id)) return noHenEntry();
    return getById(id);
  }

  function getHenRegistry() {
    var catalog = getCatalog();
    var result = [noHenEntry()];
    var index;
    for (index = 0; index < catalog.length; index++) {
      if (catalog[index] && catalog[index].enabled === true) result.push(catalog[index]);
    }
    return result;
  }

  function getHenCatalog() {
    return getHenRegistry();
  }

  function defaultSelectionId() {
    var catalog = getCatalog();
    var index;
    for (index = 0; index < catalog.length; index++) {
      if (catalog[index] && catalog[index].defaultSelection === true) return catalog[index].id;
    }
    for (index = catalog.length - 1; index >= 0; index--) {
      if (catalog[index] && catalog[index].enabled === true) return catalog[index].id;
    }
    return NO_HEN_ID;
  }

  function isCompatible(entry, firmware) {
    var normalized = normalizeFirmware(firmware);
    var index;
    var supported = entry && (entry.supportedFirmware || entry.supportedFirmwares);
    if (!entry || !Array.isArray(supported)) return false;
    for (index = 0; index < supported.length; index++) {
      if (normalizeFirmware(supported[index]) === normalized) return true;
    }
    return false;
  }

  function compatibilityState(entry, firmware) {
    var normalized = normalizeFirmware(firmware);
    var supported = entry && (entry.supportedFirmware || entry.supportedFirmwares);
    if (!entry) return "MISSING";
    if (isNoHenSelection(entry)) return "AVAILABLE";
    if (entry.enabled !== true) return "DISABLED";
    if (!entry.payloadPath && !entry.file) return "MISSING";
    if (!normalized || normalized === "Unknown") return "UNVERIFIED";
    if (!Array.isArray(supported) || !supported.length) return "UNVERIFIED";
    return isCompatible(entry, normalized) ? "COMPATIBLE" : "INCOMPATIBLE";
  }

  function compatibilityMessage(entry, firmware) {
    var state = compatibilityState(entry, firmware);
    if (state === "AVAILABLE") return isNoHenSelection(entry) ? "HEN loading will be skipped." : "Firmware-specific compatibility will be checked at launch time.";
    if (state === "COMPATIBLE") return "Compatible with firmware " + normalizeFirmware(firmware) + ".";
    if (state === "UNVERIFIED") return "Compatibility not verified for this firmware.";
    if (state === "INCOMPATIBLE") return "Not compatible with firmware " + normalizeFirmware(firmware) + ".";
    if (state === "DISABLED") return "This HEN entry is disabled in the local registry.";
    return "Configured payload is missing.";
  }

  function isRecommended(entry, firmware) {
    var normalized = normalizeFirmware(firmware);
    var index;
    if (!entry || !Array.isArray(entry.recommendedFor)) return false;
    for (index = 0; index < entry.recommendedFor.length; index++) {
      if (normalizeFirmware(entry.recommendedFor[index]) === normalized) return true;
    }
    return false;
  }

  function getRecommendedForFirmware(firmware) {
    var catalog = getCatalog();
    var index;
    for (index = 0; index < catalog.length; index++) {
      if (isRecommended(catalog[index], firmware)) return catalog[index];
    }
    return null;
  }

  function parsePayloadId(search) {
    var params = new URLSearchParams(search || location.search || "");
    var payloadId = String(params.get("payloadId") || "").trim();
    if (!payloadId) return "";
    if (/pppnw|stage2/i.test(payloadId)) {
      throw new Error("PPPwn reference files are not valid payload selections.");
    }
    if (!ID_PATTERN.test(payloadId)) {
      throw new Error("Invalid payloadId format.");
    }
    return payloadId;
  }

  function payloadUrl(entry) {
    return new URL(entry.file, baseHref).href;
  }

  function runtimeQuery(relativeRuntimePath, options) {
    var url = new URL(relativeRuntimePath, location.href);
    var current = new URLSearchParams(location.search || "");
    var payloadId = options && options.payloadId ? String(options.payloadId) : "";
    var previewMode = current.get("preview") === "1";
    current.forEach(function (value, key) {
      if (key === "preview") return;
      if (previewMode && key === "fw") return;
      url.searchParams.set(key, value);
    });
    if (payloadId) url.searchParams.set("payloadId", payloadId);
    return url.pathname + url.search;
  }

  function toHex(buffer) {
    var bytes = new Uint8Array(buffer);
    var parts = [];
    var index;
    for (index = 0; index < bytes.length; index++) {
      parts.push((bytes[index] < 16 ? "0" : "") + bytes[index].toString(16));
    }
    return parts.join("");
  }

  function digestSha256(buffer) {
    if (!window.crypto || !window.crypto.subtle || typeof window.crypto.subtle.digest !== "function") {
      return Promise.resolve(null);
    }
    return window.crypto.subtle.digest("SHA-256", buffer).then(function (hashBuffer) {
      return toHex(hashBuffer);
    });
  }

  function validateCatalog(catalog) {
    var errors = [];
    var idSeen = {};
    var fileSeen = {};
    var recommendedSeen = {};
    var index;
    var firmwareIndex;
    for (index = 0; index < catalog.length; index++) {
      var entry = catalog[index];
      if (!entry || typeof entry !== "object") {
        errors.push("Catalog entry " + index + " is not an object.");
        continue;
      }
      if (!entry.id || !ID_PATTERN.test(entry.id)) errors.push("Invalid payload ID: " + entry.id);
      if (idSeen[entry.id]) errors.push("Duplicate payload ID: " + entry.id);
      idSeen[entry.id] = true;
      if (!entry.file || /pppnw|stage2/i.test(entry.file)) errors.push("Invalid payload filename for " + entry.id + ": " + entry.file);
      if (fileSeen[entry.file]) errors.push("Duplicate payload filename: " + entry.file);
      fileSeen[entry.file] = true;
      if (!/^[a-f0-9]{64}$/.test(String(entry.sha256 || ""))) errors.push("Invalid SHA-256 for " + entry.id);
      if (!VALID_VERIFICATION[entry.verification]) errors.push("Unknown verification label for " + entry.id + ": " + entry.verification);
      if (Array.isArray(entry.recommendedFor)) {
        for (firmwareIndex = 0; firmwareIndex < entry.recommendedFor.length; firmwareIndex++) {
          var firmware = normalizeFirmware(entry.recommendedFor[firmwareIndex]);
          if (recommendedSeen[firmware]) errors.push("Multiple recommended payloads for firmware " + firmware);
          recommendedSeen[firmware] = entry.id;
        }
      }
    }
    return errors;
  }

  function resolveSelection(options) {
    var payloadId = "";
    var entry;
    var firmwareInfo = currentFirmware();
    var compatible;

    try {
      payloadId = options && options.payloadId ? String(options.payloadId) : parsePayloadId(options && options.search ? options.search : location.search);
    } catch (error) {
      markHen({ id: options && options.payloadId ? String(options.payloadId) : "unknown", displayName: options && options.payloadId ? String(options.payloadId) : "Unknown HEN", file: "" }, "INVALID", error.message, true, false, false);
      emit("PAYLOAD-VALIDATION-FAILED", error.message, {
        category: "PAYLOAD",
        payloadId: options && options.payloadId ? String(options.payloadId) : "",
        payloadFirmwareCompatible: false
      });
      throw error;
    }

    if (!payloadId) payloadId = defaultSelectionId();

    entry = getSelectionById(payloadId);
    if (!entry) {
      markHen({ id: payloadId, displayName: payloadId || "Unknown HEN", file: "" }, "UNAVAILABLE", "Unknown payloadId.", true, false, false);
      emit("PAYLOAD-VALIDATION-FAILED", "Unknown payloadId.", {
        category: "PAYLOAD",
        payloadId: payloadId,
        payloadFirmwareCompatible: false
      });
      throw new Error("Unknown payloadId.");
    }
    if (entry.enabled !== true) {
      markHen(entry, "UNAVAILABLE", "Selected payload is disabled.", true, false, false);
      emit("PAYLOAD-VALIDATION-FAILED", "Selected payload is disabled.", {
        category: "PAYLOAD",
        payloadId: payloadId,
        payloadFilename: entry.file,
        payloadFirmwareCompatible: false
      });
      throw new Error("Selected payload is disabled.");
    }

    if (isNoHenSelection(entry)) {
      markHen(entry, "SKIPPED", "", false, false, true);
      emit("HEN-LOAD-SKIPPED", "No HEN selected. Runtime will continue without loading a HEN payload.", {
        category: "PAYLOAD",
        henSelection: entry.id,
        henDisplayName: entry.displayName,
        henIdentifier: entry.id,
        henLoadRequested: false,
        henLoadAttempted: false,
        henLoadStatus: "SKIPPED",
        henLoadError: ""
      });
      return {
        entry: entry,
        firmware: firmwareInfo,
        url: "",
        skipLoad: true
      };
    }

    compatible = isCompatible(entry, firmwareInfo.firmware);
    emit("HEN-COMPATIBILITY-CHECK", compatibilityMessage(entry, firmwareInfo.firmware), {
      category: "PAYLOAD",
      henFamily: entry.family,
      henIdentifier: entry.id,
      henDisplayName: entry.displayName,
      henVersion: entry.version,
      henPayloadPath: entry.payloadPath,
      henCompatibility: compatibilityState(entry, firmwareInfo.firmware),
      henEvidence: entry.evidence,
      firmware: firmwareInfo.firmware
    });
    markHen(entry, compatible ? "SELECTED" : "INCOMPATIBLE", compatible ? "" : "Selected payload is not compatible with the detected firmware.", true, false, compatible);
    markPayload(entry, compatible, 0, "");
    emit(compatible ? "HEN-SELECTED" : "HEN-COMPATIBILITY-CHECK", compatible
      ? entry.displayName + " is compatible with " + firmwareInfo.firmware + "."
      : entry.displayName + " is not compatible with " + firmwareInfo.firmware + ".", {
      category: "PAYLOAD",
      payloadId: entry.id,
      payloadVersion: entry.version,
      payloadFilename: entry.file,
      payloadExpectedSize: entry.byteSize,
      payloadExpectedSha256: entry.sha256,
      payloadFirmwareCompatible: compatible,
      payloadRecommended: isRecommended(entry, firmwareInfo.firmware),
      payloadVerification: entry.verification,
      henFamily: entry.family,
      henIdentifier: entry.id,
      henDisplayName: entry.displayName,
      henVersion: entry.version,
      henPayloadPath: entry.payloadPath,
      henCompatibility: compatibilityState(entry, firmwareInfo.firmware),
      henEvidence: entry.evidence,
      firmware: firmwareInfo.firmware
    });
    if (!compatible) {
      throw new Error("Selected payload is not compatible with the detected firmware.");
    }

    return {
      entry: entry,
      firmware: firmwareInfo,
      url: payloadUrl(entry)
    };
  }

  function loadSelectedPayload(options) {
    var resolved;
    try {
      resolved = resolveSelection(options || {});
    } catch (error) {
      return Promise.reject(error);
    }

    if (resolved.skipLoad) {
      return Promise.resolve(null);
    }

    emit("HEN-LOAD-REQUESTED", "Runtime requested the selected HEN payload.", {
      category: "PAYLOAD",
      henFamily: resolved.entry.family,
      henIdentifier: resolved.entry.id,
      henDisplayName: resolved.entry.displayName,
      henVersion: resolved.entry.version,
      henPayloadPath: resolved.entry.payloadPath,
      henCompatibility: compatibilityState(resolved.entry, resolved.firmware.firmware),
      henEvidence: resolved.entry.evidence
    });
    markHen(resolved.entry, "LOAD-REQUESTED", "", true, true, true);
    emit("HEN-LOAD-BEGIN", "Fetching selected HEN payload binary.", {
      category: "PAYLOAD",
      henFamily: resolved.entry.family,
      henIdentifier: resolved.entry.id,
      henDisplayName: resolved.entry.displayName,
      henVersion: resolved.entry.version,
      henPayloadPath: resolved.entry.payloadPath,
      henCompatibility: compatibilityState(resolved.entry, resolved.firmware.firmware),
      henEvidence: resolved.entry.evidence
    });

    emit("PAYLOAD-BEGIN", "Validated payload selection before runtime execution.", {
      category: "PAYLOAD",
      payloadId: resolved.entry.id,
      payloadVersion: resolved.entry.version,
      payloadFilename: resolved.entry.file,
      payloadExpectedSize: resolved.entry.byteSize,
      payloadExpectedSha256: resolved.entry.sha256,
      payloadFirmwareCompatible: true,
      payloadRecommended: isRecommended(resolved.entry, resolved.firmware.firmware),
      payloadVerification: resolved.entry.verification
    });
    emit("PAYLOAD-FETCH-BEGIN", "Fetching selected payload binary.", {
      category: "PAYLOAD",
      payloadId: resolved.entry.id,
      payloadVersion: resolved.entry.version,
      payloadFilename: resolved.entry.file,
      payloadExpectedSize: resolved.entry.byteSize,
      payloadExpectedSha256: resolved.entry.sha256,
      payloadFirmwareCompatible: true,
      payloadRecommended: isRecommended(resolved.entry, resolved.firmware.firmware),
      payloadVerification: resolved.entry.verification
    });

    return fetch(resolved.url).then(function (response) {
      if (!response || !response.ok) {
        markHen(resolved.entry, "LOAD-FAILED", "Payload request failed.", true, true, true);
        emit("HEN-LOAD-FAIL", "Selected HEN payload request failed.", {
          category: "PAYLOAD",
          henFamily: resolved.entry.family,
          henIdentifier: resolved.entry.id,
          henDisplayName: resolved.entry.displayName,
          henVersion: resolved.entry.version,
          henPayloadPath: resolved.entry.payloadPath,
          henCompatibility: compatibilityState(resolved.entry, resolved.firmware.firmware),
          henEvidence: resolved.entry.evidence
        });
        emit("PAYLOAD-VALIDATION-FAILED", "Payload request failed with HTTP " + (response ? response.status : 0) + ".", {
          category: "PAYLOAD",
          payloadId: resolved.entry.id,
          payloadVersion: resolved.entry.version,
          payloadFilename: resolved.entry.file,
          payloadExpectedSize: resolved.entry.byteSize,
          payloadExpectedSha256: resolved.entry.sha256,
          payloadFirmwareCompatible: true,
          payloadRecommended: isRecommended(resolved.entry, resolved.firmware.firmware),
          payloadVerification: resolved.entry.verification
        });
        throw new Error("Payload request failed.");
      }
      return response.arrayBuffer();
    }).then(function (buffer) {
      var payload = new Uint8Array(buffer);
      emit("PAYLOAD-FETCH-PASS", "Payload bytes fetched successfully.", {
        category: "PAYLOAD",
        payloadId: resolved.entry.id,
        payloadVersion: resolved.entry.version,
        payloadFilename: resolved.entry.file,
        payloadExpectedSize: resolved.entry.byteSize,
        payloadActualSize: payload.byteLength,
        payloadExpectedSha256: resolved.entry.sha256,
        payloadFirmwareCompatible: true,
        payloadRecommended: isRecommended(resolved.entry, resolved.firmware.firmware),
        payloadVerification: resolved.entry.verification
      });
      if (payload.byteLength !== resolved.entry.byteSize) {
        markHen(resolved.entry, "LOAD-FAILED", "Payload size mismatch.", true, true, true);
        emit("HEN-LOAD-FAIL", "Selected HEN payload size mismatch.", {
          category: "PAYLOAD",
          henFamily: resolved.entry.family,
          henIdentifier: resolved.entry.id,
          henDisplayName: resolved.entry.displayName,
          henVersion: resolved.entry.version,
          henPayloadPath: resolved.entry.payloadPath,
          henCompatibility: compatibilityState(resolved.entry, resolved.firmware.firmware),
          henEvidence: resolved.entry.evidence
        });
        emit("PAYLOAD-VALIDATION-FAILED", "Payload size mismatch.", {
          category: "PAYLOAD",
          payloadId: resolved.entry.id,
          payloadVersion: resolved.entry.version,
          payloadFilename: resolved.entry.file,
          payloadExpectedSize: resolved.entry.byteSize,
          payloadActualSize: payload.byteLength,
          payloadExpectedSha256: resolved.entry.sha256,
          payloadFirmwareCompatible: true,
          payloadRecommended: isRecommended(resolved.entry, resolved.firmware.firmware),
          payloadVerification: resolved.entry.verification
        });
        throw new Error("Payload size mismatch.");
      }
      emit("PAYLOAD-SIZE-PASS", "Payload size matched the catalog.", {
        category: "PAYLOAD",
        payloadId: resolved.entry.id,
        payloadVersion: resolved.entry.version,
        payloadFilename: resolved.entry.file,
        payloadExpectedSize: resolved.entry.byteSize,
        payloadActualSize: payload.byteLength,
        payloadExpectedSha256: resolved.entry.sha256,
        payloadFirmwareCompatible: true,
        payloadRecommended: isRecommended(resolved.entry, resolved.firmware.firmware),
        payloadVerification: resolved.entry.verification
      });
      return digestSha256(buffer).then(function (actualSha256) {
        if (!actualSha256) {
          markHen(resolved.entry, "LOAD-SUCCESS", "", true, true, true);
          emit("HEN-LOAD-SUCCESS", "Selected HEN payload fetched and validated.", {
            category: "PAYLOAD",
            henFamily: resolved.entry.family,
            henIdentifier: resolved.entry.id,
            henDisplayName: resolved.entry.displayName,
            henVersion: resolved.entry.version,
            henPayloadPath: resolved.entry.payloadPath,
            henCompatibility: compatibilityState(resolved.entry, resolved.firmware.firmware),
            henEvidence: resolved.entry.evidence
          });
          markPayload(resolved.entry, true, payload.byteLength, "");
          emit("PAYLOAD-HASH-UNAVAILABLE", "Web Crypto SHA-256 verification is unavailable in this browser.", {
            category: "PAYLOAD",
            payloadId: resolved.entry.id,
            payloadVersion: resolved.entry.version,
            payloadFilename: resolved.entry.file,
            payloadExpectedSize: resolved.entry.byteSize,
            payloadActualSize: payload.byteLength,
            payloadExpectedSha256: resolved.entry.sha256,
            payloadFirmwareCompatible: true,
            payloadRecommended: isRecommended(resolved.entry, resolved.firmware.firmware),
            payloadVerification: resolved.entry.verification
          });
          emit("PAYLOAD-PASS", "Payload is ready for the existing execution path.", {
            category: "PAYLOAD",
            payloadId: resolved.entry.id,
            payloadVersion: resolved.entry.version,
            payloadFilename: resolved.entry.file,
            payloadExpectedSize: resolved.entry.byteSize,
            payloadActualSize: payload.byteLength,
            payloadExpectedSha256: resolved.entry.sha256,
            payloadFirmwareCompatible: true,
            payloadRecommended: isRecommended(resolved.entry, resolved.firmware.firmware),
            payloadVerification: resolved.entry.verification
          });
          return payload;
        }
        if (actualSha256 !== resolved.entry.sha256) {
          markHen(resolved.entry, "LOAD-FAILED", "Payload hash mismatch.", true, true, true);
          emit("HEN-LOAD-FAIL", "Selected HEN payload hash mismatch.", {
            category: "PAYLOAD",
            henFamily: resolved.entry.family,
            henIdentifier: resolved.entry.id,
            henDisplayName: resolved.entry.displayName,
            henVersion: resolved.entry.version,
            henPayloadPath: resolved.entry.payloadPath,
            henCompatibility: compatibilityState(resolved.entry, resolved.firmware.firmware),
            henEvidence: resolved.entry.evidence
          });
          markPayload(resolved.entry, true, payload.byteLength, actualSha256);
          emit("PAYLOAD-VALIDATION-FAILED", "Payload hash mismatch.", {
            category: "PAYLOAD",
            payloadId: resolved.entry.id,
            payloadVersion: resolved.entry.version,
            payloadFilename: resolved.entry.file,
            payloadExpectedSize: resolved.entry.byteSize,
            payloadActualSize: payload.byteLength,
            payloadExpectedSha256: resolved.entry.sha256,
            payloadActualSha256: actualSha256,
            payloadFirmwareCompatible: true,
            payloadRecommended: isRecommended(resolved.entry, resolved.firmware.firmware),
            payloadVerification: resolved.entry.verification
          });
          throw new Error("Payload hash mismatch.");
        }
        markHen(resolved.entry, "LOAD-SUCCESS", "", true, true, true);
        emit("HEN-LOAD-SUCCESS", "Selected HEN payload fetched and validated.", {
          category: "PAYLOAD",
          henFamily: resolved.entry.family,
          henIdentifier: resolved.entry.id,
          henDisplayName: resolved.entry.displayName,
          henVersion: resolved.entry.version,
          henPayloadPath: resolved.entry.payloadPath,
          henCompatibility: compatibilityState(resolved.entry, resolved.firmware.firmware),
          henEvidence: resolved.entry.evidence
        });
        markPayload(resolved.entry, true, payload.byteLength, actualSha256);
        emit("PAYLOAD-HASH-PASS", "Payload SHA-256 matched the catalog.", {
          category: "PAYLOAD",
          payloadId: resolved.entry.id,
          payloadVersion: resolved.entry.version,
          payloadFilename: resolved.entry.file,
          payloadExpectedSize: resolved.entry.byteSize,
          payloadActualSize: payload.byteLength,
          payloadExpectedSha256: resolved.entry.sha256,
          payloadActualSha256: actualSha256,
          payloadFirmwareCompatible: true,
          payloadRecommended: isRecommended(resolved.entry, resolved.firmware.firmware),
          payloadVerification: resolved.entry.verification
        });
        emit("PAYLOAD-PASS", "Payload is ready for the existing execution path.", {
          category: "PAYLOAD",
          payloadId: resolved.entry.id,
          payloadVersion: resolved.entry.version,
          payloadFilename: resolved.entry.file,
          payloadExpectedSize: resolved.entry.byteSize,
          payloadActualSize: payload.byteLength,
          payloadExpectedSha256: resolved.entry.sha256,
          payloadActualSha256: actualSha256,
          payloadFirmwareCompatible: true,
          payloadRecommended: isRecommended(resolved.entry, resolved.firmware.firmware),
          payloadVerification: resolved.entry.verification
        });
        return payload;
      });
    });
  }

  window.PS4PayloadLoader = {
    baseHref: baseHref,
    normalizeFirmware: normalizeFirmware,
    detectFirmware: detectFirmware,
    currentFirmware: currentFirmware,
    getCatalog: getCatalog,
    getHenCatalog: getHenCatalog,
    getHenRegistry: getHenRegistry,
    getById: getById,
    getSelectionById: getSelectionById,
    getRecommendedForFirmware: getRecommendedForFirmware,
    isCompatible: isCompatible,
    compatibilityState: compatibilityState,
    compatibilityMessage: compatibilityMessage,
    isNoHenSelection: isNoHenSelection,
    isRecommended: isRecommended,
    defaultSelectionId: defaultSelectionId,
    parsePayloadId: parsePayloadId,
    payloadUrl: payloadUrl,
    runtimeQuery: runtimeQuery,
    validateCatalog: validateCatalog,
    resolveSelection: resolveSelection,
    loadSelectedPayload: loadSelectedPayload
  };

  window.NEXTHENRegistry = getHenRegistry();
})();