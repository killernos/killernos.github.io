# NEXT Evidence Integrity — Distinct Session Gate

A repeated or copied correlation must not increase reproduction confidence.

Starting with correlation schema version 2, every eligible `NEXT_HARDWARE_OBSERVATION_SESSION` requires a non-empty `sessionId`. The ID is carried into `NEXT_HARDWARE_SOURCE_CORRELATION` reports.

Candidate review counts unique session IDs for each firmware differential. Repeating the same session ID counts once. Two different eligible session IDs are required for `REPRODUCED` and candidate eligibility; three different eligible session IDs raise research priority to HIGH.

`sessionId` establishes distinct eligible sessions only. It does not by itself prove different testers or different consoles. Stronger independence claims require separate authenticated provenance.

This gate does not prove exploitation. Kernel execution, kernel writes, shellcode, kexec, HEN and GoldHEN remain unauthorized. The 12.00 Lapse path is unchanged.
