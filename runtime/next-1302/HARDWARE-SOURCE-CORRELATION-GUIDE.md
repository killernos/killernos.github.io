# NEXT 13.xx Hardware / Source Correlation

Created by KillerNoS.

## Purpose
Phase 3 connects firmware-authenticated hardware observations to SOURCE_CONFIRMED differential leads without treating source claims, imports, crashes, or timing differences as proof of exploitation.

## Eligible hardware session
A session must use `reportType: NEXT_HARDWARE_OBSERVATION_SESSION`, `evidenceClass: HARDWARE_OBSERVED`, supported firmware, and `firmwareSource: UA`. Simulated, imported, query-derived, user-entered, and storage-derived sessions are rejected. Sessions are bounded to 10 samples.

## Correlation
`hardware-source-correlation.js` compares observed keys with the existing source differential matrix. The correlation report preserves both evidence classes: hardware observations remain `HARDWARE_OBSERVED`; upstream/source information remains `SOURCE_CONFIRMED`.

A matching difference is research evidence only. It does not establish a kernel primitive, read/write, execution, or jailbreak.

## Reproduction gate
One eligible correlation remains `HARDWARE_OBSERVED`. Two eligible correlations for the same changed/new/missing source key can enter `REPRODUCED` review and become candidate-eligible. `exploitProven` remains false.

## Hard locks
Phase 3 never authorizes kernel execution, kernel writes, kernel patch shellcode, kexec, HEN, or GoldHEN. It does not modify the 12.00 Lapse runtime.
