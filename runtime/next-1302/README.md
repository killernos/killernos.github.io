# NEXT 13.02-13.52 Research Runtime

This directory isolates the PS4 13.02 through 13.52 research launch path from the known-good NEXT runtime.

- `index.html` is the manual-entry research page.
- `userland-probe.js` wraps SlopKit with inclusive 13.02-13.52 gating with exact-firmware report tagging and stops after userland validation.
- `diagnostics-bridge.js` forwards research events to `window.PS4Diag` when available.
- `research-state.js` owns the local UI state and report export.
- `kernel-candidate.html` is a separate consent-gated diagnostics-only page.
- `kernel-candidate-adapter.js` collects only fixed, browser-visible signals and exposes no SlopKit or kernel operation.
- `kernel-candidate-probe.js` connects the candidate page to bounded local reporting and shared diagnostics.
- `slopkit/` contains direct copies of the current `site/runtime/next/` `core.js`, `mem.js`, and `int64.js` files for isolated testing.

Boundary:

- No Poops routing.
- No Netctrl.
- No Celsius execution.
- No kernel offsets, guessed bases, or GoldHEN loading.
- No filesystem enumeration or device-node access; the device-node allowlist remains empty until an independently verified harmless query exists.

Every firmware in the range remains a separate research target. A successful self-check on one version does not establish compatibility on another. Kernel, payload, and HEN paths stay locked.
