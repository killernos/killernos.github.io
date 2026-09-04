"use strict";

(function () {
  window.NEXTEntrypoints = [
    {
      id: "psfree",
      displayName: "PSFree",
      browserLaunchable: false,
      referenceOnly: true,
      repository: "https://github.com/kmeps4/PSFree",
      evidence: "SOURCE-CONFIRMED",
      notes: "Referenced in upstream copies and research materials, but not exposed as a standalone launcher in NEXT."
    },
    {
      id: "cssfontface",
      displayName: "CSSFontFace",
      browserLaunchable: false,
      referenceOnly: true,
      repository: "https://github.com/ntfargo/CSSFontFace-Exploit",
      evidence: "SOURCE-CONFIRMED",
      notes: "Present as upstream reference material only."
    },
    {
      id: "slopkit",
      displayName: "SlopKit",
      browserLaunchable: true,
      referenceOnly: false,
      repository: "https://github.com/jordyidk/slopkit",
      evidence: "SOURCE-CONFIRMED",
      notes: "Active browser entrypoint for current NEXT runtime routing and 13.02 research laboratory."
    },
    {
      id: "mira-reference",
      displayName: "Mira Project reference",
      browserLaunchable: false,
      referenceOnly: true,
      repository: "https://github.com/CrazyVoidProgrammer/mira-project",
      evidence: "RESEARCH",
      notes: "Reference-only OpenOrbis Mira custom firmware and tooling lineage. No standalone Mira browser launcher or active Mira source import is exposed in NEXT."
    },
    {
      id: "bdj-reference",
      displayName: "BD-J reference",
      browserLaunchable: false,
      referenceOnly: true,
      repository: "https://hackerone.com/reports/3452696",
      evidence: "RESEARCH",
      notes: "Documentation only; no browser-launchable BD-J implementation is included in NEXT."
    },
    {
      id: "vueafterfree-reference",
      displayName: "VueAfterFree reference",
      browserLaunchable: false,
      referenceOnly: true,
      repository: "",
      evidence: "RESEARCH",
      notes: "Reference placeholder only. No implementation is included in this repository."
    },
    {
      id: "lua-reference",
      displayName: "Lua reference",
      browserLaunchable: false,
      referenceOnly: true,
      repository: "",
      evidence: "RESEARCH",
      notes: "Reference placeholder only. No browser-launchable Lua path is included in this repository."
    }
  ];
})();