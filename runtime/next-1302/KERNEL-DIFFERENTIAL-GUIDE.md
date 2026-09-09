# NEXT 13.xx Kernel Source Differential Guide

Created by KillerNoS.

## Purpose

This phase turns source-confirmed kernel leads into a repeatable firmware-differential dataset without executing kernel patch shellcode or claiming kernel exploitation.

Comparison order:

1. 13.00 -> 13.02
2. 13.02 -> 13.04
3. 13.04 -> 13.50
4. 13.50 -> 13.52

## Record format

Each imported source record uses:

```json
{
  "firmware": "13.02",
  "key": "symbol-or-offset-name",
  "value": "source-observed-value",
  "hardwareObserved": false
}
```

The differential engine classifies each adjacent pair as `SAME`, `CHANGED`, `NEW`, `MISSING`, or `INCONCLUSIVE`.

## Evidence boundary

All rows produced by this engine remain `SOURCE_CONFIRMED`. They are not `HARDWARE_OBSERVED`, do not prove kernel read/write/execution, and cannot be promoted merely because an offset changes.

A source lead should only be correlated with the existing NEXT hardware-session evidence after the firmware was authenticated from the PS4 user agent and the observation was independently reproduced.

## What to prioritize

Prioritize stable structural differences that repeat across firmware boundaries. Do not escalate timing-only differences, crashes, browser termination, imported values, query-string firmware overrides, or simulated sessions into exploit claims.

## Execution boundary

This phase does not execute kernel patch shellcode, `kexec`, Celsius/`ffs_mountfs`, HEN, or GoldHEN. The 12.00 Lapse runtime is outside this phase and must remain unchanged.
