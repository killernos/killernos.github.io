export const DMEM_OBSERVATION_SCHEMA = "next-dmem0-observation-1";
export const DMEM_CANDIDATE_ID = "DMEM0-KERNEL-LEAK";
export const SUPPORTED_DMEM_FIRMWARE = Object.freeze(["13.02", "13.52"]);

const COLLECTION_PATHS = Object.freeze(["existing-libkernel-fd", "sandbox-open"]);
const FORBIDDEN_RAW_FIELDS = Object.freeze([
  "address",
  "addresses",
  "pointer",
  "pointerValue",
  "kernelBase",
  "dmapAddress",
  "mappedBytes",
  "memoryDump"
]);

function cleanText(value, limit) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, limit || 160);
}

function boundedInteger(value, minimum, maximum) {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum ? value : null;
}

function findForbiddenRawField(value, depth) {
  if (!value || typeof value !== "object" || depth > 8) return "";
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_RAW_FIELDS.indexOf(key) !== -1) return key;
    const nested = findForbiddenRawField(value[key], depth + 1);
    if (nested) return nested;
  }
  return "";
}

export function validateDmemObservation(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, reason: "observation-must-be-an-object" };
  }
  if (input.schema !== DMEM_OBSERVATION_SCHEMA || input.candidateId !== DMEM_CANDIDATE_ID) {
    return { ok: false, reason: "unsupported-observation-schema" };
  }

  const forbiddenField = findForbiddenRawField(input, 0);
  if (forbiddenField) return { ok: false, reason: "raw-memory-data-not-accepted:" + forbiddenField };

  const firmware = cleanText(input.firmware, 16);
  if (SUPPORTED_DMEM_FIRMWARE.indexOf(firmware) === -1) {
    return { ok: false, reason: "unsupported-firmware" };
  }
  if (input.firmwareSource !== "user-agent" || input.hardwareDetected !== true || input.simulated !== false) {
    return { ok: false, reason: "hardware-provenance-required" };
  }
  if (COLLECTION_PATHS.indexOf(input.collectionPath) === -1) {
    return { ok: false, reason: "unsupported-collection-path" };
  }

  const coldBootCount = boundedInteger(input.coldBootCount, 1, 20);
  const independentTesterCount = boundedInteger(input.independentTesterCount, 1, 20);
  if (coldBootCount == null || independentTesterCount == null) {
    return { ok: false, reason: "invalid-reproduction-count" };
  }

  const booleanFields = [
    "mappingObserved",
    "canonicalKernelAddressObserved",
    "dmapSelfPointerObserved",
    "reproducedAcrossColdBoots"
  ];
  if (booleanFields.some(function (key) { return typeof input[key] !== "boolean"; })) {
    return { ok: false, reason: "boolean-observation-fields-required" };
  }
  if (input.reproducedAcrossColdBoots && coldBootCount < 2) {
    return { ok: false, reason: "cold-boot-reproduction-requires-two-boots" };
  }
  if ((input.canonicalKernelAddressObserved || input.dmapSelfPointerObserved) && !input.mappingObserved) {
    return { ok: false, reason: "pointer-class-requires-mapping" };
  }

  const observation = {
    schema: DMEM_OBSERVATION_SCHEMA,
    candidateId: DMEM_CANDIDATE_ID,
    firmware,
    firmwareSource: "user-agent",
    hardwareDetected: true,
    simulated: false,
    collectionPath: input.collectionPath,
    mappingObserved: input.mappingObserved,
    canonicalKernelAddressObserved: input.canonicalKernelAddressObserved,
    dmapSelfPointerObserved: input.dmapSelfPointerObserved,
    coldBootCount,
    reproducedAcrossColdBoots: input.reproducedAcrossColdBoots,
    independentTesterCount,
    researcherNotes: cleanText(input.researcherNotes, 500),
    capability: Object.freeze({
      kernelRead: false,
      kernelWrite: false,
      kernelExecution: false,
      payloadLoading: false,
      hen: false,
      goldHen: false
    })
  };
  return { ok: true, reason: "", observation };
}

export function classifyDmemObservation(input) {
  const validated = validateDmemObservation(input);
  if (!validated.ok) return { ...validated, state: "REJECTED", evidence: "RESEARCH" };
  const item = validated.observation;
  let state = "NOT_OBSERVED";
  if (item.mappingObserved) state = "MAPPING_OBSERVED";
  if (item.canonicalKernelAddressObserved || item.dmapSelfPointerObserved) state = "LEAK_CANDIDATE";
  if (state === "LEAK_CANDIDATE" && item.reproducedAcrossColdBoots) state = "COLD_BOOT_REPRODUCED";
  if (state === "COLD_BOOT_REPRODUCED" && item.independentTesterCount >= 2) state = "INDEPENDENT_REPRODUCTION_CANDIDATE";
  return {
    ok: true,
    reason: "",
    state,
    evidence: "TESTER-REPORTED",
    observation: item,
    securityConclusion: false
  };
}

export function buildDmemResearchSummary(inputs) {
  if (!Array.isArray(inputs) || inputs.length > 40) {
    return { ok: false, reason: "observations-must-be-a-bounded-array" };
  }
  const results = [];
  for (const input of inputs) {
    const classified = classifyDmemObservation(input);
    if (!classified.ok) return classified;
    results.push(classified);
  }
  const firmware = {};
  for (const version of SUPPORTED_DMEM_FIRMWARE) {
    const matches = results.filter(function (item) { return item.observation.firmware === version; });
    firmware[version] = {
      reports: matches.length,
      mappingReports: matches.filter(function (item) { return item.observation.mappingObserved; }).length,
      leakCandidateReports: matches.filter(function (item) {
        return item.observation.canonicalKernelAddressObserved || item.observation.dmapSelfPointerObserved;
      }).length,
      independentReproductionCandidates: matches.filter(function (item) {
        return item.state === "INDEPENDENT_REPRODUCTION_CANDIDATE";
      }).length
    };
  }
  return {
    ok: true,
    schema: "next-dmem0-research-summary-1",
    candidateId: DMEM_CANDIDATE_ID,
    evidence: "TESTER-REPORTED",
    firmware,
    capability: {
      kernelRead: false,
      kernelWrite: false,
      kernelExecution: false,
      payloadLoading: false,
      hen: false,
      goldHen: false
    }
  };
}
