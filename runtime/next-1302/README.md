# NEXT 13.02-13.52 Research Runtime

This directory isolates the PS4 13.02 through 13.52 research launch path from the known-good NEXT runtime.

- `index.html` is the manual-entry research page.
- `userland-probe.js` wraps SlopKit with inclusive 13.02-13.52 gating with exact-firmware report tagging and stops after userland validation.
- `diagnostics-bridge.js` forwards research events and live provenance to `window.PS4Diag` when available.
- `research-state.js` owns local UI state, per-run session IDs, and the general report export.
- `observation-schema.js` defines the strict schema-v2 hardware-observation validator.
- `observation-session-bridge.js` converts only completed firmware-authenticated live runs into strict hardware observations.
- `observation-ui.js` controls live observation eligibility and the strict observation download button.
- `hardware-evidence.html` and `evidence-workbench.js` provide local validation, deduplication, source-key coverage, and non-executing triage for observation batches.
- `research-dashboard.html` and `research-dashboard.js` summarize evidence across 13.02, 13.04, 13.50 and 13.52 with OBSERVED, REPRODUCED and CANDIDATE research states.
- `slopkit/` contains direct copies of the current `site/runtime/next/` `core.js`, `mem.js`, and `int64.js` files for isolated testing.

Boundary:

- No Poops routing.
- No Netctrl.
- No Celsius execution.
- No kernel offsets, guessed bases, or GoldHEN loading.
- No automatic evidence submission or exploit promotion.

Dashboard promotion is a review-priority classification only. OBSERVED means at least one accepted hardware run, REPRODUCED requires distinct session IDs, and CANDIDATE additionally requires reviewed-source correlation plus an already-eligible review queue signal. None of these states proves kernel execution or a jailbreak.

Every firmware in the range remains a separate research target. A successful self-check on one version does not establish compatibility on another. Generic SlopKit observations are not mapped to unrelated reviewed-source claims. Kernel, payload, and HEN paths stay locked.

Research integrity tests are run by `.github/workflows/research-integrity.yml` on pull requests that change the research runtime or its tests.
