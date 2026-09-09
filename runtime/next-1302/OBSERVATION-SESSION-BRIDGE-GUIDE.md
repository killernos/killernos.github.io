# NEXT Phase 11 — Observation Session Bridge

The bridge converts an eligible live NEXT 13.02–13.52 run snapshot into the strict `NEXT_HARDWARE_OBSERVATION_SESSION` schema used by the evidence pipeline.

Conversion is allowed only when the run has a non-empty per-run session ID, firmware provenance is `UA`, simulation is false, hardware is explicitly `hardware`, firmware is within the bounded 13.02–13.52 research range, and the run contains the `NEXT-1302-HARDWARE-CONFIRMED` event.

Query-forced firmware, simulations, imports, user-entered firmware, storage-derived firmware, and snapshots without the hardware confirmation event do not qualify.

The generated observation contains bounded boolean samples for the existing userland stages only. It explicitly records no kernel execution, kernel write, or HEN observation. A session ID proves run uniqueness only; it does not authenticate a unique console or tester.

No kernel trigger, Celsius execution, shellcode, kexec, kernel writes, HEN, GoldHEN, or 12.00 Lapse behavior is enabled by this bridge.
