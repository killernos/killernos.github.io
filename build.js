"use strict";

window.PS4_WEBKIT_BUILD = {
  firmwareTarget: "multi-firmware",
  buildId: "next-universal-1302-research-0006",
  cacheRevision: "next-universal-1302-research-0006",
  diagnosticsSchema: "next-diagnostics-2",
  researchBuildId: ""
};

(function () {
  var elements = document.querySelectorAll("[data-build-id]");
  for (var i = 0; i < elements.length; i++) {
    elements[i].textContent = window.PS4_WEBKIT_BUILD.buildId;
  }
})();
