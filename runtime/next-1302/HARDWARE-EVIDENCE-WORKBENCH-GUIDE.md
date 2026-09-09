# NEXT Phase 13 — Hardware Evidence Workbench

Phase 13 connects completed 13.02–13.52 live research runs to a strict local hardware-evidence workflow without enabling kernel execution.

## Live observation eligibility

A strict observation export is available only after a manual run has:

- a non-empty per-run `sessionId`;
- firmware provenance from the PS4 user-agent (`firmwareSource: "UA"`);
- `simulation: false` exactly;
- hardware status `hardware`;
- firmware in the inclusive 13.02–13.52 research range;
- a `NEXT-1302-HARDWARE-CONFIRMED` event; and
- a terminal `NEXT-1302-SESSION-COMPLETED` event.

The live page exposes the session ID, firmware source and observation eligibility. `Download Hardware Observation` remains disabled until these conditions are satisfied.

## Strict schema v2

`observation-schema.js` is the shared validator for `NEXT_HARDWARE_OBSERVATION_SESSION` schema version 2. Provenance and scope flags must be explicitly false: `simulated`, `imported`, `queryDerived`, `userEntered`, `storageDerived`, `kernelExecutionObserved`, `kernelWriteObserved` and `henObserved`.

Samples are bounded to 1–10 entries, require unique non-empty keys, and accept JSON scalar values only.

## Firmware coverage

Strict hardware observations accept all firmware from 13.02 through 13.52. Source correlation remains exact-key and exact-firmware-pair research. An observation on an intermediate firmware can be valid hardware evidence even when it has no reviewed source differential to correlate against.

## Evidence Workbench

`hardware-evidence.html` accepts one strict observation or an array. It validates schema/provenance, deduplicates by `sessionId`, reports source-key coverage, runs the existing non-executing triage pipeline, and can export a local workbench report.

Generic SlopKit observations such as `carrierObtained` or `userlandARWVerified` are intentionally not mapped to unrelated BD-J, NetControl, SUID scanner, or kqueue source claims. A queue entry appears only when an observed sample key actually matches a reviewed source key.

## Reproduction boundary

Distinct session IDs represent distinct runs only. They do not prove independent testers, consoles, accounts, or devices. Reproduction counts remain research signals and do not prove a kernel exploit.

## Execution boundary

Phase 13 does not call `runKernelTrigger()`, execute Celsius / `ffs_mountfs`, perform kernel reads or writes, execute shellcode or kexec, launch HEN/GoldHEN, or alter the 12.00 Lapse path.

## CI

`.github/workflows/research-integrity.yml` runs the repository's `tests/test-*.mjs` suite on pull requests that change the 13.xx research runtime, tests, or the workflow itself.
