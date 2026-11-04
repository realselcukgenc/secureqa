/* SecureQA report behaviour. Vanilla JS, no libraries.
   TR: Rapor etkileşimleri — saf JavaScript, kütüphane yok.
   Handles: TR/EN toggle, dark/light, filters, search, expand/collapse. */

(function () {
  "use strict";

  var root = document.documentElement;

  // --- small helper so localStorage failures never break the page ---
  // TR: localStorage bazı tarayıcılarda hata verebilir; try/catch ile sarıyoruz.
  function store(key, value) {
    try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); }
    catch (e) { return null; }
  }

  // --- theme (dark / light) ---
  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    store("sqa-theme", theme);
    var btn = document.getElementById("theme-btn");
    if (btn) btn.textContent = theme === "dark" ? "☀️" : "\u{1F319}";
  }
  var savedTheme = store("sqa-theme");
  setTheme(savedTheme === "light" || savedTheme === "dark" ? savedTheme : "light");

  // --- language (tr / en) ---
  function setLang(lang) {
    root.setAttribute("data-lang", lang);
    store("sqa-lang", lang);
    document.querySelectorAll("[data-lang-btn]").forEach(function (span) {
      span.classList.toggle("on", span.getAttribute("data-lang-btn") === lang);
    });
    root.setAttribute("lang", lang);
  }
  var savedLang = store("sqa-lang");
  setLang(savedLang === "en" ? "en" : "tr");

  // --- wire up top-bar buttons ---
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-action]");
    if (!t) return;
    var action = t.getAttribute("data-action");
    if (action === "toggle-theme") setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    if (action === "set-lang") setLang(t.getAttribute("data-lang-btn"));
    if (action === "print") window.print();
    if (action === "expand-all") document.querySelectorAll(".frow").forEach(function (r) { r.classList.add("open"); });
    if (action === "collapse-all") document.querySelectorAll(".frow").forEach(function (r) { r.classList.remove("open"); });
  });

  // --- expand/collapse a single finding ---
  document.querySelectorAll(".fhead").forEach(function (head) {
    head.addEventListener("click", function () { head.parentElement.classList.toggle("open"); });
  });

  // --- severity filter chips ---
  var activeSeverity = "all";
  document.querySelectorAll(".chip[data-sev]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll(".chip[data-sev]").forEach(function (c) { c.classList.remove("on"); });
      chip.classList.add("on");
      activeSeverity = chip.getAttribute("data-sev");
      applyFilters();
    });
  });

  // --- OWASP filter chips ---
  var activeOwasp = "all";
  document.querySelectorAll(".chip[data-owasp]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll(".chip[data-owasp]").forEach(function (c) { c.classList.remove("on"); });
      chip.classList.add("on");
      activeOwasp = chip.getAttribute("data-owasp");
      applyFilters();
    });
  });

  // --- text search ---
  var searchBox = document.getElementById("search");
  if (searchBox) searchBox.addEventListener("input", applyFilters);

  function applyFilters() {
    var q = (searchBox && searchBox.value || "").toLowerCase().trim();
    var shown = 0;
    document.querySelectorAll(".frow").forEach(function (row) {
      var sev = row.getAttribute("data-sev");
      var owasp = row.getAttribute("data-owasp");
      var text = row.getAttribute("data-search") || "";
      var ok = (activeSeverity === "all" || sev === activeSeverity) &&
               (activeOwasp === "all" || owasp === activeOwasp) &&
               (q === "" || text.indexOf(q) !== -1);
      row.style.display = ok ? "" : "none";
      if (ok) shown++;
    });
    var empty = document.getElementById("empty-state");
    if (empty) empty.style.display = shown === 0 ? "block" : "none";
  }

  applyFilters();
})();
