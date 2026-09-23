(function (root) {
  "use strict";

  var SCHEMA = "next-raw13g-stability-1";
  var STORAGE_KEY = "ps4next.raw13g.stability.v1";
  var SESSION_MS = 30 * 60 * 1000;
  var MAX_RECORDS = 100;
  var SUPPORTED = ["13.02", "13.04", "13.50", "13.52"];
  var PROFILES = {
    conservative: { attemptLimit: 2, cooldownMs: 30000 },
    balanced: { attemptLimit: 3, cooldownMs: 15000 },
    aggressive: { attemptLimit: 5, cooldownMs: 5000 }
  };
  var PAYLOADS = {
    "/payloads/goldhen/goldhen-2.4b18.12.bin": {
      label: "GoldHEN v2.4b18.12",
      size: 293120,
      sha256: "df3f27c1b35bc7c40e3a08caab948930914dc7d0301a73b68945cf6ffe40ea12"
    },
    "goldhen.bin": {
      label: "GoldHEN v2.4b18.11",
      size: 291072,
      sha256: "48d46667249330c9be48c96a2a3a2dab4464dababa8fcb3e38170c98caf3851f"
    },
    "payload2.bin": {
      label: "PS4 HEN 2.2.0",
      size: 311744,
      sha256: "fab982aea6c9b2aa9d590eae4adb1530f7b4ccd32322c097d6e3c2527bbd6135"
    }
  };
  var KPATCHES = {
    "13.02": { aio: { file: "1302-aio.bin", size: 632, sha256: "235a051f5a066daa546253de6eb61c1223a2682cb34edd916fc4565bb2c02fc6" } },
    "13.04": { aio: { file: "1302-aio.bin", size: 632, sha256: "235a051f5a066daa546253de6eb61c1223a2682cb34edd916fc4565bb2c02fc6" } },
    "13.50": { aio: { file: "1350-aio.bin", size: 632, sha256: "f771c196d012496c01f575674e95a74d7b00b7c1bc22325c7321f3ab6eb77b56" } },
    "13.52": { aio: { file: "1352-aio.bin", size: 632, sha256: "adfb9771904f71cd1f5a82cbded8ac46c7ffeb3df974579535cf711904ac347e" } }
  };
  var STAGES = {
    "FW": "firmware",
    "PRIMITIVE-OK": "userland-primitive",
    "PR-PASSA": "kernel-pass-a",
    "PR-PASSB": "kernel-pass-b",
    "ANCHOR-VERDICT": "kernel-anchor",
    "KRW-VERDICT": "kernel-rw-validation",
    "JB-ROOT": "credential-patch",
    "KPATCH-COPY": "kernel-patch-copy",
    "PAYLOAD-COPY": "payload-copy",
    "PAYLOAD-RUN": "payload-run",
    "EG-VERDICT": "final-verdict",
    "THREW": "exception",
    "PROOF-SUMMARY-FINAL": "final-summary"
  };

  function now() { return Date.now ? Date.now() : +new Date(); }
  function cleanProfile(value) {
    return Object.prototype.hasOwnProperty.call(PROFILES, value) ? value : "aggressive";
  }
  function cleanMode(value) { return value === "clean" ? "clean" : "guarded"; }
  function cleanFirmware(value) {
    value = String(value || "");
    return SUPPORTED.indexOf(value) >= 0 ? value : "unsupported";
  }
  function cleanPayload(value) {
    return Object.prototype.hasOwnProperty.call(PAYLOADS, value) ? value : "unknown";
  }
  function cleanKpatch(value) { return value === "aio" ? "aio" : "standard"; }
  function emptyStore() {
    return { schema: SCHEMA, records: [], active: null };
  }
  function load() {
    try {
      var parsed = JSON.parse(root.localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || parsed.schema !== SCHEMA || !Array.isArray(parsed.records)) return emptyStore();
      parsed.records = parsed.records.slice(-MAX_RECORDS);
      return parsed;
    } catch (e) {
      return emptyStore();
    }
  }
  function save(store) {
    try {
      store.records = store.records.slice(-MAX_RECORDS);
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return true;
    } catch (e) {
      return false;
    }
  }
  function id() {
    return "a-" + now().toString(36) + "-" + Math.floor(Math.random() * 0x100000).toString(36);
  }
  function append(store, record) {
    store.records.push(record);
    store.records = store.records.slice(-MAX_RECORDS);
  }
  function finalize(store, outcome, reason) {
    if (!store.active) return null;
    var record = store.active;
    record.endedAt = now();
    record.durationMs = Math.max(0, record.endedAt - record.startedAt);
    record.outcome = outcome;
    record.reason = reason || "";
    append(store, record);
    store.active = null;
    save(store);
    return record;
  }
  function recoverPrevious() {
    var store = load();
    if (!store.active) return null;
    return finalize(store, "incomplete", "previous-session-ended");
  }
  function recent(firmware, profile, mode) {
    var since = now() - SESSION_MS;
    return load().records.filter(function (r) {
      return r.startedAt >= since && r.firmware === firmware &&
        r.profile === profile && r.mode === mode && r.outcome !== "cancelled";
    });
  }
  function canStart(firmware, profile, mode) {
    firmware = cleanFirmware(firmware);
    profile = cleanProfile(profile);
    mode = cleanMode(mode);
    if (firmware === "unsupported") return { ok: false, reason: "unsupported-firmware", retryAfterMs: 0 };
    var policy = PROFILES[profile];
    var records = recent(firmware, profile, mode);
    var last = records.length ? records[records.length - 1] : null;
    var retryAfter = last ? Math.max(0, policy.cooldownMs - (now() - last.endedAt)) : 0;
    if (records.length >= policy.attemptLimit) {
      var retryWindow = Math.max(0, SESSION_MS - (now() - records[0].startedAt));
      return { ok: false, reason: "attempt-limit", retryAfterMs: retryWindow, attempts: records.length, limit: policy.attemptLimit };
    }
    if (retryAfter > 0) {
      return { ok: false, reason: "cooldown", retryAfterMs: retryAfter, attempts: records.length, limit: policy.attemptLimit };
    }
    return { ok: true, reason: "ready", retryAfterMs: 0, attempts: records.length, limit: policy.attemptLimit };
  }
  function begin(meta) {
    var firmware = cleanFirmware(meta && meta.firmware);
    var profile = cleanProfile(meta && meta.profile);
    var mode = cleanMode(meta && meta.mode);
    var gate = canStart(firmware, profile, mode);
    if (!gate.ok) return { ok: false, gate: gate };
    var store = load();
    var record = {
      schema: SCHEMA,
      id: id(),
      buildId: "next-universal-1302-1352-research-0025",
      firmware: firmware,
      payload: cleanPayload(meta && meta.payload),
      kpatch: cleanKpatch(meta && meta.kpatch),
      profile: profile,
      mode: mode,
      startedAt: now(),
      endedAt: null,
      durationMs: null,
      stage: "launch-armed",
      stageAt: now(),
      outcome: "active",
      reason: "",
      integrity: meta && meta.integrity === "sha256" ? "sha256" : "size+magic"
    };
    store.active = record;
    save(store);
    return { ok: true, record: record, gate: gate };
  }
  function checkpoint(tag) {
    var stage = STAGES[String(tag || "")];
    if (!stage) return false;
    var store = load();
    if (!store.active || store.active.mode !== "guarded") return false;
    if (stage === store.active.stage) return false;
    store.active.stage = stage;
    store.active.stageAt = now();
    return save(store);
  }
  function complete(ok) {
    var store = load();
    return finalize(store, ok ? "success" : "failure", ok ? "payload-running" : "runtime-finished-without-payload");
  }
  function cancel(reason) {
    var store = load();
    return finalize(store, "cancelled", reason || "user-cancelled");
  }
  function reset() {
    try { root.localStorage.removeItem(STORAGE_KEY); return true; } catch (e) { return false; }
  }
  function report() {
    var store = load();
    var summary = {};
    store.records.forEach(function (r) {
      var kpatch = cleanKpatch(r.kpatch);
      var key = [r.firmware, r.profile, r.mode, r.payload, kpatch].join("|");
      if (!summary[key]) summary[key] = { firmware: r.firmware, profile: r.profile, mode: r.mode, payload: r.payload, kpatch: kpatch, attempts: 0, success: 0, failure: 0, incomplete: 0 };
      summary[key].attempts++;
      if (r.outcome === "success") summary[key].success++;
      else if (r.outcome === "failure") summary[key].failure++;
      else if (r.outcome === "incomplete") summary[key].incomplete++;
    });
    return {
      schema: SCHEMA,
      generatedAt: new Date().toISOString(),
      privacy: "coarse stages only; no addresses or exploit details",
      records: store.records,
      active: store.active,
      summary: Object.keys(summary).map(function (k) { return summary[k]; })
    };
  }
  function toHex(buffer) {
    var bytes = new Uint8Array(buffer), out = "", i;
    for (i = 0; i < bytes.length; i++) out += ("0" + bytes[i].toString(16)).slice(-2);
    return out;
  }
  function validatePayload(name, done) {
    var expected = PAYLOADS[name];
    if (!expected) { done({ ok: false, reason: "unknown-payload" }); return; }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "./" + name, true);
    xhr.responseType = "arraybuffer";
    xhr.timeout = 20000;
    xhr.onerror = function () { done({ ok: false, reason: "payload-fetch-error" }); };
    xhr.ontimeout = function () { done({ ok: false, reason: "payload-fetch-timeout" }); };
    xhr.onload = function () {
      var buffer = xhr.response;
      if (xhr.status && xhr.status !== 200) { done({ ok: false, reason: "payload-http-" + xhr.status }); return; }
      if (!buffer || buffer.byteLength !== expected.size) { done({ ok: false, reason: "payload-size-mismatch", expectedSize: expected.size, actualSize: buffer ? buffer.byteLength : 0 }); return; }
      var bytes = new Uint8Array(buffer);
      if (!bytes.length || bytes[0] !== 0xe9) { done({ ok: false, reason: "payload-magic-mismatch" }); return; }
      if (root.crypto && root.crypto.subtle && root.crypto.subtle.digest) {
        root.crypto.subtle.digest("SHA-256", buffer).then(function (digest) {
          var actual = toHex(digest);
          done({ ok: actual === expected.sha256, reason: actual === expected.sha256 ? "verified" : "payload-sha256-mismatch", integrity: "sha256", sha256: actual });
        }, function () {
          done({ ok: true, reason: "verified-size-magic", integrity: "size+magic", sha256: expected.sha256 });
        });
      } else {
        done({ ok: true, reason: "verified-size-magic", integrity: "size+magic", sha256: expected.sha256 });
      }
    };
    xhr.send();
  }

  function validateKpatch(firmware, profile, done) {
    firmware = cleanFirmware(firmware);
    profile = cleanKpatch(profile);
    if (profile === "standard") { done({ ok: true, reason: "standard-profile", integrity: "existing-blob" }); return; }
    var expected = KPATCHES[firmware] && KPATCHES[firmware][profile];
    if (!expected) { done({ ok: false, reason: "unsupported-kpatch-profile" }); return; }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "./patches/" + expected.file, true);
    xhr.responseType = "arraybuffer";
    xhr.timeout = 20000;
    xhr.onerror = function () { done({ ok: false, reason: "kpatch-fetch-error" }); };
    xhr.ontimeout = function () { done({ ok: false, reason: "kpatch-fetch-timeout" }); };
    xhr.onload = function () {
      var buffer = xhr.response;
      if (xhr.status && xhr.status !== 200) { done({ ok: false, reason: "kpatch-http-" + xhr.status }); return; }
      if (!buffer || buffer.byteLength !== expected.size) { done({ ok: false, reason: "kpatch-size-mismatch", expectedSize: expected.size, actualSize: buffer ? buffer.byteLength : 0 }); return; }
      if (root.crypto && root.crypto.subtle && root.crypto.subtle.digest) {
        root.crypto.subtle.digest("SHA-256", buffer).then(function (digest) {
          var actual = toHex(digest);
          done({ ok: actual === expected.sha256, reason: actual === expected.sha256 ? "verified" : "kpatch-sha256-mismatch", integrity: "sha256", sha256: actual, file: expected.file });
        }, function () {
          done({ ok: true, reason: "verified-size", integrity: "size", sha256: expected.sha256, file: expected.file });
        });
      } else {
        done({ ok: true, reason: "verified-size", integrity: "size", sha256: expected.sha256, file: expected.file });
      }
    };
    xhr.send();
  }

  var params = null;
  try { params = new URLSearchParams(root.location.search); } catch (e) {}
  function runtimeStart() {
    if (!params || params.get("mode") !== "guarded") return false;
    return checkpoint("FW");
  }

  root.NEXTRaw13gStability = {
    schema: SCHEMA,
    supportedFirmwares: SUPPORTED.slice(),
    profiles: JSON.parse(JSON.stringify(PROFILES)),
    payloads: JSON.parse(JSON.stringify(PAYLOADS)),
    recoverPrevious: recoverPrevious,
    canStart: canStart,
    begin: begin,
    checkpoint: checkpoint,
    complete: complete,
    cancel: cancel,
    reset: reset,
    report: report,
    validatePayload: validatePayload,
    validateKpatch: validateKpatch,
    kpatches: JSON.parse(JSON.stringify(KPATCHES)),
    runtimeStart: runtimeStart
  };
})(typeof window !== "undefined" ? window : globalThis);
