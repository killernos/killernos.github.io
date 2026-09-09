"use strict";

window.PS4_WEBKIT_BUILD = {
  firmwareTarget: "multi-firmware",
  buildId: "next-universal-1302-1352-research-0011",
  cacheRevision: "next-universal-1302-1352-research-0011",
  diagnosticsSchema: "next-diagnostics-2",
  researchBuildId: "",
  flags: {
    ENABLE_1302_EXPERIMENTAL: false
  }
};

window.PS4_WEBKIT_FLAGS = {
  ENABLE_1302_EXPERIMENTAL: false
};

window.ENABLE_1302_EXPERIMENTAL = false;

(function () {
  var elements = document.querySelectorAll("[data-build-id]");
  for (var i = 0; i < elements.length; i++) {
    elements[i].textContent = window.PS4_WEBKIT_BUILD.buildId;
  }
})();

(function () {
  "use strict";

  function routeGuideLinksLocally() {
    var panel = document.getElementById("docs-guide-panel");
    if (!panel) return;

    var links = panel.querySelectorAll("a.link-button");
    var destinations = [
      "./guide.html",
      "./guide.html#getting-started",
      "./guide.html#testing-1302",
      "./guide.html#submitting-reports",
      "./guide.html#understanding-results"
    ];

    for (var i = 0; i < links.length && i < destinations.length; i++) {
      links[i].href = destinations[i];
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", routeGuideLinksLocally);
  } else {
    routeGuideLinksLocally();
  }
})();
