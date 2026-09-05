"use strict";

(function () {
  var MAX_RECORDS = 500;
  var DIAG_SCHEMA = "next-diagnostics-2";
  var REPORT_SCHEMA = "next-community-report-2";
  var SESSION_KEY = "ps4-webkit-next:diag-session";
  var ACTIVE_SESSION_KEY = "ps4-webkit-next:diag-session-active";
  var HANDOFF_KEY = "ps4-webkit-next:diag-session-handoff";
  var RECORDS_KEY = "ps4-webkit-next:diagnostics-records";
  var PREVIOUS_KEY = "ps4-webkit-next:previous-session";
  var SETTINGS_KEY = "ps4-webkit-next:diagnostics-settings";
  var REPORT_ID_KEY = "ps4-webkit-next:community-report-id";
  var PUBLIC_GITHUB_REPORT_URL = "https://github.com/killernos/PS4-WebKit/issues/new";
  var MAX_GITHUB_URL_LENGTH = 6000;
  var HANDOFF_MAX_AGE_MS = 15000;
  var allowedConsoleModels = { Original: true, Slim: true, Pro: true, Unknown: true };
  var filterGroups = {
    all: function () { return true; },
    errors: function (record) { return record.status === "FAIL" || record.category === "ERROR" || /ERROR|FAIL|THREW|REJECTION|RESOURCE-LOAD-FAIL/.test(record.stage); },
    failures: function (record) { return record.status === "FAIL" || /FAIL|CANCELLED|GIVE-UP|INCOMPLETE/.test(record.stage); },
    webkit: function (record) { return /WK|CSSFONTFACE|WEBKIT|PRIMITIVE/.test(record.stage) || record.category === "WEBKIT"; },
    kernel: function (record) { return /KEX|KERNEL|KARW|KPATCH|PATCH/.test(record.stage) || record.category === "KERNEL"; },
    payload: function (record) { return /PAYLOAD|GOLDHEN/.test(record.stage) || record.category === "PAYLOAD"; },
    cache: function (record) { return /CACHE|RESOURCE|STORAGE/.test(record.stage) || /CACHE|STORAGE|RESOURCE/.test(record.category); },
    previous: function (record) { return record.stage === "PREVIOUS-SESSION-INCOMPLETE" || record.category === "RECOVERY"; },
    research1302: function (record) { return record.pageName === "NEXT-1302-RESEARCH" || /13\.02|CELSIUS|FFS_MOUNTFS|RESEARCH/.test(record.stage) || record.category === "RESEARCH"; }
  };
  var state = {
    records: [],
    attempts: 0,
    passes: 0,
    failures: 0,
    lastStage: "Not reported",
    lastNormalizedStage: "Not reported",
    currentFilter: "all",
    sessionId: "",
    sessionStartedAt: "",
    lastEventAt: "",
    sessionCompleted: false,
    previousSessionCompleted: true,
    previousSession: null,
    firmware: null,
    payload: {
      id: "unknown",
      displayName: "Unknown",
      version: "Unknown",
      path: "",
      verificationStatus: "unknown",
      byteSize: 0,
      sha256: "",
      firmwareCompatible: false,
      recommended: false,
      actualSize: 0,
      actualSha256: ""
    },
    hen: {
      family: "none",
      selection: "none",
      displayName: "No HEN",
      identifier: "none",
      version: null,
      payloadPath: null,
      loaderReference: "skip",
      evidence: "source-confirmed",
      compatibility: "skipped",
      requested: false,
      attempted: false,
      status: "SKIPPED",
      error: ""
    },
    backend: {
      selected: "Unknown",
      entered: false,
      completed: false,
      failed: false
    },
    runtime: {
      firmwareCapability: "unknown",
      runtimeConfigured: false,
      runtimeMode: "unsupported",
      runtimeBackend: "Unknown",
      runtimeTarget: "",
      nextAccess: "UNSUPPORTED",
      hardwareVerification: "UNVERIFIED"
    },
    cache: {
      status: "CACHE-UNKNOWN",
      revision: "Unknown",
      buildRevision: "Unknown",
      offline: "unknown"
    },
    storage: {
      localStorage: "unknown",
      sessionStorage: "unknown",
      appCache: "unknown",
      cacheApi: "unknown"
    },
    page: {
      pageName: "UNKNOWN",
      relativePath: "./"
    },
    onlineState: "unknown",
    consoleModel: "Unknown",
    testerEntrypoint: "Unknown",
    testerCandidate: "None",
    testerOutcome: "",
    testerAlias: "",
    testerNotes: "",
    includeDiagnostics: true,
    includeUserAgent: false,
    resourceErrors: 0,
    jsErrors: 0,
    buildId: "Unknown",
    cacheRevision: "Unknown",
    diagnosticsSchema: DIAG_SCHEMA,
    researchBuildId: "",
    reportId: "",
    research: {
      researchMode: false,
      candidate: "",
      candidateStatus: "",
      entryReady: false,
      candidateReady: false,
      kernelFaultObserved: false,
      kernelLeak: false,
      kernelRead: false,
      kernelWrite: false,
      kernelExecution: false,
      lastResearchStage: ""
    }
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var first = "";
    var second = "";
    var index;
    for (index = 0; index < 7; index++) first += chars.charAt(Math.floor(Math.random() * chars.length));
    for (index = 0; index < 4; index++) second += chars.charAt(Math.floor(Math.random() * chars.length));
    return prefix + first + "-" + second;
  }

  function safeJsonParse(value, fallback) {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function readStoredText(storageKind, keyName) {
    var store = getStore(storageKind);
    if (!store) return "";
    try {
      return String(store.getItem(keyName) || "");
    } catch (error) {
      return "";
    }
  }

  function storageAvailable(kind) {
    try {
      var storage = window[kind];
      var probeKey = "__ps4_diag_probe__" + kind;
      storage.setItem(probeKey, "1");
      storage.removeItem(probeKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function getStore(kind) {
    try {
      return window[kind] || null;
    } catch (error) {
      return null;
    }
  }

  function queryParam(name) {
    var search = "";
    var pairs;
    var index;
    if (!name) return "";
    try {
      search = location.search || "";
    } catch (error) {
      search = "";
    }
    if (!search || search.length < 2) return "";
    pairs = search.slice(1).split("&");
    for (index = 0; index < pairs.length; index++) {
      var parts = pairs[index].split("=");
      if (decodeURIComponent(parts[0] || "") === name) {
        return decodeURIComponent((parts[1] || "").replace(/\+/g, " "));
      }
    }
    return "";
  }

  function normalizeFirmwareText(value) {
    var match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(sanitizeText(value || "", 16));
    var major;
    var minor;
    if (!match) return "";
    major = match[1];
    minor = match[2] || "00";
    if (minor.length < 2) minor = "0" + minor;
    return major + "." + minor;
  }

  function detectFirmware() {
    var override = normalizeFirmwareText(queryParam("fw"));
    var match = /PlayStation\s+4[\/ ](\d+)\.(\d+)/.exec(navigator.userAgent || "");
    var normalized = "Unknown";
    var firmwareRaw = "Unknown";
    var hardwareDetected = false;
    var source = "desktop";
    if (override) {
      return {
        firmware: override,
        firmwareRaw: override,
        firmwareNormalized: override,
        firmwareSource: "query",
        hardwareDetected: false,
        simulated: true
      };
    }
    if (match) {
      var major = match[1];
      var minorValue = parseInt(match[2], 16);
      var minor = minorValue.toString(16);
      if (minor.length < 2) minor = "0" + minor;
      normalized = major + "." + minor;
      firmwareRaw = match[0];
      hardwareDetected = true;
      source = "user-agent";
    }
    return {
      firmware: normalized,
      firmwareRaw: firmwareRaw,
      firmwareNormalized: normalized,
      firmwareSource: source,
      hardwareDetected: hardwareDetected,
      simulated: false
    };
  }

  function inferBackend(firmware) {
    if (!firmware || firmware === "Unknown") return "Unknown";
    var parts = /^(\d+)\.(\d+)$/.exec(firmware);
    if (!parts) return "Unknown";
    var numeric = parseInt(parts[1], 10) * 100 + parseInt(parts[2], 10);
    if (numeric <= 1202) return "Lapse";
    if (numeric >= 1250) return "Poops";
    return "Unknown";
  }

  function detectPageInfo() {
    var path = "/";
    try {
      path = location.pathname || "/";
    } catch (error) { }
    var relativePath = path;
    var pageName = "UNKNOWN";
    if (/diagnostics\.html$/i.test(path)) pageName = "DIAGNOSTICS";
    else if (/run_lapse\.html$/i.test(path)) pageName = "NEXT-12XX-RUNTIME";
    else if (/index\.html$/i.test(path) || /\/$/.test(path)) pageName = "NEXT-HOME";
    if (/13\.02|research=1/i.test((location.search || "") + " " + path)) pageName = "NEXT-1302-RESEARCH";
    return {
      pageName: pageName,
      relativePath: relativePath
    };
  }

  function normalizedStageFor(stage, context) {
    var pageName = context && context.pageName ? context.pageName : (state.page ? state.page.pageName : "UNKNOWN");
    if (stage === "BOOT") return "BOOT";
    if (/^FW-DETECTED$|^SIMULATED-FIRMWARE$/.test(stage)) return "FW-DETECTED";
    if (/^BACKEND-SELECTED$|^LAUNCH-MARKED$/.test(stage)) return "BACKEND-SELECTED";
    if (/^CACHE-(INIT|CHECK|UPDATE-AVAILABLE|UPDATE-FAIL|RESOURCE-MISSING|UNKNOWN)$/.test(stage)) return "CACHE-CHECK";
    if (/^CACHE-READY$/.test(stage)) return "CACHE-READY";
    if (/^PAGE-ENTER$/.test(stage)) {
      return /NEXT-(12XX|ALT)-RUNTIME|NEXT-1302-RESEARCH/.test(pageName) ? "RUNTIME-ENTER" : "BOOT";
    }
    if (/^ATTEMPT-(START|BEGIN)$|^AUTO-RETRY-|^CORE-GIVE-UP$|^SETUP-THREW$|^REFUSING-TO-ARM$/.test(stage)) return "WK-BEGIN";
    if (/^ARMED$|^RACE-|^RECLAIM-FAILED$|^PRECOMMIT-|^WIN-EVIDENCE$/.test(stage)) return "WK-TRIGGER";
    if (/^PRIMITIVE-OK$|^BASES$|^PROOF-OK$/.test(stage)) return "WK-PRIMITIVE";
    if (/^WORKER-READY$|^BUFFERS$|^GADGET-|^STUB-|^KV-BENCH|^KV-STATS$/.test(stage)) return "ROP-BEGIN";
    if (/^PID$|^SIGIO-PID$|^KREAD-PID$|^STAGE9-STUBS$|^STUB-SCAN$|^STUB-TABLE$/.test(stage)) return "SYSCALL-READY";
    if (/^DOUBLE-FREE-ACHIEVED$|^LEAK-|^KADDR-|^TARGET-(SEARCH|SCAN|WINDOW-LOST|ID)$|^REQS2-FOUND$|^STAGE-2-DONE$/.test(stage)) return "KEX-BEGIN";
    if (/^TARGET-ARMED$|^STAGE-3-DONE$|^EVF-DELETED$|^QUEUE-LEAKED$|^BATCH-CRAFTED$|^DELETE-SLOW$|^DELETE-ERRS$|^FALSE-TWINS$/.test(stage)) return "KEX-TRIGGER";
    if (/^KREAD-|^CURPROC$|^ALLPROC$|^PFIND$|^OFILES-CROSSCHECK$|^PIPE-FILE$|^PIPEBUF$|^KERNEL-BASE$|^KERNELVIEW$|^KV-(READ|FGET|PIPEBUF|ELF|BULK|TCLASS)$/.test(stage)) return "KERNEL-READ";
    if (/^KWRITE-|^KERNEL-RW$|^KV-(WRITE|RW64|LIVE)$|^REPAIR-|^JAILBREAK-|^POST-JAILBREAK$|^SANDBOX-/.test(stage)) return "KERNEL-WRITE";
    if (/^KPATCH-VERIFY$|^KERNEL-PATCHED$|^PATCH-SETTLE$/.test(stage)) return "PATCH-END";
    if (/^KPATCH-|^KEXEC$|^SYSENT-ARMED$/.test(stage)) return "PATCH-BEGIN";
    if (/^PAYLOAD-(SELECTED|REQUESTED|FILE-AVAILABLE|LOAD-BEGIN|LOAD-END|LOAD-FAIL|BLOB|MAP|COPY|THREAD|RUNNING|SETTLE|ALIVE|MAPPED-NOT-LAUNCHED|SKIPPED|NONE|THREW|FETCH-FAILED)$/.test(stage)) {
      return /ALIVE|LOAD-END/.test(stage) ? "PAYLOAD-END" : "PAYLOAD-BEGIN";
    }
    if (/^VERDICT$|^DONE$|^SESSION-COMPLETE$|^COMMUNITY-REPORT-SUBMITTED$/.test(stage)) return "DONE";
    if (/RESEARCH|CELSIUS|FFS_MOUNTFS|13\.02/.test(stage)) return /NEXT-1302-RESEARCH/.test(pageName) ? "RUNTIME-ENTER" : "KEX-BEGIN";
    return "";
  }

  function currentBuild() {
    var build = window.PS4_WEBKIT_BUILD || {};
    return {
      buildId: build.buildId || "Unknown",
      cacheRevision: build.cacheRevision || "Unknown",
      diagnosticsSchema: DIAG_SCHEMA,
      researchBuildId: build.researchBuildId || ""
    };
  }

  function sessionSnapshot() {
    return {
      sessionId: state.sessionId,
      sessionStartedAt: state.sessionStartedAt,
      lastEventAt: state.lastEventAt,
      sessionCompleted: state.sessionCompleted,
      lastNormalizedStage: state.lastNormalizedStage,
      firmware: state.firmware,
      backend: state.backend,
      runtime: state.runtime,
      payload: state.payload,
      hen: state.hen,
      buildId: state.buildId,
      cacheRevision: state.cacheRevision,
      reportId: state.reportId,
      lastStage: state.lastStage,
      page: state.page,
      onlineState: state.onlineState,
      consoleModel: state.consoleModel,
      research: state.research,
      runtime: state.runtime
    };
  }

  function readStoredJson(storageKind, keyName, fallback) {
    var store = getStore(storageKind);
    if (!store) return fallback;
    return safeJsonParse(store.getItem(keyName), fallback);
  }

  function removeStoredItem(storageKind, keyName) {
    var store = getStore(storageKind);
    if (!store) return;
    try {
      store.removeItem(keyName);
    } catch (error) { }
  }

  function parseTime(value) {
    var result = Date.parse(value || "");
    return isNaN(result) ? 0 : result;
  }

  function currentPagePath() {
    try {
      return location.pathname || "/";
    } catch (error) {
      return "/";
    }
  }

  function currentOrigin() {
    try {
      return location.origin || "";
    } catch (error) {
      return "";
    }
  }

  function normalizeUrl(url) {
    var anchor;
    if (!url) return null;
    try {
      anchor = document.createElement("a");
      anchor.href = url;
      return {
        href: anchor.href || "",
        origin: anchor.origin || "",
        pathname: anchor.pathname || ""
      };
    } catch (error) {
      return null;
    }
  }

  function handoffAgeMs(handoff) {
    return Math.max(0, parseTime(nowIso()) - parseTime(handoff && handoff.createdAt));
  }

  function handoffIsFresh(handoff) {
    return !!(handoff && handoff.sessionId && handoff.createdAt && handoffAgeMs(handoff) <= HANDOFF_MAX_AGE_MS);
  }

  function readHandoff() {
    var handoff = readStoredJson("localStorage", HANDOFF_KEY, null);
    if (handoff && !handoffIsFresh(handoff)) {
      removeStoredItem("localStorage", HANDOFF_KEY);
      return null;
    }
    return handoff;
  }

  function persistHandoff(handoff) {
    var store = getStore("localStorage");
    if (!store) return;
    try {
      store.setItem(HANDOFF_KEY, JSON.stringify(handoff));
    } catch (error) { }
  }

  function clearHandoff() {
    removeStoredItem("localStorage", HANDOFF_KEY);
  }

  function currentRuntime() {
    var build = currentBuild();
    var runtimeValue = window.PS4Runtime || {};
    var firmwareState = state.firmware || detectFirmware();
    var researchMode = runtimeValue.researchMode !== undefined ? !!runtimeValue.researchMode : !!state.research.researchMode;
    var backendName = runtimeValue.selectedBackend || state.backend.selected || inferBackend(firmwareState.firmware);
    if (researchMode && firmwareState.firmware === "13.02") backendName = "NEXT 13.02 Research";
    return {
      firmware: firmwareState.firmware,
      firmwareRaw: firmwareState.firmwareRaw,
      firmwareNormalized: firmwareState.firmwareNormalized,
      firmwareSource: runtimeValue.firmwareSource || firmwareState.firmwareSource,
      hardwareDetected: runtimeValue.hardwareDetected !== undefined ? !!runtimeValue.hardwareDetected : firmwareState.hardwareDetected,
      simulated: runtimeValue.simulated !== undefined ? !!runtimeValue.simulated : firmwareState.simulated,
      backend: backendName,
      buildId: build.buildId,
      cacheRevision: build.cacheRevision,
      diagnosticsSchema: build.diagnosticsSchema,
      researchBuildId: build.researchBuildId,
      pageName: state.page.pageName,
      relativePath: state.page.relativePath,
      payload: state.payload,
      hen: state.hen
    };
  }

  function sanitizeText(value, maxLength) {
    var text = value == null ? "" : String(value);
    text = text.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
    if (maxLength && text.length > maxLength) text = text.slice(0, maxLength);
    return text;
  }

  function sanitizePath(value) {
    var text = sanitizeText(value || "", 260);
    if (!text) return "";
    text = text.replace(/^https?:\/\/[^/]+/i, "");
    text = text.replace(/[?#].*$/, "");
    return text || "";
  }

  function categorize(stage) {
    if (/^(BOOT|FW-DETECTED|SIMULATED-FIRMWARE|PAGE-ENTER|BACKEND-SELECTED|LAUNCH-MARKED|ATTEMPT-)/.test(stage)
      || /^AUTO-RETRY-|^CORE-GIVE-UP$|^RUNTIME-/.test(stage)) return "ROUTING";
    if (/^CACHE-/.test(stage)) return "CACHE";
    if (/^STORAGE-/.test(stage)) return "STORAGE";
    if (/^RESOURCE-/.test(stage)) return "RESOURCE";
    if (/^JS-ERROR$|^UNHANDLED-PROMISE$|ERROR|THREW/.test(stage)) return "ERROR";
    if (/^WK|^WEBKIT|^CSSFONTFACE|^PRIMITIVE/.test(stage)) return "WEBKIT";
    if (/^USERLAND|^MEMORY|^ARW/.test(stage)) return "USERLAND";
    if (/^ROP/.test(stage)) return "ROP";
    if (/^SYSCALL|^PID$|^SIGIO-PID$|^STUB-/.test(stage)) return "SYSCALL";
    if (/^KEX/.test(stage)
      || /^ARMED$|^RACE-|^RECLAIM-FAILED$|^PRECOMMIT-|^WIN-EVIDENCE$/.test(stage)
      || /^DOUBLE-FREE-ACHIEVED$|^LEAK-|^KADDR-|^TARGET-|^REQS2-FOUND$/.test(stage)
      || /^STAGE-2-DONE$|^STAGE-3-DONE$|^EVF-DELETED$|^QUEUE-LEAKED$|^BATCH-CRAFTED$/.test(stage)
      || /^DELETE-SLOW$|^DELETE-ERRS$|^FALSE-TWINS$/.test(stage)) return "KEX";
    if (/^KREAD-|^KWRITE-|^KERNEL|^KARW|^KPATCH|^PATCH/.test(stage)
      || /^CURPROC$|^ALLPROC$|^PFIND$|^OFILES-CROSSCHECK$|^PIPE-FILE$|^PIPEBUF$/.test(stage)
      || /^KERNELVIEW$|^KV-/.test(stage)) return "KERNEL";
    if (/^PAYLOAD|^GOLDHEN/.test(stage)) return "PAYLOAD";
    if (/^RETRY|^GIVE-UP/.test(stage)) return "RETRY";
    if (/^PREVIOUS-SESSION|^RECOVERY|^SESSION-COMPLETE$/.test(stage)) return "RECOVERY";
    if (/RESEARCH|CELSIUS|FFS_MOUNTFS|13\.02/.test(stage)) return "RESEARCH";
    if (/^DONE$|^COMMUNITY-REPORT-SUBMITTED$/.test(stage)) return "DONE";
    return "COMMUNITY";
  }

  function evidenceFor(stage, status) {
    if (stage === "PREVIOUS-SESSION-INCOMPLETE") return "OBSERVED";
    if (/KERNEL-(LEAK|READ|WRITE|EXECUTION)/.test(stage)) return "VERIFIED";
    if (/BROWSER CRASH|REBOOT|FROZE|Possible kernel panic/i.test(status || "")) return "TESTER-REPORTED";
    if (/UNEXPECTED TERMINATION|INCOMPLETE/.test(stage)) return "INFERRED";
    return "OBSERVED";
  }

  function persistRecords() {
    var store = getStore("localStorage");
    if (!store) return;
    try {
      store.setItem(RECORDS_KEY, JSON.stringify(state.records.slice(-MAX_RECORDS)));
    } catch (error) { }
  }

  function persistSession() {
    var localStore = getStore("localStorage");
    var sessionStore = getStore("sessionStorage");
    var snapshot = sessionSnapshot();
    if (localStore) {
      try {
        localStore.setItem(SESSION_KEY, JSON.stringify(snapshot));
      } catch (error) { }
    }
    if (sessionStore) {
      try {
        sessionStore.setItem(ACTIVE_SESSION_KEY, JSON.stringify(snapshot));
      } catch (error) { }
    }
  }

  function persistPrevious(snapshot) {
    var store = getStore("localStorage");
    if (!store) return;
    try {
      store.setItem(PREVIOUS_KEY, JSON.stringify(snapshot));
    } catch (error) { }
  }

  function loadRecords() {
    var store = getStore("localStorage");
    if (!store) return [];
    var loaded = safeJsonParse(store.getItem(RECORDS_KEY), []);
    return Array.isArray(loaded) ? loaded.slice(-MAX_RECORDS) : [];
  }

  function currentSessionRecords() {
    var result = [];
    var index;
    for (index = 0; index < state.records.length; index++) {
      if (state.records[index].sessionId === state.sessionId) result.push(state.records[index]);
    }
    return result;
  }

  function recountCurrentSession() {
    var sessionRecords = currentSessionRecords();
    var completed = !!state.sessionCompleted;
    var index;
    state.attempts = 0;
    state.passes = 0;
    state.failures = 0;
    state.resourceErrors = 0;
    state.jsErrors = 0;
    state.lastStage = "Not reported";
    state.lastNormalizedStage = "Not reported";
    for (index = 0; index < sessionRecords.length; index++) {
      var record = sessionRecords[index];
      state.lastStage = record.stage;
      if (record.normalizedStage) state.lastNormalizedStage = record.normalizedStage;
      if (record.status === "PASS") state.passes++;
      if (record.status === "FAIL") state.failures++;
      if (/ATTEMPT-(BEGIN|START)/.test(record.stage)) state.attempts++;
      if (record.category === "RESOURCE") state.resourceErrors++;
      if (record.stage === "JS-ERROR" || record.stage === "UNHANDLED-PROMISE") state.jsErrors++;
      if (record.stage === "DONE" || record.stage === "SESSION-COMPLETE" || record.stage === "PAYLOAD-END") {
        completed = true;
      }
    }
    state.sessionCompleted = completed;
  }

  function currentPageRecordExists(pageName, relativePath) {
    var sessionRecords = currentSessionRecords();
    var index;
    for (index = 0; index < sessionRecords.length; index++) {
      if (sessionRecords[index].stage !== "PAGE-ENTER") continue;
      if (sessionRecords[index].pageName === pageName && sessionRecords[index].relativePath === relativePath) {
        return true;
      }
    }
    return false;
  }

  function loadSettings() {
    var store = getStore("localStorage");
    if (!store) return;
    var loaded = safeJsonParse(store.getItem(SETTINGS_KEY), null);
    if (!loaded || typeof loaded !== "object") return;
    if (allowedConsoleModels[loaded.consoleModel]) state.consoleModel = loaded.consoleModel;
    state.testerEntrypoint = sanitizeText(loaded.testerEntrypoint || state.testerEntrypoint, 80) || "Unknown";
    state.testerCandidate = sanitizeText(loaded.testerCandidate || state.testerCandidate, 120) || "None";
    state.testerAlias = sanitizeText(loaded.testerAlias || "", 80);
    state.testerNotes = sanitizeText(loaded.testerNotes || "", 2000);
    state.testerOutcome = sanitizeText(loaded.testerOutcome || "", 80);
    state.includeDiagnostics = loaded.includeDiagnostics !== undefined ? !!loaded.includeDiagnostics : state.includeDiagnostics;
    state.includeUserAgent = !!loaded.includeUserAgent;
  }

  function persistSettings() {
    var store = getStore("localStorage");
    if (!store) return;
    try {
      store.setItem(SETTINGS_KEY, JSON.stringify({
        consoleModel: state.consoleModel,
        testerEntrypoint: state.testerEntrypoint,
        testerCandidate: state.testerCandidate,
        testerAlias: state.testerAlias,
        testerNotes: state.testerNotes,
        testerOutcome: state.testerOutcome,
        includeDiagnostics: state.includeDiagnostics,
        includeUserAgent: state.includeUserAgent
      }));
    } catch (error) { }
  }

  function updateRuntimeState(partial) {
    if (!partial || typeof partial !== "object") return;
    if (partial.firmware) {
      state.firmware = {
        firmware: partial.firmware,
        firmwareRaw: partial.firmwareRaw || partial.firmware,
        firmwareNormalized: partial.firmwareNormalized || partial.firmware,
        firmwareSource: partial.firmwareSource || (state.firmware ? state.firmware.firmwareSource : "unknown"),
        hardwareDetected: partial.hardwareDetected !== undefined ? !!partial.hardwareDetected : !!(state.firmware && state.firmware.hardwareDetected),
        simulated: partial.simulated !== undefined ? !!partial.simulated : !!(state.firmware && state.firmware.simulated)
      };
    }
    if (partial.backend) state.backend.selected = partial.backend;
    if (partial.runtime && typeof partial.runtime === "object") {
      state.runtime = {
        firmwareCapability: partial.runtime.firmwareCapability !== undefined ? partial.runtime.firmwareCapability : state.runtime.firmwareCapability,
        runtimeConfigured: partial.runtime.runtimeConfigured !== undefined ? !!partial.runtime.runtimeConfigured : state.runtime.runtimeConfigured,
        runtimeMode: partial.runtime.runtimeMode || state.runtime.runtimeMode,
        runtimeBackend: partial.runtime.runtimeBackend || state.runtime.runtimeBackend,
        runtimeTarget: partial.runtime.runtimeTarget !== undefined ? partial.runtime.runtimeTarget : state.runtime.runtimeTarget,
        nextAccess: partial.runtime.nextAccess || state.runtime.nextAccess,
        hardwareVerification: partial.runtime.hardwareVerification || state.runtime.hardwareVerification
      };
    }
    if (partial.buildId) state.buildId = partial.buildId;
    if (partial.cacheRevision) state.cacheRevision = partial.cacheRevision;
    if (partial.pageName) state.page.pageName = partial.pageName;
    if (partial.relativePath) state.page.relativePath = partial.relativePath;
    if (partial.onlineState) state.onlineState = partial.onlineState;
    if (partial.researchMode !== undefined) state.research.researchMode = !!partial.researchMode;
    if (partial.researchCandidate !== undefined) state.research.candidate = partial.researchCandidate;
    if (partial.candidateStatus !== undefined) state.research.candidateStatus = partial.candidateStatus;
    if (partial.entryReady !== undefined) state.research.entryReady = !!partial.entryReady;
    if (partial.candidateReady !== undefined) state.research.candidateReady = !!partial.candidateReady;
    if (partial.researchBuildId !== undefined) state.researchBuildId = partial.researchBuildId;
    if (partial.payload && typeof partial.payload === "object") {
      state.payload = {
        id: partial.payload.id || state.payload.id,
        displayName: partial.payload.displayName || state.payload.displayName,
        version: partial.payload.version || state.payload.version,
        path: partial.payload.path || state.payload.path,
        verificationStatus: partial.payload.verificationStatus || state.payload.verificationStatus,
        byteSize: partial.payload.byteSize || state.payload.byteSize,
        sha256: partial.payload.sha256 || state.payload.sha256,
        firmwareCompatible: partial.payload.firmwareCompatible !== undefined ? !!partial.payload.firmwareCompatible : state.payload.firmwareCompatible,
        recommended: partial.payload.recommended !== undefined ? !!partial.payload.recommended : state.payload.recommended,
        actualSize: partial.payload.actualSize || state.payload.actualSize,
        actualSha256: partial.payload.actualSha256 || state.payload.actualSha256
      };
    }
    persistSession();
  }

  function appendRecord(record) {
    state.records.push(record);
    if (state.records.length > MAX_RECORDS) state.records = state.records.slice(-MAX_RECORDS);
    state.lastEventAt = record.timestamp;
    if (/PAYLOAD-LOAD-FAIL|PAYLOAD-FETCH-FAILED|PAYLOAD-THREW/.test(record.stage)) state.backend.failed = true;
    recountCurrentSession();
    persistRecords();
    persistSession();
    render();
  }

  function emit(status, stage, message, details) {
    var runtime = currentRuntime();
    var timestamp = nowIso();
    var normalizedStage = normalizedStageFor(stage, {
      pageName: runtime.pageName,
      category: (details && details.category) || categorize(stage)
    }) || state.lastNormalizedStage || "";
    var record = {
      timestamp: timestamp,
      elapsedMs: state.sessionStartedAt ? Math.max(0, Date.parse(timestamp) - Date.parse(state.sessionStartedAt)) : 0,
      status: status,
      stage: stage,
      message: sanitizeText(message || "", 500),
      category: (details && details.category) || categorize(stage),
      firmware: runtime.firmware,
      firmwareSource: runtime.firmwareSource,
      hardwareDetected: runtime.hardwareDetected,
      simulated: runtime.simulated,
      backend: runtime.backend,
      buildId: runtime.buildId,
      cacheRevision: runtime.cacheRevision,
      pageName: runtime.pageName,
      relativePath: runtime.relativePath,
      sessionId: state.sessionId,
      normalizedStage: normalizedStage,
      evidence: evidenceFor(stage, status),
      runtime: state.runtime,
      payload: {
        id: state.payload.id,
        displayName: state.payload.displayName,
        version: state.payload.version,
        path: state.payload.path,
        verificationStatus: state.payload.verificationStatus,
        byteSize: state.payload.byteSize,
        sha256: state.payload.sha256,
        firmwareCompatible: state.payload.firmwareCompatible,
        recommended: state.payload.recommended,
        actualSize: state.payload.actualSize,
        actualSha256: state.payload.actualSha256
      },
      details: details || {}
    };
    appendRecord(record);
    return record;
  }

  function getFilteredRecords() {
    var predicate = filterGroups[state.currentFilter] || filterGroups.all;
    var result = [];
    var index;
    for (index = 0; index < state.records.length; index++) {
      if (predicate(state.records[index])) result.push(state.records[index]);
    }
    return result;
  }

  function setText(id, value) {
    var element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setValue(id, value) {
    var element = document.getElementById(id);
    if (element) element.value = value;
  }

  function setChecked(id, value) {
    var element = document.getElementById(id);
    if (element) element.checked = !!value;
  }

  function isScrolledNearBottom(element) {
    if (!element) return true;
    return element.scrollTop + element.clientHeight >= element.scrollHeight - 24;
  }

  function writeScrollableText(id, text) {
    var element = document.getElementById(id);
    var wasNearBottom;
    var previousTop;
    if (!element) return;
    wasNearBottom = isScrolledNearBottom(element);
    previousTop = element.scrollTop;
    element.textContent = text;
    if (wasNearBottom) element.scrollTop = element.scrollHeight;
    else element.scrollTop = previousTop;
  }

  function scrollPanelToNewest(id) {
    var element = document.getElementById(id);
    if (!element) return false;
    element.scrollTop = element.scrollHeight;
    return true;
  }

  function copyPanelText(id) {
    var element = document.getElementById(id);
    if (!element) return false;
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      emit("FAIL", "COPY-VIEW-UNAVAILABLE", "Clipboard API is unavailable on this browser.", { category: "COMMUNITY", panel: id });
      return false;
    }
    navigator.clipboard.writeText(element.textContent || "").then(function () {
      emit("PASS", "COPY-VIEW", "Panel contents copied to clipboard.", { category: "COMMUNITY", panel: id });
    }, function () {
      emit("FAIL", "COPY-VIEW-FAILED", "Clipboard write failed.", { category: "COMMUNITY", panel: id });
    });
    return true;
  }

  function clearPanelView(id) {
    var element = document.getElementById(id);
    if (!element) return false;
    element.textContent = "";
    return true;
  }

  function firstElementById() {
    var index;
    for (index = 0; index < arguments.length; index++) {
      var element = document.getElementById(arguments[index]);
      if (element) return element;
    }
    return null;
  }

  function formatBoolLabel(value, trueText, falseText) {
    return value ? trueText : falseText;
  }

  function formatPreviousSession() {
    if (!state.previousSession) return "None";
    return state.previousSession.sessionCompleted ? "Complete" : "Incomplete";
  }

  function researchVerificationState(value) {
    return value ? "VERIFIED" : "UNVERIFIED";
  }

  function observedOrUnverified(value) {
    return value ? "OBSERVED" : "UNVERIFIED";
  }

  function applyStoredSession(snapshot, defaults) {
    var currentPage = defaults.page;
    state.sessionId = snapshot.sessionId;
    state.sessionStartedAt = snapshot.sessionStartedAt || nowIso();
    state.lastEventAt = snapshot.lastEventAt || state.sessionStartedAt;
    state.sessionCompleted = !!snapshot.sessionCompleted;
    state.firmware = snapshot.firmware || defaults.firmware;
    state.backend = snapshot.backend || state.backend;
    state.payload = snapshot.payload || state.payload;
    state.hen = snapshot.hen || state.hen;
    state.page = currentPage && currentPage.pageName ? currentPage : (snapshot.page || state.page);
    state.onlineState = defaults.onlineState || snapshot.onlineState || state.onlineState;
    state.consoleModel = snapshot.consoleModel || state.consoleModel;
    state.research = snapshot.research || state.research;
    state.buildId = snapshot.buildId || state.buildId;
    state.cacheRevision = snapshot.cacheRevision || state.cacheRevision;
    state.reportId = snapshot.reportId || readStoredText("sessionStorage", REPORT_ID_KEY) || readStoredText("localStorage", REPORT_ID_KEY) || state.reportId;
    state.lastStage = snapshot.lastStage || state.lastStage;
    state.lastNormalizedStage = snapshot.lastNormalizedStage || state.lastNormalizedStage;
  }

  function prepareNavigationHandoff(targetHref, reason) {
    var target = normalizeUrl(targetHref);
    if (!target || !target.pathname || !state.sessionId || state.sessionCompleted) return false;
    if (target.origin && currentOrigin() && target.origin !== currentOrigin()) return false;
    persistHandoff({
      sessionId: state.sessionId,
      createdAt: nowIso(),
      sourcePath: state.page.relativePath,
      targetPath: sanitizePath(target.pathname || ""),
      reason: sanitizeText(reason || "navigation", 40),
      snapshot: sessionSnapshot()
    });
    return true;
  }

  function eventAnchor(target) {
    while (target && target.nodeType === 1) {
      if (target.tagName && target.tagName.toLowerCase() === "a" && target.getAttribute("href")) return target;
      target = target.parentNode;
    }
    return null;
  }

  function installNavigationHandoff() {
    function handle(event, reason) {
      var anchor = eventAnchor(event.target);
      if (!anchor) return;
      var href = anchor.href || anchor.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#" || /^javascript:/i.test(href)) return;
      prepareNavigationHandoff(href, reason);
    }

    document.addEventListener("mousedown", function (event) {
      handle(event, "mousedown");
    }, true);
    document.addEventListener("click", function (event) {
      handle(event, "click");
    }, true);
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      handle(event, "keydown");
    }, true);
  }

  function repeatedFailureStage() {
    var sessionRecords = currentSessionRecords();
    var counts = {};
    var topStage = "";
    var topCount = 0;
    var index;
    for (index = 0; index < sessionRecords.length; index++) {
      var record = sessionRecords[index];
      if (record.status !== "FAIL") continue;
      counts[record.stage] = (counts[record.stage] || 0) + 1;
      if (counts[record.stage] > topCount) {
        topCount = counts[record.stage];
        topStage = record.stage;
      }
    }
    return topStage ? { stage: topStage, count: topCount } : null;
  }

  function buildSummaryText() {
    var entrypoint = state.testerEntrypoint || (state.page.pageName === "NEXT-1302-RESEARCH" ? "SlopKit" : (state.backend.selected || "Unknown"));
    var kernelRW = state.research.kernelRead && state.research.kernelWrite ? "VERIFIED" : "NOT VERIFIED";
    var userlandArw = /USERLAND-ARW-VERIFIED/.test(state.lastStage) ? "VERIFIED" : "NOT VERIFIED";
    var previousSessionState = state.previousSession ? (state.previousSessionCompleted ? "Complete (OBSERVED)" : "Incomplete (OBSERVED)") : "None";
    var testerOutcome = state.testerOutcome ? state.testerOutcome + " (TESTER-REPORTED)" : "Not provided";
    var reportState = document.getElementById("submission-status");
    var lines = [
      "PS4 WebKit NEXT",
      "Created by KillerNoS",
      "",
      "Firmware: " + (state.firmware ? state.firmware.firmware : "Unknown"),
      "Hardware Detected: " + (state.firmware && state.firmware.hardwareDetected ? "Yes (OBSERVED)" : (state.firmware && state.firmware.simulated ? "No, simulated (OBSERVED)" : "No")),
      "Build: " + state.buildId,
      "Backend: " + state.backend.selected,
      "Entrypoint: " + entrypoint,
      "Candidate: " + (state.testerCandidate || state.research.candidate || "None"),
      "Selected HEN: " + (state.hen.displayName || "No HEN"),
      "HEN Load Status: " + (state.hen.status || "SKIPPED"),
      "Last Stage: " + state.lastStage,
      "Userland ARW: " + userlandArw,
      "Kernel R/W: " + kernelRW,
      "Previous Session: " + previousSessionState,
      "JavaScript Errors: " + String(state.jsErrors),
      "Resource Errors: " + String(state.resourceErrors),
      "Outcome: " + testerOutcome,
      "Report Submission: " + (reportState ? reportState.textContent : "Submission is idle."),
      "Report ID: " + getOrCreateReportId()
    ];
    return lines.join("\n");
  }

  function buildResearchSummary() {
    var lines = [
      "Kernel fault evidence: " + observedOrUnverified(state.research.kernelFaultObserved),
      "Kernel read: " + researchVerificationState(state.research.kernelRead),
      "Kernel write: " + researchVerificationState(state.research.kernelWrite),
      "Kernel execution: " + researchVerificationState(state.research.kernelExecution),
      "Freeze, reboot, and incomplete sessions remain visible as tester-reported or inferred outcomes unless kernel evidence is directly observed."
    ];
    return lines.join(" ");
  }

  function persistReportId() {
    var localStore = getStore("localStorage");
    var sessionStore = getStore("sessionStorage");
    if (localStore) {
      try {
        if (state.reportId) localStore.setItem(REPORT_ID_KEY, state.reportId);
        else localStore.removeItem(REPORT_ID_KEY);
      } catch (error) { }
    }
    if (sessionStore) {
      try {
        if (state.reportId) sessionStore.setItem(REPORT_ID_KEY, state.reportId);
        else sessionStore.removeItem(REPORT_ID_KEY);
      } catch (error) { }
    }
  }

  function resetReportId() {
    state.reportId = "";
    persistReportId();
  }

  function getOrCreateReportId() {
    if (!state.reportId) state.reportId = makeId("NEXT-REPORT-");
    persistReportId();
    return state.reportId;
  }

  function importantGithubRecords(limit) {
    var sessionRecords = currentSessionRecords();
    var scored = [];
    var index;
    function score(record) {
      var stage = record.stage || "";
      var category = record.category || "";
      var points = 0;
      if (record.status === "FAIL") points += 10;
      if (/ERROR|CRASH|REBOOT|FAIL/.test(stage)) points += 9;
      if (/PRIMITIVE|USERLAND|KERNEL|PAYLOAD|HEN|DONE/.test(stage)) points += 7;
      if (/USERLAND|KERNEL|PAYLOAD/.test(category)) points += 5;
      return points;
    }
    for (index = 0; index < sessionRecords.length; index++) {
      scored.push({ record: sessionRecords[index], score: score(sessionRecords[index]), index: index });
    }
    scored.sort(function (left, right) {
      if (right.score !== left.score) return right.score - left.score;
      return right.index - left.index;
    });
    scored = scored.filter(function (item) { return item.score > 0; }).slice(0, limit);
    if (!scored.length) return sessionRecords.slice(Math.max(0, sessionRecords.length - 5));
    scored.sort(function (left, right) { return left.index - right.index; });
    return scored.map(function (item) { return item.record; });
  }

  function buildGithubSummary(report) {
    var important = importantGithubRecords(10);
    var lines = [
      "PS4 WebKit NEXT Community Report",
      "",
      "Report ID: " + report.reportId,
      "Session ID: " + report.sessionId,
      "Firmware: " + report.firmware,
      "Hardware/Simulation: " + (report.simulated ? "simulation" : (report.hardwareDetected ? "hardware" : "unknown")),
      "Console Model: " + report.consoleModel,
      "NEXT Build: " + report.buildId,
      "Backend: " + report.backend.backendSelected,
      "Entrypoint: " + report.entrypoint,
      "Payload: " + report.payload.payloadDisplayName,
      "Selected HEN: " + report.hen.henDisplayName,
      "HEN Load Status: " + report.hen.henLoadStatus,
      "Attempts: " + report.attemptCount,
      "Passes: " + report.passCount,
      "Failures: " + report.failureCount,
      "Last Stage: " + report.lastStage,
      "Previous Session Incomplete: " + (report.previousSessionIncomplete ? "Yes" : "No"),
      "Userland ARW: " + report.research.userlandARWState,
      "Kernel Read: " + report.research.kernelReadState,
      "Kernel Write: " + report.research.kernelWriteState,
      "Kernel Execution: " + report.research.kernelExecutionState,
      "Tester Outcome: " + (report.testerSelectedOutcome || ""),
      "Tester Alias: " + (report.testerAlias || ""),
      "Tester Notes: " + (report.testerNotes || "")
    ];
    if (important.length) {
      lines.push("", "Important Events:");
      for (var index = 0; index < important.length; index++) {
        lines.push("- " + important[index].stage + (important[index].message ? ": " + important[index].message : ""));
      }
    }
    lines.push("", "Full diagnostic log was not included because browser URL length is limited.");
    lines.push("Use the downloaded JSON report for complete diagnostics.");
    var text = lines.join("\n");
    if (text.length > 2500) text = text.slice(0, 2470) + "\n[summary truncated]";
    return text;
  }

  function buildSnapshot() {
    return {
      sessionId: state.sessionId,
      sessionStartedAt: state.sessionStartedAt,
      lastEventAt: state.lastEventAt,
      sessionCompleted: state.sessionCompleted,
      previousSessionCompleted: state.previousSessionCompleted,
      currentStage: state.lastStage,
      currentNormalizedStage: state.lastNormalizedStage,
      attempts: state.attempts,
      passes: state.passes,
      failures: state.failures,
      firmware: state.firmware,
      backend: state.backend,
      runtime: state.runtime,
      payload: state.payload,
      hen: state.hen,
      cache: state.cache,
      storage: state.storage,
      page: state.page,
      onlineState: state.onlineState,
      consoleModel: state.consoleModel,
      buildId: state.buildId,
      cacheRevision: state.cacheRevision,
      reportId: state.reportId,
      diagnosticsSchema: DIAG_SCHEMA,
      researchBuildId: state.researchBuildId,
      previousSession: state.previousSession,
      resourceErrors: state.resourceErrors,
      jsErrors: state.jsErrors,
      research: state.research
    };
  }

  function buildCommunityReport() {
    var sessionRecords = currentSessionRecords();
    var firstNormalizedStage = "";
    var index;
    for (index = 0; index < sessionRecords.length; index++) {
      if (sessionRecords[index].normalizedStage) {
        firstNormalizedStage = sessionRecords[index].normalizedStage;
        break;
      }
    }
    var report = {
      schema: REPORT_SCHEMA,
      reportId: getOrCreateReportId(),
      sessionId: state.sessionId,
      createdAt: nowIso(),
      timestamp: nowIso(),
      firmware: state.firmware ? state.firmware.firmware : "Unknown",
      firmwareSource: state.firmware ? state.firmware.firmwareSource : "unknown",
      hardwareDetected: state.firmware ? !!state.firmware.hardwareDetected : false,
      simulated: state.firmware ? !!state.firmware.simulated : false,
      buildId: state.buildId,
      cacheRevision: state.cacheRevision,
      diagnosticsSchema: DIAG_SCHEMA,
      researchBuildId: state.researchBuildId,
      consoleModel: state.consoleModel,
      page: {
        pageName: state.page.pageName,
        relativePath: state.page.relativePath
      },
      entrypoint: state.testerEntrypoint || (state.page.pageName === "NEXT-1302-RESEARCH" ? "SlopKit" : (state.backend.selected || "Unknown")),
      candidate: state.testerCandidate || state.research.candidate || "None",
      backend: {
        backendSelected: state.backend.selected,
        backendEntered: state.backend.entered,
        backendCompleted: state.backend.completed,
        backendFailed: state.backend.failed
      },
      runtime: {
        firmwareCapability: state.runtime.firmwareCapability,
        runtimeConfigured: state.runtime.runtimeConfigured,
        runtimeMode: state.runtime.runtimeMode,
        runtimeBackend: state.runtime.runtimeBackend,
        runtimeTarget: state.runtime.runtimeTarget,
        nextAccess: state.runtime.nextAccess,
        hardwareVerification: state.runtime.hardwareVerification
      },
      payload: {
        payloadId: state.payload.id,
        payloadDisplayName: state.payload.displayName,
        payloadVersion: state.payload.version,
        payloadPath: state.payload.path,
        payloadVerificationStatus: state.payload.verificationStatus,
        payloadExpectedSize: state.payload.byteSize,
        payloadExpectedSha256: state.payload.sha256,
        payloadFirmwareCompatible: state.payload.firmwareCompatible,
        payloadRecommended: state.payload.recommended,
        payloadActualSize: state.payload.actualSize,
        payloadActualSha256: state.payload.actualSha256
      },
      hen: {
        henFamily: state.hen.family,
        henSelection: state.hen.selection,
        henDisplayName: state.hen.displayName,
        henIdentifier: state.hen.identifier,
        henVersion: state.hen.version,
        henPayloadPath: state.hen.payloadPath,
        henLoaderReference: state.hen.loaderReference,
        henEvidence: state.hen.evidence,
        henCompatibility: state.hen.compatibility,
        henLoadRequested: state.hen.requested,
        henLoadAttempted: state.hen.attempted,
        henLoadStatus: state.hen.status,
        henLoadError: state.hen.error
      },
      attemptCount: state.attempts,
      passCount: state.passes,
      failureCount: state.failures,
      firstStage: sessionRecords.length ? sessionRecords[0].stage : "",
      firstNormalizedStage: firstNormalizedStage,
      lastStage: state.lastStage,
      lastNormalizedStage: state.lastNormalizedStage,
      previousSessionIncomplete: !state.previousSessionCompleted,
      previousLastStage: state.previousSession ? state.previousSession.lastStage || "" : "",
      previousLastNormalizedStage: state.previousSession ? state.previousSession.lastNormalizedStage || "" : "",
      previousFirmware: state.previousSession && state.previousSession.firmware ? state.previousSession.firmware.firmware || state.previousSession.firmware : "",
      previousBuildId: state.previousSession ? state.previousSession.buildId || "" : "",
      previousBackend: state.previousSession && state.previousSession.backend ? state.previousSession.backend.selected || state.previousSession.backend : "",
      previousPayload: state.previousSession && state.previousSession.payload ? state.previousSession.payload.displayName || state.previousSession.payload : "",
      previousLastTimestamp: state.previousSession ? state.previousSession.lastEventAt || state.previousSession.sessionStartedAt || "" : "",
      cacheStatus: state.cache,
      storageStatus: state.storage,
      onlineState: state.onlineState,
      javaScriptErrors: state.jsErrors,
      resourceErrors: state.resourceErrors,
      testerSelectedOutcome: state.testerOutcome,
      testerAlias: state.testerAlias,
      testerNotes: state.testerNotes,
      includeDiagnostics: state.includeDiagnostics,
      consentConfirmed: !!(firstElementById("community-consent", "report-review-confirm") && firstElementById("community-consent", "report-review-confirm").checked),
      evidence: {
        previousSessionIncomplete: !state.previousSessionCompleted ? "OBSERVED" : "OBSERVED",
        testerSelectedOutcome: state.testerOutcome ? "TESTER-REPORTED" : "OBSERVED"
      },
      research: {
        researchMode: state.research.researchMode,
        candidate: state.research.candidate,
        candidateStatus: state.research.candidateStatus,
        entryReady: state.research.entryReady,
        candidateReady: state.research.candidateReady,
        kernelFaultObserved: state.research.kernelFaultObserved,
        kernelLeak: state.research.kernelLeak,
        kernelRead: state.research.kernelRead,
        kernelWrite: state.research.kernelWrite,
        kernelExecution: state.research.kernelExecution,
        lastResearchStage: state.research.lastResearchStage,
        slopkitAttempt: state.attempts,
        slopkitLastStage: state.lastStage,
        carrierState: /SLOPKIT-CARRIER-OBTAINED/.test(state.lastStage) ? "OBTAINED" : "NOT OBTAINED",
        windowPState: /SLOPKIT-WINDOW-P-INSTALLED/.test(state.lastStage) ? "INSTALLED" : "NOT INSTALLED",
        readPrimitiveState: /SLOPKIT-READ-VERIFIED|READ-PRIMITIVE-PASS/.test(state.lastStage) ? "VERIFIED" : "NOT VERIFIED",
        writePrimitiveState: /SLOPKIT-WRITE-VERIFIED/.test(state.lastStage) ? "VERIFIED" : "NOT VERIFIED",
        userlandARWState: /USERLAND-ARW-VERIFIED/.test(state.lastStage) ? "VERIFIED" : "NOT VERIFIED",
        nativeSyscallState: "LOCKED",
        celsiusState: "LOCKED",
        kernelFaultState: state.research.kernelFaultObserved ? "OBSERVED" : "NOT OBSERVED",
        kernelReadState: state.research.kernelRead ? "VERIFIED" : "NOT VERIFIED",
        kernelWriteState: state.research.kernelWrite ? "VERIFIED" : "NOT VERIFIED",
        kernelExecutionState: state.research.kernelExecution ? "VERIFIED" : "NOT VERIFIED"
      }
    };
    if (state.includeUserAgent) report.userAgent = navigator.userAgent || "";
    report.diagnostics = state.includeDiagnostics ? sessionRecords : [];
    report.diagnosticRecords = report.diagnostics;
    return report;
  }

  function downloadJson(filename, value) {
    if (typeof Blob === "undefined" || !window.URL || typeof window.URL.createObjectURL !== "function") {
      emit("FAIL", "DOWNLOAD-UNAVAILABLE", "Blob download is unavailable on this browser.", { category: "COMMUNITY" });
      setSubmissionStatus("JSON download is unavailable on this browser.", "bad");
      return false;
    }
    var blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    return true;
  }

  function exportLog() {
    downloadJson("ps4-webkit-diagnostics-" + state.buildId + "-" + state.sessionId + ".json", {
      schema: DIAG_SCHEMA,
      snapshot: buildSnapshot(),
      currentSessionRecords: currentSessionRecords(),
      records: state.records
    });
  }

  function downloadCommunityReport() {
    var report = buildCommunityReport();
    downloadJson("NEXT-Community-Report-" + report.reportId + ".json", report);
  }

  function setSubmissionStatus(message, kind) {
    var element = document.getElementById("submission-status");
    var summary = document.getElementById("diag-submission-state");
    if (!element) return;
    element.textContent = message || "";
    element.className = kind ? "status-box " + kind : "status-box";
    if (summary) summary.textContent = message || "";
  }

  function reportEndpoint() {
    return sanitizeText(window.NEXT_COMMUNITY_REPORT_ENDPOINT || "", 260);
  }

  function parseSubmissionResponse(xhr) {
    var parsed = safeJsonParse(xhr && xhr.responseText ? xhr.responseText : "", null);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  }

  function formatSubmissionSuccess(parsed) {
    var submissionId = sanitizeText(parsed && parsed.submissionId ? parsed.submissionId : "", 64);
    var receivedAt = sanitizeText(parsed && parsed.receivedAt ? parsed.receivedAt : "", 64);
    var message = "REPORT SUBMITTED. Submission ID: " + submissionId + ".";
    if (receivedAt) message += " Received: " + receivedAt + ".";
    message += " The report was received by the NEXT private report server.";
    return message;
  }

  function setUnavailableSubmissionStatus() {
    setSubmissionStatus("PRIVATE REPORT SERVER UNAVAILABLE. The report was not submitted. Use Try Again, Download Full Report, or Copy Short Summary.", "bad");
  }

  function classifySubmissionFailure(xhr) {
    var response = parseSubmissionResponse(xhr) || {};
    var httpStatus = xhr ? xhr.status : 0;
    if (httpStatus === 400) {
      return {
        stage: "COMMUNITY-REPORT-SUBMIT-FAIL",
        message: "REPORT REJECTED. The private report server rejected this report. Your report is still stored locally.",
        kind: "bad"
      };
    }
    if (httpStatus === 413) {
      return {
        stage: "COMMUNITY-REPORT-SUBMIT-FAIL",
        message: "REPORT TOO LARGE. The report was not submitted. Use Download Full Report or Copy Short Summary.",
        kind: "bad"
      };
    }
    if (httpStatus === 429 || response.error === "rate-limited") {
      return {
        stage: "COMMUNITY-REPORT-RATE-LIMITED",
        message: "RATE LIMITED. The private report server asked you to retry later. Your report is still stored locally.",
        kind: "warn"
      };
    }
    if (httpStatus >= 500) {
      return {
        stage: "COMMUNITY-REPORT-SUBMIT-FAIL",
        message: "SERVER ERROR. The report was not submitted. Use Try Again, Download Full Report, or Copy Short Summary.",
        kind: "bad"
      };
    }
    return {
      stage: "COMMUNITY-REPORT-SUBMIT-FAIL",
      message: "SERVER UNREACHABLE OR REPORT FAILED. Your report is still stored locally.",
      kind: "bad"
    };
  }

  function githubReportUrl(report) {
    var title = "[Diagnostics] " + (report.firmware || "Unknown") + " / " + (report.backend.backendSelected || "Unknown") + " / " + (report.lastStage || "Unknown");
    var body = buildGithubSummary(report);
    return PUBLIC_GITHUB_REPORT_URL + "?title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(body);
  }

  function preserveCurrentReportState() {
    persistSession();
    persistRecords();
    persistReportId();
  }

  function openGithubShortReport(report) {
    var issueUrl = githubReportUrl(report);
    preserveCurrentReportState();
    if (issueUrl.length > MAX_GITHUB_URL_LENGTH) {
      emit("FAIL", "COMMUNITY-REPORT-GITHUB-URL-TOO-LONG", "GitHub fallback was blocked because the short summary still exceeded the conservative browser limit.", { category: "COMMUNITY", urlLength: issueUrl.length });
      setSubmissionStatus("Report too large for GitHub browser fallback. Your complete report has been preserved. Choose \"Download Full Report\" and send the JSON file to KillerNoS.", "bad");
      return false;
    }
    downloadCommunityReport();
    emit("INFO", "COMMUNITY-REPORT-GITHUB-FALLBACK", "Public GitHub issue draft opened with a short summary only.", { category: "COMMUNITY", urlLength: issueUrl.length });
    try {
      window.open(issueUrl, "_blank");
      return true;
    } catch (error) {
      setSubmissionStatus("GitHub fallback could not be opened automatically. Use Download Full Report or Copy Short Summary.", "bad");
      return false;
    }
  }

  function submitCommunityReport() {
    var confirmBox = firstElementById("community-consent", "report-review-confirm");
    var endpoint = reportEndpoint();
    var report;
    if (!confirmBox || !confirmBox.checked) {
      emit("FAIL", "COMMUNITY-REPORT-NOT-CONFIRMED", "Review confirmation is required before submission.", { category: "COMMUNITY" });
      setSubmissionStatus("Review confirmation is required before submission.", "bad");
      return false;
    }
    report = buildCommunityReport();
    if (!endpoint) {
      emit("FAIL", "COMMUNITY-REPORT-ENDPOINT-MISSING", "No private report endpoint is configured.", { category: "COMMUNITY" });
      preserveCurrentReportState();
      setSubmissionStatus("ENDPOINT NOT CONFIGURED. The report was not submitted. Use Download Full Report, Copy Short Summary, or the optional manual GitHub short report.", "warn");
      return false;
    }
    try {
      var xhr = new XMLHttpRequest();
      emit("INFO", "COMMUNITY-REPORT-SUBMIT-BEGIN", "Community report submission started.", { category: "COMMUNITY" });
      xhr.open("POST", endpoint, true);
      xhr.timeout = 15000;
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.onreadystatechange = function () {
        var parsed;
        var failure;
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          parsed = parseSubmissionResponse(xhr);
          if (!parsed || parsed.ok !== true || !parsed.submissionId) {
            emit("FAIL", "COMMUNITY-REPORT-SUBMIT-FAIL", "Private report server returned an invalid success response.", { category: "COMMUNITY", httpStatus: xhr.status });
            preserveCurrentReportState();
            setSubmissionStatus("SERVER ERROR. The private report server returned an invalid response. Your report is still stored locally.", "bad");
            return;
          }
          emit("PASS", "COMMUNITY-REPORT-SUBMITTED", "Community report submitted to the configured endpoint.", { category: "COMMUNITY", submissionId: sanitizeText(parsed.submissionId, 64) });
          setSubmissionStatus(formatSubmissionSuccess(parsed), "ok");
          return;
        }
        failure = classifySubmissionFailure(xhr);
        emit("FAIL", failure.stage, "Community report submission failed.", {
          category: "COMMUNITY",
          httpStatus: xhr.status
        });
        preserveCurrentReportState();
        setSubmissionStatus(failure.message, failure.kind);
      };
      xhr.onerror = function () {
        emit("FAIL", "COMMUNITY-REPORT-SUBMIT-FAIL", "Private report server was unreachable.", { category: "COMMUNITY" });
        preserveCurrentReportState();
        setUnavailableSubmissionStatus();
      };
      xhr.ontimeout = function () {
        emit("FAIL", "COMMUNITY-REPORT-SUBMIT-FAIL", "Private report server timed out.", { category: "COMMUNITY" });
        preserveCurrentReportState();
        setUnavailableSubmissionStatus();
      };
      preserveCurrentReportState();
      xhr.send(JSON.stringify(report));
      setSubmissionStatus("Submitting community report...", "warn");
      return true;
    } catch (error) {
      emit("FAIL", "COMMUNITY-REPORT-SUBMIT-ERROR", sanitizeText(error && error.message ? error.message : String(error), 200), { category: "COMMUNITY" });
      preserveCurrentReportState();
      setSubmissionStatus("Report submission failed. Your report is still stored locally.", "bad");
      return false;
    }
  }

  function copySummary() {
    var summary = buildSummaryText();
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      emit("FAIL", "COPY-SUMMARY-UNAVAILABLE", "Clipboard API is unavailable on this browser.");
      return false;
    }
    navigator.clipboard.writeText(summary).then(function () {
      emit("PASS", "COPY-SUMMARY", "Diagnostic summary copied to clipboard.");
    }, function () {
      emit("FAIL", "COPY-SUMMARY-FAILED", "Clipboard write failed.");
    });
    return true;
  }

  function renderFilters() {
    var buttons = document.querySelectorAll("[data-filter]");
    var index;
    for (index = 0; index < buttons.length; index++) {
      var active = buttons[index].getAttribute("data-filter") === state.currentFilter;
      buttons[index].setAttribute("aria-pressed", active ? "true" : "false");
      if (active) buttons[index].classList.add("is-active");
      else buttons[index].classList.remove("is-active");
    }
  }

  function renderReportPreview() {
    var endpoint = reportEndpoint();
    var target = document.getElementById("report-target");
    var warning = document.getElementById("report-warning");
    var submitButton = firstElementById("community-submit", "submit-report");
    var confirmBox = firstElementById("community-consent", "report-review-confirm");
    var reportPreview = document.getElementById("report-preview");
    if (reportPreview) writeScrollableText("report-preview", JSON.stringify(buildCommunityReport(), null, 2));
    var summary = document.getElementById("diag-summary");
    if (summary) summary.textContent = buildSummaryText();
    if (target) target.textContent = endpoint ? "Private endpoint configured: " + endpoint : "Private endpoint not configured";
    if (warning) warning.textContent = endpoint
      ? "Reports remain opt-in. The preview below is the JSON that will be sent to the configured private endpoint."
      : "ENDPOINT NOT CONFIGURED. Private submission is disabled until window.NEXT_COMMUNITY_REPORT_ENDPOINT is set to a verified HTTPS API URL. GitHub remains manual and short-summary only.";
    if (submitButton) submitButton.disabled = !(confirmBox && confirmBox.checked);
  }

  function renderLog() {
    var log = document.getElementById("log");
    var count = document.getElementById("diag-log-count");
    if (!log) return;
    var filtered = getFilteredRecords();
    var lines = [];
    var index;
    if (count) count.textContent = "(" + filtered.length + (filtered.length === 1 ? " entry)" : " entries)");
    for (index = 0; index < filtered.length; index++) {
      var record = filtered[index];
      lines.push("[" + record.timestamp + "] [" + record.sessionId + "] [" + record.category + "] [" + record.status + "] [" + (record.evidence || "OBSERVED") + "] " + record.stage + (record.message ? " " + record.message : ""));
    }
    writeScrollableText("log", lines.join("\n") || "No diagnostic records.");
  }

  function render() {
    var firmware = state.firmware || detectFirmware();
    var entrypoint = state.testerEntrypoint || (state.page.pageName === "NEXT-1302-RESEARCH" ? "SlopKit" : (state.backend.selected || "Unknown"));
    var userlandArw = /USERLAND-ARW-VERIFIED/.test(state.lastStage) ? "VERIFIED" : "UNVERIFIED";
    setText("diag-firmware", firmware.firmware || "Unknown");
    setText("diag-firmware-source", firmware.firmwareSource || "unknown");
    setText("diag-hardware-detected", formatBoolLabel(!!firmware.hardwareDetected, "Yes", "No"));
    setText("diag-simulated", formatBoolLabel(!!firmware.simulated, "Yes", "No"));
    setText("diag-backend", state.backend.selected || "Unknown");
    setText("diag-payload", state.payload.displayName || "Unknown");
    setText("diag-build", state.buildId || "Unknown");
    setText("diag-next-access", state.runtime.nextAccess || "UNSUPPORTED");
    setText("diag-runtime-status", state.runtime.runtimeMode === "runtime" ? "CONFIGURED RUNTIME" : (state.runtime.runtimeMode ? String(state.runtime.runtimeMode).toUpperCase().replace(/_/g, " ") : "UNSUPPORTED"));
    setText("diag-hardware-verification", state.runtime.hardwareVerification || "UNVERIFIED");
    setText("diag-hen", state.hen.displayName || "No HEN");
    setText("diag-cache-revision", state.cacheRevision || "Unknown");
    setText("diag-online", state.onlineState || "unknown");
    setText("diag-page", state.page.pageName || "UNKNOWN");
    setText("diag-page-path", state.page.relativePath || "./");
    setText("diag-session-id", state.sessionId || "Unknown");
    setText("diag-session-start", state.sessionStartedAt || "Unknown");
    setText("diag-elapsed", state.sessionStartedAt ? String(Math.max(0, Date.parse(nowIso()) - Date.parse(state.sessionStartedAt))) + " ms" : "0 ms");
    setText("diag-last-stage", state.lastStage || "Not reported");
    setText("diag-normalized-stage", state.lastNormalizedStage || "Not reported");
    setText("diag-attempts", String(state.attempts));
    setText("diag-passes", String(state.passes));
    setText("diag-failures", String(state.failures));
    setText("diag-cache-state", state.cache.status || "CACHE-UNKNOWN");
    setText("diag-storage-local", state.storage.localStorage || "unknown");
    setText("diag-storage-session", state.storage.sessionStorage || "unknown");
    setText("diag-js-errors", String(state.jsErrors));
    setText("diag-resource-errors", String(state.resourceErrors));
    setText("diag-console-model", state.consoleModel || "Unknown");
    setText("diag-previous-status", formatPreviousSession());
    setText("diag-previous-stage", state.previousSession ? state.previousSession.lastStage || "Unknown" : "None");
    setText("diag-previous-normalized-stage", state.previousSession ? state.previousSession.lastNormalizedStage || "None" : "None");
    setText("diag-previous-completion", state.previousSessionCompleted ? "Complete" : "Incomplete");
    setText("diag-user-agent", navigator.userAgent || "Unavailable");
    setText("diag-schema", DIAG_SCHEMA);
    setText("diag-tester-outcome", state.testerOutcome || "Not provided");
    setText("diag-submission-state", document.getElementById("submission-status") ? document.getElementById("submission-status").textContent : "Submission is idle.");
    setText("diag-entrypoint", entrypoint);
    setText("diag-candidate", state.testerCandidate || state.research.candidate || "None");
    setText("diag-userland-arw", userlandArw);
    setText("diag-kernel-fault-state", observedOrUnverified(state.research.kernelFaultObserved));
    setText("diag-kernel-read-state", researchVerificationState(state.research.kernelRead));
    setText("diag-kernel-write-state", researchVerificationState(state.research.kernelWrite));
    setText("diag-kernel-execution-state", researchVerificationState(state.research.kernelExecution));
    setText("diag-research-stage", state.research.lastResearchStage || state.lastStage || "Not reported");
    setText("diag-research-summary", buildResearchSummary());
    setValue("community-console-model", state.consoleModel);
    setValue("community-entrypoint", state.testerEntrypoint || "Unknown");
    setValue("community-candidate", state.testerCandidate || "None");
    setValue("community-outcome", state.testerOutcome);
    setValue("community-alias", state.testerAlias);
    setValue("community-notes", state.testerNotes);
    setChecked("community-include-log", state.includeDiagnostics);
    setChecked("community-include-ua", state.includeUserAgent);
    setText("diag-js-state", "LOADED");
    renderFilters();
    renderLog();
    renderReportPreview();
  }

  function beginAttempt(message, details) {
    return emit("INFO", "ATTEMPT-BEGIN", message || "Attempt started.", details || { category: "ROUTING" });
  }

  function reset() {
    state.records = [];
    state.attempts = 0;
    state.passes = 0;
    state.failures = 0;
    state.lastStage = "Not reported";
    state.lastNormalizedStage = "Not reported";
    state.resourceErrors = 0;
    state.jsErrors = 0;
    state.sessionCompleted = false;
    state.hen = {
      family: "none",
      selection: "none",
      displayName: "No HEN",
      identifier: "none",
      version: null,
      payloadPath: null,
      loaderReference: "skip",
      evidence: "source-confirmed",
      compatibility: "skipped",
      requested: false,
      attempted: false,
      status: "SKIPPED",
      error: ""
    };
    resetReportId();
    persistSession();
    persistRecords();
    emit("INFO", "BOOT", "Diagnostic log reset.");
  }

  function markPage(pageName, relativePath) {
    updateRuntimeState({ pageName: pageName, relativePath: relativePath });
    emit("INFO", "PAGE-ENTER", pageName + " loaded.", { category: "ROUTING" });
  }

  function markLaunch(info) {
    info = info || {};
    if (info.runtime) updateRuntimeState({ runtime: info.runtime, backend: info.runtime.runtimeBackend || info.backend || state.backend.selected });
    emit("INFO", "LAUNCH-MARKED", info.message || "Launch requested.", { category: "ROUTING", launch: info });
  }

  function markPayload(payload) {
    state.payload = {
      id: payload && payload.id ? payload.id : state.payload.id,
      displayName: payload && payload.displayName ? payload.displayName : state.payload.displayName,
      version: payload && payload.version ? payload.version : state.payload.version,
      path: payload && payload.path ? payload.path : state.payload.path,
      verificationStatus: payload && payload.verificationStatus ? payload.verificationStatus : state.payload.verificationStatus,
      byteSize: payload && payload.byteSize ? payload.byteSize : state.payload.byteSize,
      sha256: payload && payload.sha256 ? payload.sha256 : state.payload.sha256,
      firmwareCompatible: payload && payload.firmwareCompatible !== undefined ? !!payload.firmwareCompatible : state.payload.firmwareCompatible,
      recommended: payload && payload.recommended !== undefined ? !!payload.recommended : state.payload.recommended,
      actualSize: payload && payload.actualSize ? payload.actualSize : state.payload.actualSize,
      actualSha256: payload && payload.actualSha256 ? payload.actualSha256 : state.payload.actualSha256
    };
    persistSession();
    emit("INFO", "PAYLOAD-SELECTED", state.payload.displayName || "Unknown payload", { category: "PAYLOAD" });
  }

  function markHen(info) {
    info = info || {};
    state.hen = {
      family: info.family || state.hen.family,
      selection: info.selection || info.identifier || state.hen.selection,
      displayName: info.displayName || state.hen.displayName,
      identifier: info.identifier || info.selection || state.hen.identifier,
      version: info.version !== undefined ? info.version : state.hen.version,
      payloadPath: info.payloadPath !== undefined ? info.payloadPath : state.hen.payloadPath,
      loaderReference: info.loaderReference !== undefined ? info.loaderReference : state.hen.loaderReference,
      evidence: info.evidence !== undefined ? info.evidence : state.hen.evidence,
      compatibility: info.compatibility !== undefined ? info.compatibility : state.hen.compatibility,
      requested: info.requested !== undefined ? !!info.requested : state.hen.requested,
      attempted: info.attempted !== undefined ? !!info.attempted : state.hen.attempted,
      status: info.status || state.hen.status,
      error: info.error !== undefined ? info.error : state.hen.error
    };
    persistSession();
    emit(/FAIL|ERROR/.test(state.hen.status) ? "FAIL" : "INFO", "HEN-SELECTION", state.hen.displayName || "No HEN", {
      category: "PAYLOAD",
      henFamily: state.hen.family,
      henSelection: state.hen.selection,
      henDisplayName: state.hen.displayName,
      henIdentifier: state.hen.identifier,
      henVersion: state.hen.version,
      henPayloadPath: state.hen.payloadPath,
      henLoaderReference: state.hen.loaderReference,
      henEvidence: state.hen.evidence,
      henCompatibility: state.hen.compatibility,
      henLoadRequested: state.hen.requested,
      henLoadAttempted: state.hen.attempted,
      henLoadStatus: state.hen.status,
      henLoadError: state.hen.error
    });
  }

  function markBackend(backendInfo) {
    backendInfo = backendInfo || {};
    if (backendInfo.selected) state.backend.selected = backendInfo.selected;
    if (backendInfo.entered !== undefined) state.backend.entered = !!backendInfo.entered;
    if (backendInfo.completed !== undefined) state.backend.completed = !!backendInfo.completed;
    if (backendInfo.failed !== undefined) state.backend.failed = !!backendInfo.failed;
    persistSession();
    emit("INFO", "BACKEND-SELECTED", state.backend.selected || "Unknown", { category: "ROUTING", backend: state.backend });
  }

  function markCacheState(cacheInfo) {
    cacheInfo = cacheInfo || {};
    if (cacheInfo.status) state.cache.status = cacheInfo.status;
    if (cacheInfo.revision) state.cache.revision = cacheInfo.revision;
    if (cacheInfo.buildRevision) state.cache.buildRevision = cacheInfo.buildRevision;
    if (cacheInfo.offline) state.cache.offline = cacheInfo.offline;
    persistSession();
    emit("INFO", state.cache.status || "CACHE-UNKNOWN", cacheInfo.message || "Cache state recorded.", { category: "CACHE", cache: state.cache });
  }

  function markResourceError(resourcePath, info) {
    var sanitizedPath = sanitizePath(resourcePath || "");
    emit("FAIL", "RESOURCE-LOAD-FAIL", sanitizedPath || "Unknown resource", {
      category: "RESOURCE",
      resourcePath: sanitizedPath,
      resourceType: info && info.resourceType ? sanitizeText(info.resourceType, 40) : "unknown"
    });
  }

  function markStorageError(kind, info) {
    var key = kind === "localStorage" ? "localStorage" : kind === "sessionStorage" ? "sessionStorage" : kind;
    if (key && state.storage[key] !== undefined) state.storage[key] = "fail";
    emit("FAIL", (kind === "localStorage" ? "STORAGE-LOCAL-FAIL" : kind === "sessionStorage" ? "STORAGE-SESSION-FAIL" : "STORAGE-FAIL"), sanitizeText(info || (kind + " unavailable"), 200), {
      category: "STORAGE",
      storageKind: kind
    });
  }

  function markPreviousSessionIncomplete(previous) {
    state.previousSession = previous;
    state.previousSessionCompleted = false;
    emit("INFO", "PREVIOUS-SESSION-INCOMPLETE", "Unexpected termination suspected. Cause not verified.", {
      category: "RECOVERY",
      previousSession: previous,
      evidence: "OBSERVED"
    });
  }

  function beginSession(seed) {
    state.records = loadRecords();
    var active = readStoredJson("sessionStorage", ACTIVE_SESSION_KEY, null);
    var previous = readStoredJson("localStorage", SESSION_KEY, null);
    var previousSnapshot = readStoredJson("localStorage", PREVIOUS_KEY, null);
    var handoff = readHandoff();
    var detectedFirmware = detectFirmware();
    var researchMode = queryParam("research") === "1";
    var researchCandidate = researchMode && detectedFirmware.firmware === "13.02" ? "Celsius / ffs_mountfs" : "";
    var currentPage = detectPageInfo();
    state.page = currentPage;
    state.onlineState = navigator.onLine === true ? "online" : navigator.onLine === false ? "offline" : "unknown";
    var build = currentBuild();
    state.buildId = build.buildId;
    state.cacheRevision = build.cacheRevision;
    state.diagnosticsSchema = DIAG_SCHEMA;
    state.researchBuildId = build.researchBuildId;
    state.reportId = readStoredText("sessionStorage", REPORT_ID_KEY) || readStoredText("localStorage", REPORT_ID_KEY) || "";
    if (previousSnapshot && previousSnapshot.sessionId) {
      state.previousSession = previousSnapshot;
      state.previousSessionCompleted = !!previousSnapshot.sessionCompleted;
    } else {
      state.previousSession = null;
      state.previousSessionCompleted = true;
    }

    if (active && active.sessionId) {
      applyStoredSession(active, {
        firmware: detectedFirmware,
        onlineState: state.onlineState,
        page: currentPage
      });
      updateRuntimeState({
        researchMode: researchMode,
        researchCandidate: researchCandidate,
        candidateStatus: researchCandidate ? "research" : state.research.candidateStatus
      });
      updateRuntimeState(seed || {});
      recountCurrentSession();
      persistSession();
      return;
    }

    if (handoff && handoff.sessionId && handoff.snapshot && handoff.snapshot.sessionId === handoff.sessionId) {
      var targetPath = sanitizePath(currentPage.relativePath || currentPagePath());
      if (!handoff.targetPath || handoff.targetPath === targetPath) {
        applyStoredSession(handoff.snapshot, {
          firmware: detectedFirmware,
          onlineState: state.onlineState,
          page: currentPage
        });
        updateRuntimeState({
          researchMode: researchMode,
          researchCandidate: researchCandidate,
          candidateStatus: researchCandidate ? "research" : state.research.candidateStatus
        });
        updateRuntimeState(seed || {});
        recountCurrentSession();
        persistSession();
        clearHandoff();
        return;
      }
    }

    if (previous && previous.sessionId) {
      persistPrevious(previous);
      state.previousSession = previous;
      state.previousSessionCompleted = !!previous.sessionCompleted;
    }
    state.sessionId = makeId("NEXT-SESSION-");
    state.sessionStartedAt = nowIso();
    state.lastEventAt = state.sessionStartedAt;
    state.sessionCompleted = false;
    state.firmware = detectedFirmware;
    updateRuntimeState({
      researchMode: researchMode,
      researchCandidate: researchCandidate,
      candidateStatus: researchCandidate ? "research" : ""
    });
    updateRuntimeState(seed || {});
    recountCurrentSession();
    persistSession();
    emit("INFO", "BOOT", "Diagnostics initialized.");
    emit("INFO", "FW-DETECTED", "Current browser routing state recorded.", { category: "FIRMWARE" });
    if (state.previousSession && !state.previousSession.sessionCompleted) {
      markPreviousSessionIncomplete({
        sessionId: state.previousSession.sessionId,
        firmware: state.previousSession.firmware ? state.previousSession.firmware.firmware || state.previousSession.firmware : "Unknown",
        buildId: state.previousSession.buildId || "Unknown",
        backend: state.previousSession.backend ? state.previousSession.backend.selected || state.previousSession.backend : "Unknown",
        payload: state.previousSession.payload ? state.previousSession.payload.displayName || state.previousSession.payload : "Unknown",
        lastStage: state.previousSession.lastStage || "Unknown",
        lastTimestamp: state.previousSession.lastEventAt || state.previousSession.sessionStartedAt || "Unknown",
        completionState: false,
        interpretation: "Unexpected termination suspected. Cause not verified."
      });
    }
  }

  function endSession(details) {
    if (state.sessionCompleted && state.lastStage === "SESSION-COMPLETE") return;
    state.sessionCompleted = true;
    emit("PASS", "SESSION-COMPLETE", sanitizeText((details && details.message) || "Session marked complete.", 200), {
      category: "DONE"
    });
  }

  function observeRuntimeEvent(stageName, detail, extra) {
    var status = "INFO";
    if (/FAIL|ERROR|THREW|ABORTED|CANCELLED/.test(stageName)) status = "FAIL";
    else if (/PASS|READY|DONE|RUNNING|COMPLETE|OK/.test(stageName)) status = "PASS";
    if (/ATTEMPT-START|ATTEMPT-BEGIN/.test(stageName)) status = "STAGE";
    state.backend.entered = true;
    if (/DONE|SESSION-COMPLETE|PAYLOAD-ALIVE|PAYLOAD-END|KERNEL-PATCHED/.test(stageName)) state.backend.completed = true;
    if (status === "FAIL") state.backend.failed = true;
    if (/KERNEL-RW/.test(stageName)) {
      state.research.kernelRead = true;
      state.research.kernelWrite = true;
    }
    if (/KERNEL-LEAK/.test(stageName)) state.research.kernelLeak = true;
    if (/KEXEC/.test(stageName)) state.research.kernelExecution = true;
    if (/KERNEL-FAULT/.test(stageName)) state.research.kernelFaultObserved = true;
    if (/RESEARCH|CELSIUS|FFS_MOUNTFS|13\.02/.test(stageName)) state.research.lastResearchStage = stageName;
    if (/PAYLOAD-(BLOB|MAP|COPY|RUNNING|ALIVE)/.test(stageName) && state.payload.displayName === "Unknown") {
      state.payload.displayName = "Configured runtime payload";
      state.payload.id = "runtime-payload";
      state.payload.path = "payload.bin";
      state.payload.verificationStatus = "unknown";
      state.payload.byteSize = 0;
      state.payload.sha256 = "";
      state.payload.firmwareCompatible = false;
      state.payload.recommended = false;
      state.payload.actualSize = 0;
      state.payload.actualSha256 = "";
    }
    if (/PAYLOAD-FETCH-FAILED/.test(stageName)) {
      emit("FAIL", "PAYLOAD-LOAD-FAIL", sanitizeText(detail, 240), { category: "PAYLOAD", sourceStage: stageName, attempt: extra && extra.attempt });
      return;
    }
    emit(status, stageName, sanitizeText(detail, 240), {
      category: categorize(stageName),
      attempt: extra && extra.attempt
    });
    if (/VERDICT|STEP-4Q-DONE|PAYLOAD-ALIVE/.test(stageName)) {
      endSession({ message: "Runtime reached a normal completion marker." });
    }
  }

  function captureStorageState() {
    var localOk = storageAvailable("localStorage");
    var sessionOk = storageAvailable("sessionStorage");
    state.storage.localStorage = localOk ? "pass" : "fail";
    state.storage.sessionStorage = sessionOk ? "pass" : "fail";
    state.storage.appCache = window.applicationCache ? "present" : "unavailable";
    state.storage.cacheApi = window.caches ? "present" : "unavailable";
    emit(localOk ? "PASS" : "FAIL", localOk ? "STORAGE-LOCAL-PASS" : "STORAGE-LOCAL-FAIL", localOk ? "localStorage available." : "localStorage unavailable.", { category: "STORAGE" });
    emit(sessionOk ? "PASS" : "FAIL", sessionOk ? "STORAGE-SESSION-PASS" : "STORAGE-SESSION-FAIL", sessionOk ? "sessionStorage available." : "sessionStorage unavailable.", { category: "STORAGE" });
  }

  function captureCacheState() {
    var build = currentBuild();
    state.cache.status = "CACHE-INIT";
    state.cache.revision = build.cacheRevision;
    state.cache.buildRevision = build.buildId;
    state.cache.offline = navigator.onLine === true ? "online" : navigator.onLine === false ? "offline" : "unknown";
    emit("INFO", "CACHE-INIT", "Cache state initialized.", { category: "CACHE" });
    if (window.applicationCache) {
      emit("INFO", "CACHE-CHECK", "AppCache object present.", { category: "CACHE" });
    }
    if (window.caches) {
      emit("PASS", "CACHE-READY", "Cache API detected.", { category: "CACHE" });
      state.cache.status = "CACHE-READY";
    } else {
      emit("INFO", "CACHE-UNKNOWN", "Cache API unavailable.", { category: "CACHE" });
      state.cache.status = "CACHE-UNKNOWN";
    }
  }

  function bindDiagnosticsUi() {
    var resetButton = document.getElementById("reset-log");
    var exportButton = document.getElementById("export-log");
    var downloadButton = firstElementById("community-download", "download-report");
    var copyButton = document.getElementById("copy-summary");
    var selfTestButton = document.getElementById("run-self-test");
    var retryButton = firstElementById("retry-report-submit");
    var githubButton = document.getElementById("open-github-short-report");
    var consoleModel = firstElementById("community-console-model", "console-model");
    var testerEntrypoint = document.getElementById("community-entrypoint");
    var testerCandidate = document.getElementById("community-candidate");
    var testerOutcome = firstElementById("community-outcome", "tester-outcome");
    var testerAlias = firstElementById("community-alias", "tester-alias");
    var testerNotes = firstElementById("community-notes", "tester-notes");
    var includeDiagnostics = document.getElementById("community-include-log");
    var includeUserAgent = firstElementById("community-include-ua", "include-user-agent");
    var submitButton = firstElementById("community-submit", "submit-report");
    var confirmBox = firstElementById("community-consent", "report-review-confirm");
    var filterButtons = document.querySelectorAll("[data-filter]");
    var scrollButtons = document.querySelectorAll("[data-scroll-target]");
    var copyViewButtons = document.querySelectorAll("[data-copy-target]");
    var clearViewButtons = document.querySelectorAll("[data-clear-target]");
    var index;

    if (resetButton) resetButton.addEventListener("click", reset);
    if (exportButton) exportButton.addEventListener("click", exportLog);
    if (downloadButton) downloadButton.addEventListener("click", downloadCommunityReport);
    if (copyButton) copyButton.addEventListener("click", copySummary);
    if (submitButton) submitButton.addEventListener("click", submitCommunityReport);
    if (retryButton) retryButton.addEventListener("click", submitCommunityReport);
    if (selfTestButton) selfTestButton.addEventListener("click", selfTest);
    if (githubButton) githubButton.addEventListener("click", function () {
      openGithubShortReport(buildCommunityReport());
    });

    if (consoleModel) {
      consoleModel.addEventListener("change", function () {
        state.consoleModel = allowedConsoleModels[consoleModel.value] ? consoleModel.value : "Unknown";
        persistSettings();
        render();
      });
    }
    if (testerEntrypoint) {
      testerEntrypoint.addEventListener("change", function () {
        state.testerEntrypoint = sanitizeText(testerEntrypoint.value, 80) || "Unknown";
        persistSettings();
        renderReportPreview();
      });
    }
    if (testerCandidate) {
      testerCandidate.addEventListener("change", function () {
        state.testerCandidate = sanitizeText(testerCandidate.value, 120) || "None";
        persistSettings();
        renderReportPreview();
      });
    }
    if (testerOutcome) {
      testerOutcome.addEventListener("change", function () {
        state.testerOutcome = sanitizeText(testerOutcome.value, 80);
        persistSettings();
        renderReportPreview();
      });
    }
    if (testerAlias) {
      testerAlias.addEventListener("input", function () {
        state.testerAlias = sanitizeText(testerAlias.value, 80);
        persistSettings();
        renderReportPreview();
      });
    }
    if (testerNotes) {
      testerNotes.addEventListener("input", function () {
        state.testerNotes = sanitizeText(testerNotes.value, 2000);
        persistSettings();
        renderReportPreview();
      });
    }
    if (includeUserAgent) {
      includeUserAgent.addEventListener("change", function () {
        state.includeUserAgent = !!includeUserAgent.checked;
        persistSettings();
        renderReportPreview();
      });
    }
    if (includeDiagnostics) {
      includeDiagnostics.addEventListener("change", function () {
        state.includeDiagnostics = !!includeDiagnostics.checked;
        persistSettings();
        renderReportPreview();
      });
    }
    if (confirmBox) {
      confirmBox.addEventListener("change", renderReportPreview);
    }

    for (index = 0; index < filterButtons.length; index++) {
      filterButtons[index].addEventListener("click", function () {
        state.currentFilter = this.getAttribute("data-filter") || "all";
        render();
      });
    }

    for (index = 0; index < scrollButtons.length; index++) {
      scrollButtons[index].addEventListener("click", function () {
        scrollPanelToNewest(this.getAttribute("data-scroll-target") || "");
      });
    }

    for (index = 0; index < copyViewButtons.length; index++) {
      copyViewButtons[index].addEventListener("click", function () {
        copyPanelText(this.getAttribute("data-copy-target") || "");
      });
    }

    for (index = 0; index < clearViewButtons.length; index++) {
      clearViewButtons[index].addEventListener("click", function () {
        clearPanelView(this.getAttribute("data-clear-target") || "");
      });
    }
  }

  function installErrorCapture() {
    window.onerror = function (message, source, line, column, error) {
      emit("FAIL", "JS-ERROR", sanitizeText(message || "Unknown error", 240), {
        category: "ERROR",
        filename: sanitizePath(source || ""),
        line: line || 0,
        column: column || 0,
        errorName: error && error.name ? sanitizeText(error.name, 80) : "Error"
      });
      return false;
    };
    if (typeof window.onunhandledrejection !== "undefined") {
      window.onunhandledrejection = function (event) {
        var reason = event && event.reason;
        emit("FAIL", "UNHANDLED-PROMISE", sanitizeText(reason && reason.message ? reason.message : String(reason || "Unhandled promise rejection"), 240), {
          category: "ERROR",
          errorName: reason && reason.name ? sanitizeText(reason.name, 80) : "PromiseRejection"
        });
      };
    }
  }

  function installResourceCapture() {
    window.addEventListener("error", function (event) {
      var target = event && event.target;
      if (!target || target === window) return;
      var url = target.src || target.href || "";
      var tag = target.tagName ? target.tagName.toLowerCase() : "resource";
      markResourceError(url, { resourceType: tag });
    }, true);
  }

  function installLifecycleCapture() {
    window.addEventListener("beforeunload", function () {
      persistSession();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") persistSession();
    });
  }

  function installOnlineCapture() {
    window.addEventListener("online", function () {
      state.onlineState = "online";
      emit("INFO", "NETWORK-ONLINE", "navigator.onLine reported online.", { category: "COMMUNITY" });
    });
    window.addEventListener("offline", function () {
      state.onlineState = "offline";
      emit("INFO", "NETWORK-OFFLINE", "navigator.onLine reported offline.", { category: "COMMUNITY" });
    });
  }

  function selfTest() {
    var query = "";
    try {
      query = location.search || "";
    } catch (error) { }
    var output = document.getElementById("diag-self-test-results");
    var results = [];
    function pushResult(name, status, detail) {
      results.push(name + ": " + status + (detail ? " - " + detail : ""));
    }
    function testFeature(name, fn) {
      try {
        pushResult(name, fn() ? "PASS" : "FAIL", "");
      } catch (error) {
        pushResult(name, "UNAVAILABLE", sanitizeText(error && error.message ? error.message : String(error), 120));
      }
    }
    if (!/[?&]diagSelfTest=1(?:&|$)/.test(query) && !output) return false;
    emit("INFO", "TEST-INFO", "Diagnostics self-test started.", { category: "COMMUNITY" });
    testFeature("JavaScript executing", function () { return true; });
    testFeature("DOM access", function () { return !!document.getElementById("diag-firmware"); });
    testFeature("localStorage", function () { return storageAvailable("localStorage"); });
    testFeature("sessionStorage", function () { return storageAvailable("sessionStorage"); });
    testFeature("JSON", function () { return !!(window.JSON && typeof JSON.stringify === "function" && typeof JSON.parse === "function"); });
    testFeature("Blob availability", function () { return typeof Blob !== "undefined"; });
    testFeature("URL.createObjectURL availability", function () { return !!(window.URL && typeof window.URL.createObjectURL === "function"); });
    testFeature("fetch availability", function () { return typeof window.fetch === "function"; });
    testFeature("navigator.onLine", function () { return typeof navigator.onLine !== "undefined"; });
    if (output) writeScrollableText("diag-self-test-results", results.join("\n"));
    emit("PASS", "TEST-PASS", "Diagnostics self-test completed.", { category: "COMMUNITY", results: results });
    return true;
  }

  function safeCall(fn) {
    try {
      return fn();
    } catch (error) {
      return null;
    }
  }

  safeCall(loadSettings);
  safeCall(beginSession);
  safeCall(installErrorCapture);
  safeCall(installResourceCapture);
  safeCall(installLifecycleCapture);
  safeCall(installNavigationHandoff);
  safeCall(installOnlineCapture);
  safeCall(captureStorageState);
  safeCall(captureCacheState);

  window.PS4Diag = {
    stage: function (name, details, extra) { return emit("STAGE", name, details, extra); },
    info: function (name, details, extra) { return emit("INFO", name, details, extra); },
    pass: function (name, details, extra) { return emit("PASS", name, details, extra); },
    fail: function (name, details, extra) { return emit("FAIL", name, details, extra); },
    reset: reset,
    exportLog: exportLog,
    buildCommunityReport: buildCommunityReport,
    downloadCommunityReport: downloadCommunityReport,
    submitCommunityReport: submitCommunityReport,
    openGithubShortReport: openGithubShortReport,
    beginAttempt: beginAttempt,
    beginSession: beginSession,
    endSession: endSession,
    markLaunch: markLaunch,
    markPayload: markPayload,
    markHen: markHen,
    markBackend: markBackend,
    markCacheState: markCacheState,
    markResourceError: markResourceError,
    markStorageError: markStorageError,
    markPreviousSessionIncomplete: markPreviousSessionIncomplete,
    markPage: markPage,
    observeRuntimeEvent: observeRuntimeEvent,
    copySummary: copySummary,
    getSnapshot: buildSnapshot,
    selfTest: selfTest
  };

  document.addEventListener("DOMContentLoaded", function () {
    safeCall(function () {
      bindDiagnosticsUi();
    });
    safeCall(function () {
      if (!currentPageRecordExists(state.page.pageName, state.page.relativePath)) {
        markPage(state.page.pageName, state.page.relativePath);
      }
    });
    safeCall(function () {
      render();
    });
    safeCall(function () {
      selfTest();
    });
  });
})();
