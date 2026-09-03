# NEXT 13.02 Research Runtime

This directory isolates the PS4 13.02 research launch path from the known-good NEXT runtime.

- `index.html` is the manual-entry research page.
- `userland-probe.js` wraps SlopKit with exact 13.02 gating and stops after userland validation.
- `diagnostics-bridge.js` forwards research events to `window.PS4Diag` when available.
- `research-state.js` owns the local UI state and report export.
- `slopkit/` contains direct copies of the current `site/runtime/next/` `core.js`, `mem.js`, and `int64.js` files for isolated testing.

Boundary:

- No Poops routing.
- No Netctrl.
- No Celsius execution.
- No kernel offsets, guessed bases, or GoldHEN loading.