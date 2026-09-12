"use strict";

window.PS4_WEBKIT_BUILD = {
  firmwareTarget: "multi-firmware",
  buildId: "next-universal-1302-1352-research-0016",
  cacheRevision: "next-universal-1302-1352-research-0016",
  diagnosticsSchema: "next-diagnostics-2",
  researchBuildId: "next-universal-1302-1352-research-0016",
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

  var destinations = [
    "./guide.html",
    "./guide.html#getting-started",
    "./guide.html#testing-1302",
    "./guide.html#submitting-reports",
    "./guide.html#understanding-results"
  ];

  function routeGuideLinksLocally() {
    var panel = document.getElementById("docs-guide-panel");
    if (!panel) return false;

    var links = panel.querySelectorAll("a.link-button");
    for (var i = 0; i < links.length && i < destinations.length; i++) {
      links[i].href = destinations[i];
      links[i].removeAttribute("target");
      links[i].removeAttribute("rel");
    }
    return links.length > 0;
  }

  function ensureGuideLinks() {
    if (routeGuideLinksLocally()) return;

    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      if (routeGuideLinksLocally() || attempts >= 20) {
        window.clearInterval(timer);
      }
    }, 100);
  }

  document.addEventListener("DOMContentLoaded", ensureGuideLinks);
  window.addEventListener("load", ensureGuideLinks);
  window.setTimeout(ensureGuideLinks, 0);
})();
