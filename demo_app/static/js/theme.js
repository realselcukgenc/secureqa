/* Apply the saved (or system) colour theme as early as possible to avoid a flash.
   Loaded in <head> as an external file because our CSP blocks inline scripts. */
(function () {
  "use strict";
  var theme = null;
  try { theme = window.localStorage.getItem("secureshop-theme"); } catch (e) { /* storage blocked */ }
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
})();
