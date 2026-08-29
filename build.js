"use strict";

window.PS4_WEBKIT_BUILD = {
  firmwareTarget: "12.00",
  buildId: "1200-test-0001"
};

document.querySelectorAll("[data-build-id]").forEach((element) => {
  element.textContent = window.PS4_WEBKIT_BUILD.buildId;
});
