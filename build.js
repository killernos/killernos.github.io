"use strict";

window.PS4_WEBKIT_BUILD = {
  firmwareTarget: "multi-firmware",
  buildId: "next-universal-1302-research-0009",
  cacheRevision: "next-universal-1302-research-0009",
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
