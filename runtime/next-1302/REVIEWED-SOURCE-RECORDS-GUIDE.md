# NEXT Phase 7 — Reviewed SOURCE_CONFIRMED Records

Phase 7 supplies the research dashboard with a bounded, reviewed public-evidence dataset for firmware 13.00, 13.02, 13.04, 13.50 and 13.52.

The dataset is derived from the project's public-evidence review. It records only conclusions that were classified SOURCE_CONFIRMED: the 13.00 public baseline, the documented 13.00–13.02 BD-J CVE boundary and 13.04 patch boundary, public NetControl support through 13.00, the 13.04 scanner artifact claim, sparse 13.50 observations, and the published 13.52 kqueue experiment summary.

Every record has `hardwareObserved:false`. Source material cannot self-promote to HARDWARE_OBSERVED, REPRODUCED, CANDIDATE, kernel read/write, kernel execution, or jailbreak evidence.

The dashboard can correlate a source key only when a strict firmware-authenticated NEXT hardware observation session reports the same key. Ranking remains research priority, not exploit confidence.

No kernel exploit execution, shellcode, kexec, Celsius trigger, kernel writes, HEN, or GoldHEN are added. The 12.00 Lapse path is unchanged.
