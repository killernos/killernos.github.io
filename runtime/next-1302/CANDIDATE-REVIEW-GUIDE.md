# NEXT 13.xx Candidate Review Queue

Phase 4 turns eligible Phase 3 hardware/source correlations into a bounded human-review queue.

## Review states

`HARDWARE_OBSERVED` → `REPRODUCED` → `UNDER_REVIEW` → `CANDIDATE`

A reviewer may also mark an entry `REJECTED` or `INCONCLUSIVE`.

`CANDIDATE` means the difference deserves further research. It does **not** mean a kernel exploit, kernel read/write, kernel execution, or jailbreak has been proven.

## Gates

- Only valid `NEXT_HARDWARE_SOURCE_CORRELATION` reports enter the queue.
- Evidence must remain `HARDWARE_OBSERVED` with UA firmware provenance.
- Only `CHANGED`, `NEW`, and `MISSING` differential states are queued.
- At least two eligible reproductions are required before candidate eligibility.
- Source URLs remain source references and cannot self-promote to hardware evidence.
- `exploitProven`, kernel-write authorization, kernel-execution authorization, and HEN authorization remain false.

## Priority

One eligible observation is LOW priority, two are MEDIUM, and three or more are HIGH. Priority is only triage; it is not exploit confidence.

## Safety boundary

This module does not execute kernel patch shellcode, kexec, Celsius/ffs_mountfs, kernel writes, HEN, or GoldHEN. It does not modify the 12.00 Lapse runtime.

## Next research step

Candidate entries can be exported for human review. A later evidence-review phase may attach independent reproduction notes, source references, and bounded hardware-test recommendations without automatically escalating a candidate to an exploit claim.
