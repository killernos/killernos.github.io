"use strict";

window.PS4_WEBKIT_BUILD = {
  firmwareTarget: "multi-firmware",
  buildId: "next-universal-1302-1352-research-0023",
  cacheRevision: "next-universal-1302-1352-research-0023",
  diagnosticsSchema: "next-diagnostics-2",
  researchBuildId: "next-universal-1302-1352-research-0023",
  flags: {
    ENABLE_1302_EXPERIMENTAL: true,
    ENABLE_NATIVE_SYSCALL_VALIDATION: true
  }
};
window.PS4_WEBKIT_FLAGS = {
  ENABLE_1302_EXPERIMENTAL: true,
  ENABLE_NATIVE_SYSCALL_VALIDATION: true
};
window.ENABLE_1302_EXPERIMENTAL = true;
window.ENABLE_NATIVE_SYSCALL_VALIDATION = true;

(function () {
  var elements = document.querySelectorAll("[data-build-id]");
  for (var i = 0; i < elements.length; i++) {
    elements[i].textContent = window.PS4_WEBKIT_BUILD.buildId;
  }
})();
