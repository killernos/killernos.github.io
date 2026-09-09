# NEXT Phase 5 — Evidence Intake and Triage

Created by KillerNoS.

## Purpose
Phase 5 accepts batches of NEXT hardware-observation sessions, validates each session through the existing Phase 3 gate, correlates eligible observations with SOURCE_CONFIRMED firmware differences, feeds those correlations into the Phase 4 review queue, and produces a ranked research report.

## Intake gate
Eligible sessions must already satisfy `validateHardwareObservationSession`: `NEXT_HARDWARE_OBSERVATION_SESSION`, `HARDWARE_OBSERVED`, supported firmware, firmware source `UA`, no simulated/imported/query-derived/user-entered/storage-derived provenance, and 1–10 samples.

Invalid sessions are recorded in `rejected` with validation errors and do not enter correlation or ranking.

## Triage
`processEvidenceBatch()` returns accepted/rejected intake records, Phase 3 correlations, the Phase 4 review queue, and queue summary. `rankResearchQueue()` sorts by review priority and reproduction count. Ranking means research attention only; it is not exploit confidence.

## Hard boundaries
Every Phase 5 report and ranked entry keeps `exploitProven=false`, `kernelExecutionAuthorized=false`, `kernelWriteAuthorized=false`, and `henAuthorized=false`.

Phase 5 does not execute kernel code, trigger Celsius/ffs_mountfs, run shellcode or kexec, load HEN/GoldHEN, or modify the 12.00 Lapse runtime.

## Promotion discipline
A repeated observation can increase review priority and satisfy candidate-review eligibility. It cannot by itself prove kernel read/write, kernel execution, a usable exploit primitive, or a jailbreak. Those claims require separate technical evidence and independent reproduction.
