# NEXT Phase 6 — Evidence Triage UI

Phase 6 connects the bounded Phase 5 intake pipeline to the 13.xx research dashboard.

## Behavior

- Evidence input is JSON and must be an array.
- Strict Phase 3 hardware-session validation remains authoritative.
- Invalid evidence is rejected rather than promoted.
- Export errors are converted to structured UI errors instead of uncaught exceptions.
- Accepted evidence can feed the Phase 4/5 research queue.
- The dashboard labels ranking as research priority, not exploit confidence.

## Safety boundary

Phase 6 does not execute a kernel exploit, Celsius/ffs_mountfs trigger, kernel patch shellcode, kexec, kernel writes, HEN, or GoldHEN. `exploitProven`, kernel execution/write authorization, and HEN authorization remain false in the triage pipeline.

The 12.00 Lapse path is not changed by this phase.

## Source records

The dashboard currently invokes the UI triage adapter with an empty source-record array. This means the UI can validate evidence safely, but it will not fabricate source differences or ranked candidates. A later integration must provide an explicit reviewed SOURCE_CONFIRMED record set before correlations can appear.
