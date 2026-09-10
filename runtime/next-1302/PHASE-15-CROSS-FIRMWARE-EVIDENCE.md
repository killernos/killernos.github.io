# Phase 15 — Cross-Firmware Evidence Matrix

Phase 15 compares bounded hardware-observation outcomes across PS4 firmware 13.02, 13.04, 13.50, and 13.52 without executing a kernel exploit.

## Evidence rules

- A firmware/session pair is counted once. Repeated submissions from the same session do not increase reproduction counts.
- Missing firmware or unsupported firmware is rejected from this matrix.
- Sample values are compared only when they are finite JSON scalars.
- A sample is `STABLE` only when all observed sessions on that firmware report the same value. Conflicting values are `VARIABLE`; absent values are `NO_DATA`.
- Pair comparisons use `SAME`, `CHANGED`, `MISSING`, `NEW`, or `INCONCLUSIVE`.
- A distinct session ID is not proof of a distinct console or independent tester.

## Promotion boundary

This matrix is evidence prioritization, not jailbreak probability. A changed value is not a kernel exploit. Phase 15 does not authorize or implement kernel reads, kernel writes, kernel execution, shellcode, kexec, Celsius execution, HEN, or GoldHEN.

Generic userland observations must not be mapped to unrelated BD-J, NetControl, SUID, kqueue, or other reviewed-source claims merely because they share a firmware version. Source correlation must remain key-specific and evidence-backed.
