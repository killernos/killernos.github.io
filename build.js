"use strict";

window.PS4_WEBKIT_BUILD = {
  firmwareTarget: "12.00",
  buildId: "1200-next-brand-0001"
};

(function () {
  var elements = document.querySelectorAll("[data-build-id]");
  for (var i = 0; i < elements.length; i++) {
    elements[i].textContent = window.PS4_WEBKIT_BUILD.buildId;
  }
})();
