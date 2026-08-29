"use strict";

const build = Object.freeze({
  targetFirmware: "12.00",
  id: "1200-test-0001"
});

document.querySelectorAll("[data-build-id]").forEach((element) => {
  element.textContent = build.id;
});
