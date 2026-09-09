# NEXT Phase 10 — Live Hardware Session Identity

Each manual 13.02–13.52 research run now receives a fresh per-run `sessionId` when the tester presses Run.

The runtime prefers `crypto.randomUUID()`, then `crypto.getRandomValues()`, with a compatibility fallback for older WebKit. The identifier represents run uniqueness only. It does not identify a tester, console, account, or device and must not be treated as proof of independent hardware ownership.

Firmware provenance remains separate. Only firmware parsed from the PS4 user-agent is marked `firmwareSource: "UA"`. Query-forced/simulation firmware remains ineligible for the strict HARDWARE_OBSERVED gate.

The session ID is propagated to the research adapter, diagnostics events, and downloaded report. Starting another run creates another session ID; retry attempts inside the same run keep the same ID.

This change does not relabel the normal NEXT research download as a strict `NEXT_HARDWARE_OBSERVATION_SESSION`. Promotion into that schema remains subject to the existing evidence validator and provenance rules.

No kernel trigger, kernel writes, shellcode, kexec, HEN, GoldHEN, or 12.00 Lapse behavior is enabled or changed.
