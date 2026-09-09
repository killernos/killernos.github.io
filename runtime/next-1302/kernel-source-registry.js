export const KERNEL_SOURCE_REGISTRY = Object.freeze({
  reportType: "NEXT_KERNEL_SOURCE_LEAD",
  schemaVersion: 1,
  evidenceClass: "SOURCE_CONFIRMED",
  source: {
    owner: "MrHackerYT9054",
    repository: "Kernel-ps4-13.04-13.02",
    file: "kernel.ts",
    commit: "0a9f7ccc5d6c1c6c50e81cdce5d54f0b3ed2e8a5",
    retrievedAt: "2026-09-09T10:22:00-05:00"
  },
  researchScope: {
    firmware: ["13.00", "13.02", "13.04", "13.50", "13.52"],
    purpose: "Firmware differential research and source correlation only",
    automaticExecution: false,
    kernelPatchExecution: false,
    kexecExecution: false,
    henExecution: false
  },
  observations: [
    {
      id: "NEXT-KSRC-001",
      kind: "SOURCE_STRUCTURE",
      status: "SOURCE_CONFIRMED",
      claim: "The upstream file contains firmware-oriented kernel offset data derived from prior PS4 research.",
      eligibleForHardwareMatrix: false
    },
    {
      id: "NEXT-KSRC-002",
      kind: "POST_KEX_CONTENT",
      status: "SOURCE_CONFIRMED",
      claim: "The upstream file also contains kernel-patch shellcode described as post-jailbreak/kexec functionality.",
      eligibleForHardwareMatrix: false
    },
    {
      id: "NEXT-KSRC-003",
      kind: "BOUNDARY_RESEARCH",
      status: "RESEARCH",
      claim: "Use the source as a comparison lead for 13.00 -> 13.02 -> 13.04 and later 13.xx observations; do not treat source offsets as proof of a kernel exploit.",
      eligibleForHardwareMatrix: false
    }
  ],
  promotionRules: {
    sourceLeadMayBecomeHardwareObserved: false,
    requireFirmwareAuthenticatedSession: true,
    requireIndependentReproductionForCandidate: true,
    crashAloneIsExploitEvidence: false,
    timingOnlyEscalationAllowed: false
  }
});

export function buildKernelSourceLeadExport() {
  return JSON.parse(JSON.stringify(KERNEL_SOURCE_REGISTRY));
}
