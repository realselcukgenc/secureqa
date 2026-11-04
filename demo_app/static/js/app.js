/* SecureShop front-end behaviour — small, dependency-free, progressive enhancement.
 * Every feature also works without JavaScript (forms post normally).
 *
 * SECURITY notes for readers:
 *  - We never build HTML from strings with user data (no innerHTML). Text goes in via
 *    textContent, which the browser always treats as plain text (XSS-safe).
 *  - fetch() requests send the CSRF token that is already in the form (FormData).
 */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---- theme toggle ---------------------------------------------------- */
  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { window.localStorage.setItem("secureshop-theme", theme); } catch (e) { /* ignore */ }
  }
  var themeBtn = $("#theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      setTheme(dark ? "light" : "dark");
    });
  }

  /* ---- mobile menu --------------------------------------------------------- */
  var menuBtn = $("#menu-toggle");
  var nav = $("#main-nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---- toasts -------------------------------------------------------------- */
  function dismiss(toast) {
    if (!toast || toast.classList.contains("is-leaving")) { return; }
    toast.classList.add("is-leaving");
    window.setTimeout(function () { if (toast.parentNode) { toast.parentNode.removeChild(toast); } }, 320);
  }
  function arm(toast) {
    var close = $(".toast-close", toast);
    if (close) { close.addEventListener("click", function () { dismiss(toast); }); }
    window.setTimeout(function () { dismiss(toast); }, 4500);
  }
  $$(".toast").forEach(arm);

  /** Show a toast; `message` is inserted as TEXT, never as HTML. */
  function showToast(message, type) {
    var stack = $("#toast-stack");
    if (!stack) { return; }
    var toast = document.createElement("div");
    toast.className = "toast toast-" + (type === "error" ? "error" : "success");
    toast.setAttribute("role", "status");
    toast.setAttribute("data-testid", "toast");
    toast.setAttribute("data-toast-type", type === "error" ? "error" : "success");
    var svgNS = "http://www.w3.org/2000/svg";
    var icon = document.createElementNS(svgNS, "svg");
    icon.setAttribute("class", "icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    var path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", type === "error" ? "M12 8v5M12 16h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" : "M20 6 9 17l-5-5");
    icon.appendChild(path);
    var msg = document.createElement("span");
    msg.className = "toast-msg";
    msg.textContent = message;
    var close = document.createElement("button");
    close.type = "button";
    close.className = "toast-close";
    close.setAttribute("aria-label", "×");
    close.textContent = "×";
    toast.appendChild(icon);
    toast.appendChild(msg);
    toast.appendChild(close);
    stack.appendChild(toast);
    arm(toast);
  }

  /* ---- add to cart without page reload --------------------------------------- */
  $$("form.js-add-to-cart").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      if (!window.fetch || !window.FormData) { return; } // old browser: normal POST
      event.preventDefault();
      var btn = $("button[type=submit]", form);
      if (btn) { btn.classList.add("is-loading"); }
      fetch(form.action, {
        method: "POST",
        body: new FormData(form),             // includes the hidden csrf_token field
        headers: { "Accept": "application/json" },
        credentials: "same-origin"
      }).then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      }).then(function (result) {
        showToast(result.data.message || "", result.ok ? "success" : "error");
        var badge = $("#cart-count");
        if (badge && typeof result.data.count === "number") {
          badge.textContent = String(result.data.count);
          badge.classList.toggle("is-empty", result.data.count === 0);
          badge.classList.remove("bump");
          void badge.offsetWidth; // restart the CSS animation
          badge.classList.add("bump");
        }
      }).catch(function () {
        form.submit(); // network/JSON problem: fall back to a normal form post
      }).then(function () {
        if (btn) { btn.classList.remove("is-loading"); }
      });
    });
  });

  /* ---- quantity steppers ------------------------------------------------------- */
  $$(".qty").forEach(function (box) {
    var input = $("input", box);
    if (!input) { return; }
    function change(delta) {
      var min = parseInt(input.min || "1", 10);
      var max = parseInt(input.max || "10", 10);
      var value = Math.min(max, Math.max(min, (parseInt(input.value, 10) || min) + delta));
      if (String(value) !== input.value) {
        input.value = String(value);
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    var dec = $(".js-qty-dec", box);
    var inc = $(".js-qty-inc", box);
    if (dec) { dec.addEventListener("click", function () { change(-1); }); }
    if (inc) { inc.addEventListener("click", function () { change(1); }); }
  });

  /* ---- auto-submit (sort select, cart quantity) ------------------------------------ */
  $$(".js-autosubmit").forEach(function (el) {
    el.addEventListener("change", function () { if (el.form) { el.form.submit(); } });
  });

  /* ---- login: demo account buttons + show password ------------------------------- */
  $$(".js-fill-login").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var u = $("#username");
      var p = $("#password");
      if (u && p) { u.value = btn.getAttribute("data-user"); p.value = btn.getAttribute("data-pass"); p.focus(); }
    });
  });
  $$(".js-toggle-password").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = document.getElementById(btn.getAttribute("data-target"));
      if (input) { input.type = input.type === "password" ? "text" : "password"; }
    });
  });

  /* ---- register: live password-policy hints (the SERVER still enforces the policy) ---- */
  var pw = $(".js-pw-meter");
  if (pw) {
    var meter = $(".pw-meter");
    var rules = {
      length: function (v) { return v.length >= 8; },
      letter: function (v) { return /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(v); },
      digit: function (v) { return /\d/.test(v); }
    };
    pw.addEventListener("input", function () {
      var v = pw.value;
      var score = 0;
      Object.keys(rules).forEach(function (name) {
        var ok = rules[name](v);
        var li = $('.pw-rules [data-rule="' + name + '"]');
        if (li) { li.classList.toggle("ok", ok); }
        if (ok) { score += 1; }
      });
      if (v.length >= 12 && /[^A-Za-z0-9]/.test(v)) { score += 1; }
      if (meter) { meter.setAttribute("data-score", v ? String(Math.min(4, score)) : "0"); }
    });
  }

  /* ---- checkout: card formatting + live preview -------------------------------------- */
  var cardInput = $(".js-card-number");
  if (cardInput) {
    var preview = $(".js-cp-number");
    var nameInput = $("#ship_name");
    var namePreview = $(".js-cp-name");
    var expInput = $(".js-card-exp");
    var expPreview = $(".js-cp-exp");
    cardInput.addEventListener("input", function () {
      var digits = cardInput.value.replace(/\D/g, "").slice(0, 16);
      cardInput.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
      if (preview) { preview.textContent = cardInput.value || "•••• •••• •••• ••••"; }
    });
    if (nameInput && namePreview) {
      nameInput.addEventListener("input", function () { namePreview.textContent = nameInput.value || "AD SOYAD"; });
    }
    if (expInput && expPreview) {
      expInput.addEventListener("input", function () {
        var d = expInput.value.replace(/\D/g, "").slice(0, 4);
        expInput.value = d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
        expPreview.textContent = expInput.value;
      });
    }
  }
})();
