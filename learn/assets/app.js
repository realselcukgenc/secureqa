/*
 * SecureQA Learn — application (router, rendering, editor, progress & gamification).
 * Plain JavaScript, no build step. Works from file:// and from any static server.
 */
(function () {
  "use strict";
  var SQ = window.SQ;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var esc = SQ.escapeHtml;

  /* ------------------------------------------------------------------ *
   * Storage (localStorage wrapped in try/catch — may be blocked)
   * ------------------------------------------------------------------ */
  var STORE_KEY = "secureqa.learn.v1";
  var storageOk = true;
  function defaultState() {
    return {
      v: 1, lang: "tr", theme: null, xp: 0,
      cells: {},        // cellId -> true (ran successfully at least once)
      exercises: {},    // exId -> {passed, attempts, hints}
      quizzes: {},      // lessonId -> {answers:[..], score, total}
      lessons: {},      // lessonId -> {done:true, at}
      visited: {},      // lessonId -> true
      drafts: {},       // editorId -> code
      badges: {},       // badgeId -> iso date
      streak: { count: 0, best: 0, last: null }
    };
  }
  function loadState() {
    var s = defaultState();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        Object.keys(s).forEach(function (k) { if (parsed[k] !== undefined) s[k] = parsed[k]; });
      }
    } catch (e) { storageOk = false; }
    return s;
  }
  var S = loadState();
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); storageOk = true; }
      catch (e) { storageOk = false; }
    }, 150);
  }

  /* ------------------------------------------------------------------ *
   * i18n helpers
   * ------------------------------------------------------------------ */
  function lang() { return S.lang === "en" ? "en" : "tr"; }
  function t(key) { var d = SQ.UI[lang()]; return d[key] !== undefined ? d[key] : (SQ.UI.tr[key] !== undefined ? SQ.UI.tr[key] : key); }
  function L(obj) {
    if (obj == null) return "";
    if (typeof obj === "string") return obj;
    return obj[lang()] !== undefined ? obj[lang()] : (obj.tr !== undefined ? obj.tr : "");
  }

  /* ------------------------------------------------------------------ *
   * Progress, XP, streak, badges
   * ------------------------------------------------------------------ */
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function touchStreak() {
    var now = today();
    var st = S.streak || (S.streak = { count: 0, best: 0, last: null });
    if (st.last === now) return;
    var y = new Date(); y.setDate(y.getDate() - 1);
    var yesterday = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0");
    st.count = st.last === yesterday ? st.count + 1 : 1;
    st.best = Math.max(st.best || 0, st.count);
    st.last = now;
  }
  function currentStreak() {
    var st = S.streak || {};
    if (!st.last) return 0;
    var y = new Date(); y.setDate(y.getDate() - 1);
    var yesterday = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0");
    return (st.last === today() || st.last === yesterday) ? st.count : 0;
  }
  function addXp(n, reason) {
    if (!n) return;
    S.xp = (S.xp || 0) + n;
    touchStreak();
    toast("+" + n + " XP", reason || "", "xp");
    afterProgress();
  }
  var LEVEL_STEP = 250;
  function levelInfo() {
    var names = t("levelNames");
    var lvl = Math.min(Math.floor((S.xp || 0) / LEVEL_STEP), names.length - 1);
    var into = (S.xp || 0) - lvl * LEVEL_STEP;
    var max = lvl === names.length - 1;
    return { n: lvl + 1, name: names[lvl], pct: max ? 100 : Math.round(100 * into / LEVEL_STEP), left: max ? 0 : LEVEL_STEP - into };
  }
  function doneCount() { return SQ.lessons.filter(function (l) { return S.lessons[l.id] && S.lessons[l.id].done; }).length; }
  function isDone(id) { return !!(S.lessons[id] && S.lessons[id].done); }
  function lessonStatus(l) {
    if (isDone(l.id)) return "done";
    var any = S.visited[l.id] || l.exercises.some(function (e) { return S.exercises[e.id] && S.exercises[e.id].attempts; });
    return any ? "progress" : "new";
  }

  var BADGES = [
    { id: "hello", icon: ">_", name: { tr: "Merhaba Dünya", en: "Hello World" }, desc: { tr: "İlk kod hücreni çalıştırdın.", en: "You ran your first code cell." },
      test: function () { return Object.keys(S.cells).length > 0; } },
    { id: "green", icon: "✓", name: { tr: "İlk Yeşil Test", en: "First Green Test" }, desc: { tr: "İlk alıştırmanı geçtin.", en: "You passed your first exercise." },
      test: function () { return Object.keys(S.exercises).some(function (k) { return S.exercises[k].passed; }); } },
    { id: "oneshot", icon: "◎", name: { tr: "Tek Atış", en: "One Shot" }, desc: { tr: "Bir alıştırmayı ipucusuz, ilk denemede geçtin.", en: "Passed an exercise on the first try without hints." },
      test: function () { return Object.keys(S.exercises).some(function (k) { var e = S.exercises[k]; return e.passed && e.firstTry; }); } },
    { id: "bullseye", icon: "★", name: { tr: "Tam İsabet", en: "Bullseye" }, desc: { tr: "Bir quizde tüm cevaplar doğru.", en: "All answers right in a quiz." },
      test: function () { return Object.keys(S.quizzes).some(function (k) { var q = S.quizzes[k]; return q.best === q.total && q.total > 0; }); } },
    { id: "first", icon: "1", name: { tr: "İlk Ders", en: "First Lesson" }, desc: { tr: "İlk dersini tamamladın.", en: "You completed your first lesson." },
      test: function () { return doneCount() >= 1; } },
    { id: "pom", icon: "▣", name: { tr: "POM Mimarı", en: "POM Architect" }, desc: { tr: "Sınıflar & Page Object dersini bitirdin.", en: "Finished classes & Page Objects." },
      test: function () { return isDone("06-classes-pom"); } },
    { id: "fixture", icon: "@", name: { tr: "Fixture Ustası", en: "Fixture Master" }, desc: { tr: "Decorator & fixture dersini bitirdin.", en: "Finished decorators & fixtures." },
      test: function () { return isDone("10-decorators-fixtures"); } },
    { id: "half", icon: "½", name: { tr: "Yarı Yol", en: "Halfway" }, desc: { tr: "8 ders tamamladın.", en: "Completed 8 lessons." },
      test: function () { return doneCount() >= 8; } },
    { id: "streak3", icon: "3", name: { tr: "3 Günlük Seri", en: "3-Day Streak" }, desc: { tr: "3 gün üst üste çalıştın.", en: "Studied 3 days in a row." },
      test: function () { return (S.streak.best || 0) >= 3; } },
    { id: "streak7", icon: "7", name: { tr: "Haftalık Seri", en: "Weekly Streak" }, desc: { tr: "7 gün üst üste çalıştın.", en: "Studied 7 days in a row." },
      test: function () { return (S.streak.best || 0) >= 7; } },
    { id: "xp1000", icon: "⚡", name: { tr: "1000 XP", en: "1000 XP" }, desc: { tr: "1000 XP topladın.", en: "Collected 1000 XP." },
      test: function () { return (S.xp || 0) >= 1000; } },
    { id: "hunter", icon: "⚑", name: { tr: "Güvenlik Avcısı", en: "Bug Hunter" }, desc: { tr: "Güvenlik bakış açısı dersini bitirdin.", en: "Finished the security mindset lesson." },
      test: function () { return isDone("15-security-mindset"); } },
    { id: "grad", icon: "♛", name: { tr: "SecureQA Mezunu", en: "SecureQA Graduate" }, desc: { tr: "15 dersin hepsini tamamladın!", en: "Completed all 15 lessons!" },
      test: function () { return SQ.lessons.length > 0 && doneCount() >= SQ.lessons.length; } }
  ];

  function checkBadges() {
    BADGES.forEach(function (b) {
      if (!S.badges[b.id] && b.test()) {
        S.badges[b.id] = today();
        toast(t("badgeEarned"), b.icon + "  " + L(b.name), "badge");
      }
    });
  }

  function checkLessonDone(lesson) {
    if (isDone(lesson.id)) return;
    var exOk = lesson.exercises.every(function (e) { return S.exercises[e.id] && S.exercises[e.id].passed; });
    var qOk = !lesson.quiz.length || !!S.quizzes[lesson.id];
    if (exOk && qOk) {
      S.lessons[lesson.id] = { done: true, at: today() };
      S.xp += 50;
      touchStreak();
      toast(t("lessonComplete"), L(lesson.title) + " · +50 XP", "done");
      celebrate();
    }
    updateChecklist(lesson);
  }

  function afterProgress() {
    checkBadges();
    save();
    renderChrome();
  }

  /* ------------------------------------------------------------------ *
   * Toasts & celebration
   * ------------------------------------------------------------------ */
  function toast(title, body, kind) {
    var box = $("#toasts");
    if (!box) return;
    var el = document.createElement("div");
    el.className = "toast toast-" + (kind || "info");
    el.innerHTML = "<strong>" + esc(title) + "</strong>" + (body ? "<span>" + esc(body) + "</span>" : "");
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(function () { el.classList.add("out"); }, 2800);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3300);
  }
  function celebrate() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var wrap = document.createElement("div");
    wrap.className = "confetti";
    var colors = ["var(--accent)", "var(--accent-2)", "var(--warn)", "var(--pink)"];
    for (var i = 0; i < 40; i++) {
      var p = document.createElement("i");
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 0.4) + "s";
      p.style.transform = "rotate(" + Math.random() * 360 + "deg)";
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(function () { wrap.remove(); }, 2600);
  }

  /* ------------------------------------------------------------------ *
   * Code editor (textarea over highlighted <pre>) and read-only blocks
   * ------------------------------------------------------------------ */
  function gutterText(code) {
    var n = code.split("\n").length, s = [];
    for (var i = 1; i <= n; i++) s.push(i);
    return s.join("\n");
  }

  function readonlyCode(code, langName, opts) {
    opts = opts || {};
    code = SQ.dedent(code);
    return '<div class="ed ed-ro' + (opts.compact ? " ed-compact" : "") + '">' +
      (opts.noGutter ? "" : '<pre class="ed-gutter" aria-hidden="true">' + gutterText(code) + "</pre>") +
      '<div class="ed-body"><pre class="ed-hl"><code>' + SQ.highlight(code, langName) + "\n</code></pre></div>" +
      '<button type="button" class="copy-btn" data-copy="' + esc(code) + '" aria-label="' + esc(t("copy")) + '">' + esc(t("copy")) + "</button>" +
      "</div>";
  }

  function mountEditor(host, initial, onRun) {
    host.classList.add("ed");
    host.innerHTML = '<pre class="ed-gutter" aria-hidden="true"></pre>' +
      '<div class="ed-body"><pre class="ed-hl" aria-hidden="true"><code></code></pre>' +
      '<textarea class="ed-ta" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Python code editor"></textarea></div>';
    var ta = $(".ed-ta", host), hl = $(".ed-hl code", host), pre = $(".ed-hl", host), gut = $(".ed-gutter", host);
    function paint() {
      hl.innerHTML = SQ.highlight(ta.value, "python") + "\n";
      gut.textContent = gutterText(ta.value);
    }
    ta.value = initial;
    paint();
    ta.addEventListener("input", function () { paint(); if (host._onChange) host._onChange(ta.value); });
    ta.addEventListener("scroll", function () { pre.scrollLeft = ta.scrollLeft; pre.scrollTop = ta.scrollTop; });
    ta.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); if (onRun) onRun(); return; }
      if (e.key === "Escape") { ta.blur(); return; }
      var v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
      if (e.key === "Tab") {
        e.preventDefault();
        var ls = v.lastIndexOf("\n", s - 1) + 1;
        if (e.shiftKey) {
          var lineStartSel = ls, block = v.slice(lineStartSel, en);
          var out = block.split("\n").map(function (l) { return l.replace(/^ {1,4}/, ""); }).join("\n");
          setRange(lineStartSel, en, out, lineStartSel, lineStartSel + out.length);
        } else if (s !== en && v.slice(s, en).indexOf("\n") >= 0) {
          var blk = v.slice(ls, en);
          var ind = blk.split("\n").map(function (l) { return "    " + l; }).join("\n");
          setRange(ls, en, ind, ls, ls + ind.length);
        } else {
          setRange(s, en, "    ", s + 4, s + 4);
        }
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
        var lineStart = v.lastIndexOf("\n", s - 1) + 1;
        var line = v.slice(lineStart, s);
        var indent = line.match(/^ */)[0];
        if (/:\s*$/.test(line)) indent += "    ";
        e.preventDefault();
        setRange(s, en, "\n" + indent, s + 1 + indent.length, s + 1 + indent.length);
        return;
      }
      if (e.key === "Backspace" && s === en && s > 0) {
        var ls2 = v.lastIndexOf("\n", s - 1) + 1;
        var before = v.slice(ls2, s);
        if (before.length && /^ +$/.test(before) && before.length % 4 === 0) {
          e.preventDefault();
          setRange(s - 4, s, "", s - 4, s - 4);
        }
      }
    });
    function setRange(a, b, text, selA, selB) {
      ta.focus();
      ta.setSelectionRange(a, b);
      var ok = false;
      try { ok = document.execCommand && document.execCommand("insertText", false, text); } catch (e) { ok = false; }
      if (!ok) {
        ta.value = ta.value.slice(0, a) + text + ta.value.slice(b);
        ta.dispatchEvent(new Event("input"));
      }
      ta.setSelectionRange(selA, selB);
    }
    host._get = function () { return ta.value; };
    host._set = function (v) { ta.value = v; paint(); if (host._onChange) host._onChange(v); };
    return host;
  }

  /* ------------------------------------------------------------------ *
   * Running code & rendering results
   * ------------------------------------------------------------------ */
  function renderError(err) {
    var help = (t("pyHelp") || {})[err.type] || "";
    return '<div class="out-err">' +
      '<div class="out-err-head"><span class="err-type">' + esc(err.type) + "</span>" +
      (err.line ? '<span class="err-line">' + esc(t("line")) + " " + err.line + "</span>" : "") + "</div>" +
      '<div class="err-msg">' + esc(err.msg) + "</div>" +
      (help ? '<div class="err-help">' + esc(help) + "</div>" : "") +
      (err.tb ? '<details class="err-tb"><summary>Traceback</summary><pre>' + esc(err.tb) + "</pre></details>" : "") +
      "</div>";
  }
  function pyUnavailableHtml() {
    return '<div class="out-note warn">' + t("pyFailed") +
      ' <button type="button" class="btn btn-sm" data-action="py-retry">' + esc(t("retry")) + "</button></div>";
  }

  function runCell(cell, block, lesson) {
    var host = $(".editor", cell), out = $(".out", cell), btn = $('[data-action="run"]', cell);
    var code = host._get();
    btn.disabled = true; btn.classList.add("busy");
    btn.querySelector("span").textContent = t("running");
    out.hidden = false;
    out.innerHTML = '<div class="out-note">' + (SQ.runtime.getState() === "ready" ? esc(t("running")) : esc(t("pyLoadingLong"))) + "</div>";
    SQ.runtime.run(code, { setup: block.setup ? SQ.dedent(block.setup) : "", lang: lang(), packages: block.packages || lesson.packages || [] })
      .then(function (r) {
        var html = '<div class="out-head">' + esc(t("output")) + "</div>";
        if (r.timeout) html += '<div class="out-note warn">' + esc(t("timeout")) + "</div>";
        html += r.out ? '<pre class="out-text">' + esc(r.out) + "</pre>" : (r.error ? "" : '<div class="out-empty">' + esc(t("noOutput")) + "</div>");
        if (r.error && !r.timeout) html += renderError(r.error);
        out.innerHTML = html;
        var key = lesson.id + ":" + block.id;
        if (r.ok && !S.cells[key]) { S.cells[key] = true; addXp(2, L(lesson.title)); }
        else { touchStreak(); afterProgress(); }
      }, function () { out.innerHTML = pyUnavailableHtml(); })
      .then(function () {
        btn.disabled = false; btn.classList.remove("busy");
        btn.querySelector("span").textContent = t("run");
      });
  }

  function exState(id) { return S.exercises[id] || (S.exercises[id] = { passed: false, attempts: 0, hints: 0 }); }

  function checkExercise(card, ex, lesson, justRun) {
    var host = $(".editor", card), out = $(".out", card), fb = $(".feedback", card);
    var btnRun = $('[data-action="ex-run"]', card), btnCheck = $('[data-action="ex-check"]', card);
    var code = host._get();
    [btnRun, btnCheck].forEach(function (b) { b.disabled = true; });
    var active = justRun ? btnRun : btnCheck;
    active.classList.add("busy");
    out.hidden = false;
    out.innerHTML = '<div class="out-note">' + (SQ.runtime.getState() === "ready" ? esc(t("running")) : esc(t("pyLoadingLong"))) + "</div>";
    if (!justRun) fb.hidden = true;
    SQ.runtime.run(code, { setup: ex.setup ? SQ.dedent(ex.setup) : "", check: justRun ? "" : SQ.dedent(ex.check), lang: lang(), packages: ex.packages || lesson.packages || [] })
      .then(function (r) {
        var html = '<div class="out-head">' + esc(t("output")) + "</div>";
        if (r.timeout) html += '<div class="out-note warn">' + esc(t("timeout")) + "</div>";
        html += r.out ? '<pre class="out-text">' + esc(r.out) + "</pre>" : (r.error ? "" : '<div class="out-empty">' + esc(t("noOutput")) + "</div>");
        if (r.error && !r.timeout) html += renderError(r.error);
        out.innerHTML = html;
        if (justRun) { touchStreak(); afterProgress(); return; }
        var st = exState(ex.id);
        st.attempts = (st.attempts || 0) + 1;
        var passed = r.ok && r.check && r.check.passed;
        fb.hidden = false;
        if (passed) {
          fb.className = "feedback ok";
          fb.innerHTML = '<span class="fb-icon">✓</span><div><strong>' + esc(t("pass")) + "</strong>" +
            (st.passed ? "" : "<span> +25 XP</span>") + "</div>";
          card.classList.add("solved");
          if (!st.passed) {
            st.passed = true;
            st.firstTry = st.attempts === 1 && !st.hints && !st.usedSolution;
            S.xp += 25;
            touchStreak();
            toast("+25 XP", L(ex.title), "xp");
          }
        } else {
          fb.className = "feedback bad";
          var msg = r.timeout ? t("timeout") : r.error ? (t("errorIn") + " " + r.error.type + ": " + r.error.msg) :
            (r.check && r.check.msg ? r.check.msg : t("fail"));
          fb.innerHTML = '<span class="fb-icon">!</span><div><strong>' + esc(t("failed")) + "</strong><span>" + esc(msg) + "</span>" +
            ((ex.hints && ex.hints.length) ? ' <button type="button" class="link-btn" data-action="hint">' + esc(t("hint")) + "</button>" : "") + "</div>";
          if (st.attempts >= 2) $(".sol-toggle", card).hidden = false;
        }
        $(".ex-attempts", card).textContent = st.attempts + " " + t("attempts");
        checkLessonDone(lesson);
        afterProgress();
      }, function () { out.innerHTML = pyUnavailableHtml(); $(".sol-toggle", card).hidden = false; })
      .then(function () {
        [btnRun, btnCheck].forEach(function (b) { b.disabled = false; });
        active.classList.remove("busy");
      });
  }

  /* ------------------------------------------------------------------ *
   * Chrome: top bar + sidebar
   * ------------------------------------------------------------------ */
  var FLAME = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.2 1-3.8 2.3-5 .2 1.6 1 2.7 2.2 3.2C11 8.6 11 5.6 12 2z" fill="currentColor"/></svg>';

  function ring(pct, size) {
    var r = (size - 8) / 2, c = 2 * Math.PI * r;
    return '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '" aria-hidden="true">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="ring-bg"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="ring-fg" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + (c * (1 - pct / 100)).toFixed(2) + '"/>' +
      "</svg>";
  }

  function renderChrome() {
    document.documentElement.setAttribute("lang", lang());
    $("#lang-tr").setAttribute("aria-pressed", String(lang() === "tr"));
    $("#lang-en").setAttribute("aria-pressed", String(lang() === "en"));
    var st = currentStreak();
    $("#streak-chip").innerHTML = FLAME + "<b>" + st + "</b>";
    $("#streak-chip").title = t("streak") + ": " + st + " " + t("days");
    $("#streak-chip").classList.toggle("on", st > 0);
    $("#xp-value").textContent = (S.xp || 0) + " XP";
    $("#theme-btn").setAttribute("aria-label", lang() === "tr" ? "Temayı değiştir" : "Toggle theme");
    renderPyStatus();

    var total = SQ.lessons.length, done = doneCount(), pct = total ? Math.round(100 * done / total) : 0;
    var lv = levelInfo();
    $("#side-progress").innerHTML =
      '<div class="sp-ring">' + ring(pct, 64) + '<span class="sp-pct">' + pct + "%</span></div>" +
      '<div class="sp-text"><div class="sp-title">' + esc(t("progress")) + "</div>" +
      '<div class="sp-sub">' + done + " / " + total + " " + esc(t("lessonsDone")) + "</div>" +
      '<div class="sp-level"><span>' + esc(t("level")) + " " + lv.n + " · " + esc(lv.name) + '</span><div class="bar"><i style="width:' + lv.pct + '%"></i></div></div></div>';

    var route = parseRoute();
    var html = '<a class="nav-item nav-home' + (route.name === "home" ? " active" : "") + '" href="#/"><span class="ni-num">⌂</span><span class="ni-title">' + esc(t("home")) + "</span></a>";
    html += '<div class="nav-label">' + esc(t("curriculum")) + "</div>";
    SQ.lessons.forEach(function (l) {
      var stt = lessonStatus(l);
      html += '<a class="nav-item st-' + stt + (route.name === "lesson" && route.id === l.id ? " active" : "") + '" href="#/lesson/' + l.id + '">' +
        '<span class="ni-num">' + (stt === "done" ? "✓" : String(l.num).padStart(2, "0")) + "</span>" +
        '<span class="ni-title">' + esc(L(l.title)) + "</span></a>";
    });
    html += '<div class="nav-label">' + esc(lang() === "tr" ? "Ek" : "Extra") + "</div>";
    html += '<a class="nav-item' + (route.name === "cheatsheet" ? " active" : "") + '" href="#/cheatsheet"><span class="ni-num">≡</span><span class="ni-title">' + esc(t("cheatsheet")) + "</span></a>";
    $("#side-nav").innerHTML = html;
    $("#side-foot").innerHTML = (storageOk ? "" : '<div class="side-warn">' + esc(t("storageOff")) + "</div>") +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="reset-progress">' + esc(t("resetProgress")) + "</button>" +
      '<div class="side-credit">' + esc(t("footer")) + "</div>";
  }

  function renderPyStatus() {
    var st = SQ.runtime.getState();
    var el = $("#py-status");
    el.setAttribute("data-state", st);
    var label = { idle: t("pyIdle"), loading: t("pyLoading"), ready: t("pyReady"), error: t("pyError") }[st];
    $("#py-status-label").textContent = label;
    el.title = st === "ready" ? "Pyodide " + SQ.runtime.getLoadedVersion() + " (" + SQ.runtime.getMode() + ")" : st === "error" ? SQ.runtime.getError() : "Pyodide " + SQ.runtime.version;
    $$(".py-banner").forEach(function (b) { b.hidden = st !== "error"; });
  }

  /* ------------------------------------------------------------------ *
   * Router
   * ------------------------------------------------------------------ */
  function parseRoute() {
    var h = (location.hash || "#/").replace(/^#\/?/, "");
    var parts = h.split("/");
    if (!parts[0]) return { name: "home" };
    if (parts[0] === "lesson" && parts[1]) return { name: "lesson", id: decodeURIComponent(parts[1]) };
    if (parts[0] === "cheatsheet") return { name: "cheatsheet" };
    return { name: "404" };
  }

  function render(keepScroll) {
    var y = window.scrollY;
    var route = parseRoute();
    var view = $("#view");
    if (route.name === "home") view.innerHTML = homeHtml();
    else if (route.name === "cheatsheet") view.innerHTML = cheatsheetHtml();
    else if (route.name === "lesson") {
      var lesson = SQ.lessons.filter(function (l) { return l.id === route.id; })[0];
      if (!lesson) view.innerHTML = notFoundHtml();
      else {
        view.innerHTML = lessonHtml(lesson);
        wireLesson(lesson);
        if (!S.visited[lesson.id]) { S.visited[lesson.id] = true; save(); }
        // Start loading Python in the background as soon as a lesson is opened.
        setTimeout(function () { SQ.runtime.ensure().catch(function () { /* banner shows */ }); }, 300);
      }
    } else view.innerHTML = notFoundHtml();
    renderChrome();
    document.title = titleFor(route) + " · SecureQA Learn";
    closeMenu();
    if (keepScroll) window.scrollTo(0, y);
    else { window.scrollTo(0, 0); }
  }
  function titleFor(route) {
    if (route.name === "lesson") {
      var l = SQ.lessons.filter(function (x) { return x.id === route.id; })[0];
      return l ? (t("lesson") + " " + l.num + ": " + L(l.title)) : t("notFound");
    }
    if (route.name === "cheatsheet") return t("cheatsheet");
    return t("tagline");
  }
  function notFoundHtml() {
    return '<section class="page narrow"><h1>404</h1><p>' + esc(t("notFound")) + '</p><a class="btn" href="#/">' + esc(t("backHome")) + "</a></section>";
  }

  /* ------------------------------------------------------------------ *
   * Home
   * ------------------------------------------------------------------ */
  function nextLesson() {
    return SQ.lessons.filter(function (l) { return !isDone(l.id); })[0] || SQ.lessons[0];
  }
  function homeHtml() {
    var total = SQ.lessons.length, done = doneCount(), pct = total ? Math.round(100 * done / total) : 0, lv = levelInfo();
    var nl = nextLesson();
    var h = '<section class="page home">';
    h += '<div class="hero"><div class="hero-text">' +
      '<div class="eyebrow">' + esc(t("tagline")) + " · TR / EN</div>" +
      "<h1>" + t("heroTitle") + "</h1><p>" + esc(t("heroText")) + "</p>" +
      '<div class="hero-cta">' + (nl ? '<a class="btn btn-primary btn-lg" href="#/lesson/' + nl.id + '">' + esc(done ? t("continue") : t("start")) +
        ' <span class="cta-sub">' + esc(t("lesson")) + " " + nl.num + " · " + esc(L(nl.title)) + "</span></a>" : "") +
      '<a class="btn btn-ghost btn-lg" href="#/cheatsheet">' + esc(t("cheatsheet")) + "</a></div></div>" +
      '<div class="hero-art" aria-hidden="true">' + heroArt() + "</div></div>";

    h += '<div class="stats">' +
      stat('<div class="stat-ring">' + ring(pct, 56) + "<b>" + pct + "%</b></div>", done + " / " + total, t("statLessons")) +
      stat('<div class="stat-ic">XP</div>', String(S.xp || 0), t("statXp") + " · " + t("level") + " " + lv.n + " " + lv.name) +
      stat('<div class="stat-ic flame">' + FLAME + "</div>", currentStreak() + " " + t("days"), t("statStreak")) +
      stat('<div class="stat-ic">★</div>', Object.keys(S.badges).length + " / " + BADGES.length, t("statBadges")) +
      "</div>";

    h += '<div class="how card"><h2>' + esc(t("howTitle")) + '</h2><ol class="how-list">' +
      "<li>" + t("how1") + "</li><li>" + t("how2") + "</li><li>" + t("how3") + "</li><li>" + t("how4") + "</li></ol></div>";

    h += '<h2 class="section-title">' + esc(t("allLessons")) + '</h2><div class="lesson-grid">';
    SQ.lessons.forEach(function (l) {
      var st = lessonStatus(l);
      var stLabel = st === "done" ? t("done") : st === "progress" ? t("inProgress") : t("notStarted");
      h += '<a class="lesson-card st-' + st + '" href="#/lesson/' + l.id + '">' +
        '<div class="lc-top"><span class="lc-icon">' + esc(l.icon || l.num) + '</span><span class="lc-num">' + esc(t("lesson")) + " " + l.num + "</span>" +
        '<span class="lc-status">' + esc(stLabel) + "</span></div>" +
        "<h3>" + esc(L(l.title)) + "</h3><p>" + esc(L(l.summary)) + "</p>" +
        '<div class="lc-meta"><span>' + l.minutes + " " + esc(t("minutes")) + "</span><span>" + l.exercises.length + " " + esc(t("exercises").toLocaleLowerCase(lang())) + "</span></div></a>";
    });
    h += "</div>";

    h += '<h2 class="section-title">' + esc(t("badges")) + '</h2><div class="badge-grid">';
    BADGES.forEach(function (b) {
      var got = !!S.badges[b.id];
      h += '<div class="badge' + (got ? " got" : "") + '" title="' + esc(L(b.desc)) + '"><div class="badge-hex">' + esc(b.icon) + "</div>" +
        "<div><strong>" + esc(L(b.name)) + "</strong><span>" + esc(L(b.desc)) + "</span></div></div>";
    });
    h += "</div></section>";
    return h;
  }
  function stat(icon, value, label) {
    return '<div class="stat card">' + icon + '<div><div class="stat-v">' + esc(value) + '</div><div class="stat-l">' + esc(label) + "</div></div></div>";
  }
  function heroArt() {
    var code = [
      "class LoginPage(BasePage):",
      "    def login(self, user: str, pw: str) -> None:",
      "        self.page.fill(\"#username\", user)",
      "        self.page.fill(\"#password\", pw)",
      "        self.page.click(\"#login-btn\")",
      "",
      "def test_sqli_login(login_page):",
      "    login_page.login(\"' OR '1'='1' --\", \"x\")",
      "    assert not login_page.is_logged_in()"
    ].join("\n");
    return '<div class="art-window"><div class="art-bar"><i></i><i></i><i></i><span>test_login.py</span></div>' +
      '<pre><code>' + SQ.highlight(code, "python") + "</code></pre>" +
      '<div class="art-result"><span class="pill fail">FAILED</span> SQLi auth bypass → <span class="pill ok">Finding: critical</span></div></div>';
  }

  /* ------------------------------------------------------------------ *
   * Lesson
   * ------------------------------------------------------------------ */
  var CALLOUT_ICON = { tip: "i", warn: "!", qa: "QA", sec: "⚑", info: "i" };
  var CALLOUT_TITLE = {
    tip: { tr: "İpucu", en: "Tip" }, warn: { tr: "Dikkat", en: "Watch out" },
    qa: { tr: "Test otomasyonu benzetmesi", en: "Test-automation analogy" }, sec: { tr: "Güvenlik notu", en: "Security note" },
    info: { tr: "Bilgi", en: "Info" }
  };

  function lessonHtml(lesson) {
    var idx = SQ.lessons.indexOf(lesson), prev = SQ.lessons[idx - 1], next = SQ.lessons[idx + 1];
    var h = '<article class="page lesson" data-lesson="' + esc(lesson.id) + '">';
    h += '<div class="banner warn py-banner" hidden>' + t("pyFailed") + ' <button type="button" class="btn btn-sm" data-action="py-retry">' + esc(t("retry")) + "</button></div>";
    h += '<header class="lesson-head"><div class="lh-meta"><span class="lh-num">' + esc(t("lesson")) + " " + lesson.num + " / " + SQ.lessons.length + "</span>" +
      '<span class="lh-dot">·</span><span>' + lesson.minutes + " " + esc(t("minutes")) + "</span>" +
      (isDone(lesson.id) ? '<span class="pill ok">' + esc(t("done")) + "</span>" : "") + "</div>" +
      "<h1>" + esc(L(lesson.title)) + '</h1><p class="lead">' + esc(L(lesson.summary)) + "</p></header>";
    if (lesson.goals) {
      var goals = lesson.goals[lang()] || lesson.goals.tr || [];
      h += '<div class="goals card"><div class="goals-title">' + esc(t("goals")) + "</div><ul>" +
        goals.map(function (g) { return "<li>" + g + "</li>"; }).join("") + "</ul></div>";
    }
    lesson.blocks.forEach(function (b, i) { h += blockHtml(b, i, lesson); });

    if (lesson.exercises.length) {
      h += '<h2 class="section-title" id="exercises"><span class="st-ic">✎</span>' + esc(t("exercises")) + "</h2>";
      lesson.exercises.forEach(function (ex, i) { h += exerciseHtml(ex, i, lesson); });
    }
    if (lesson.quiz.length) h += quizHtml(lesson);

    h += '<div class="checklist card" id="checklist"></div>';
    h += '<nav class="lesson-nav">' +
      (prev ? '<a class="ln prev" href="#/lesson/' + prev.id + '"><span>← ' + esc(t("prev")) + "</span><strong>" + esc(L(prev.title)) + "</strong></a>" : "<span></span>") +
      (next ? '<a class="ln next" href="#/lesson/' + next.id + '"><span>' + esc(t("next")) + " →</span><strong>" + esc(L(next.title)) + "</strong></a>"
        : '<a class="ln next" href="#/cheatsheet"><span>' + esc(t("next")) + " →</span><strong>" + esc(t("cheatsheet")) + "</strong></a>") +
      "</nav></article>";
    return h;
  }

  function blockHtml(b, i, lesson) {
    switch (b.t) {
      case "h": return '<h2 class="section-title">' + esc(L(b)) + "</h2>";
      case "h3": return '<h3 class="sub-title">' + esc(L(b)) + "</h3>";
      case "text": return '<div class="prose">' + L(b) + "</div>";
      case "callout": {
        var k = b.kind || "tip";
        return '<aside class="callout c-' + k + '"><div class="c-ic">' + esc(CALLOUT_ICON[k] || "i") + "</div><div><div class=\"c-title\">" +
          esc(L(b.title) || L(CALLOUT_TITLE[k])) + '</div><div class="prose">' + L(b) + "</div></div></aside>";
      }
      case "code": return codeCellHtml(b, lesson);
      case "project": return projectHtml(b);
      case "compare": return compareHtml(b);
      default: return "";
    }
  }

  function codeCellHtml(b, lesson) {
    var head = '<div class="cell-head">' + (b.file ? '<span class="file-chip">' + esc(b.file) + "</span>" : "") +
      (b.title ? '<span class="cell-title">' + esc(L(b.title)) + "</span>" : "") +
      (b.simulated ? '<span class="pill sim" title="' + esc(t("simulatedNote")) + '">' + esc(t("simulated")) + "</span>" : "") +
      '<span class="cell-kind">' + esc(b.readonly ? (b.real ? t("realCode") : t("readonly")) : t("editable")) + "</span></div>";
    if (b.readonly) {
      return '<figure class="cell ro' + (b.real ? " real" : "") + '">' + head + readonlyCode(b.code, b.lang || "python") +
        (b.caption ? '<figcaption class="prose">' + L(b.caption) + "</figcaption>" : "") + "</figure>";
    }
    var key = lesson.id + ":" + b.id;
    return '<figure class="cell live" data-cell="' + esc(b.id) + '">' + head +
      '<div class="editor" data-key="' + esc(key) + '"></div>' +
      '<div class="cell-actions"><button type="button" class="btn btn-primary btn-sm" data-action="run"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg><span>' + esc(t("run")) + "</span></button>" +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="reset">' + esc(t("reset")) + "</button>" +
      '<span class="kbd-hint">' + esc(t("shortcutRun")) + "</span></div>" +
      '<div class="out" hidden aria-live="polite"></div>' +
      (b.caption ? '<figcaption class="prose">' + L(b.caption) + "</figcaption>" : "") + "</figure>";
  }

  function compareHtml(b) {
    return '<div class="compare">' + b.items.map(function (it) {
      return '<div class="cmp ' + (it.kind || "") + '"><div class="cmp-title">' + esc(L(it.title)) + "</div>" + readonlyCode(it.code, it.lang || "python", { compact: true }) +
        (it.note ? '<div class="prose small">' + L(it.note) + "</div>" : "") + "</div>";
    }).join("") + "</div>";
  }

  function projectHtml(b) {
    var h = '<section class="project"><div class="pj-head"><div class="pj-ic" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></div>' +
      '<div><div class="pj-title">' + esc(t("inProject")) + "</div>" +
      '<div class="pj-sub">' + esc(t("inProjectSub")) + "</div></div></div>" +
      '<div class="prose">' + L(b) + "</div>";
    if (b.code) {
      h += '<div class="cell ro real"><div class="cell-head"><span class="file-chip">' + esc(b.file || "") + "</span>" +
        '<span class="cell-kind">' + esc(t("readonly")) + "</span></div>" + readonlyCode(b.code, b.lang || "python") + "</div>";
    }
    if (b.notes && b.notes.length) {
      h += '<div class="pj-notes"><div class="pj-notes-title">' + esc(t("lineByLine")) + "</div><ol>" +
        b.notes.map(function (n) {
          return '<li><span class="ln-badge">' + esc(t("line")) + " " + esc(String(n.line)) + "</span><span>" + L(n) + "</span></li>";
        }).join("") + "</ol></div>";
    }
    return h + "</section>";
  }

  function exerciseHtml(ex, i, lesson) {
    var st = S.exercises[ex.id] || {};
    var key = lesson.id + ":" + ex.id;
    return '<section class="exercise card' + (st.passed ? " solved" : "") + '" data-ex="' + esc(ex.id) + '">' +
      '<div class="ex-head"><span class="ex-num">' + esc(t("exercise")) + " " + (i + 1) + "</span><h3>" + esc(L(ex.title)) + "</h3>" +
      '<span class="ex-badge">' + esc(t("solved")) + " ✓</span></div>" +
      '<div class="prose">' + L(ex.prompt) + "</div>" +
      '<div class="editor" data-key="' + esc(key) + '"></div>' +
      '<div class="cell-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="ex-check"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>' + esc(t("check")) + "</span></button>" +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="ex-run"><span>' + esc(t("run")) + "</span></button>" +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="hint">' + esc(t("hint")) + "</button>" +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="reset">' + esc(t("reset")) + "</button>" +
      '<span class="ex-attempts">' + (st.attempts ? st.attempts + " " + esc(t("attempts")) : "") + "</span></div>" +
      '<div class="feedback" hidden aria-live="polite"></div>' +
      '<div class="hints"></div>' +
      '<div class="out" hidden aria-live="polite"></div>' +
      '<div class="sol-toggle"' + ((st.attempts >= 2 || st.passed || (st.hints || 0) >= (ex.hints || []).length && st.hints) ? "" : " hidden") + '>' +
      '<button type="button" class="link-btn" data-action="solution">' + esc(t("solution")) + "</button>" +
      '<div class="solution" hidden>' + readonlyCode(ex.solution || "", "python") +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="use-solution">' + esc(t("useSolution")) + "</button></div></div>" +
      "</section>";
  }

  var quizSel = {}; // transient selections: lessonId -> [idx]
  function quizHtml(lesson) {
    var saved = S.quizzes[lesson.id];
    var sel = quizSel[lesson.id] || (saved ? saved.answers.slice() : []);
    var submitted = !!(saved && saved.showing);
    var h = '<section class="quiz card" id="quiz"><h2 class="section-title"><span class="st-ic">?</span>' + esc(t("quiz")) + "</h2>";
    lesson.quiz.forEach(function (q, qi) {
      h += '<fieldset class="q' + (submitted ? (sel[qi] === q.answer ? " right" : " wrong") : "") + '"><legend><span class="q-n">' + (qi + 1) + "</span>" + L(q.q) + "</legend>";
      q.options.forEach(function (o, oi) {
        var cls = "";
        if (submitted) { if (oi === q.answer) cls = " correct"; else if (sel[qi] === oi) cls = " incorrect"; }
        h += '<label class="opt' + cls + (sel[qi] === oi ? " selected" : "") + '"><input type="radio" name="q-' + esc(lesson.id) + "-" + qi + '" value="' + oi + '"' +
          (sel[qi] === oi ? " checked" : "") + (submitted ? " disabled" : "") + ' data-q="' + qi + '"><span class="opt-mark"></span><span class="opt-text">' + L(o) + "</span></label>";
      });
      if (submitted && q.explain) h += '<div class="q-explain">' + L(q.explain) + "</div>";
      h += "</fieldset>";
    });
    h += '<div class="quiz-actions">';
    if (submitted) {
      h += '<div class="quiz-score">' + esc(t("quizScore")) + ": <b>" + saved.score + " / " + saved.total + "</b></div>" +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="quiz-retry">' + esc(t("retryQuiz")) + "</button>";
    } else {
      h += '<button type="button" class="btn btn-primary btn-sm" data-action="quiz-submit"' + (sel.filter(function (x) { return x !== undefined && x !== null; }).length < lesson.quiz.length ? " disabled" : "") + ">" + esc(t("submitQuiz")) + "</button>";
    }
    return h + "</div></section>";
  }

  function updateChecklist(lesson) {
    var box = $("#checklist");
    if (!box) return;
    var exPassed = lesson.exercises.filter(function (e) { return S.exercises[e.id] && S.exercises[e.id].passed; }).length;
    var exOk = exPassed === lesson.exercises.length;
    var qOk = !lesson.quiz.length || !!S.quizzes[lesson.id];
    var done = isDone(lesson.id);
    box.className = "checklist card" + (done ? " done" : "");
    box.innerHTML = '<div class="cl-title">' + esc(done ? t("lessonComplete") : t("checklist")) + "</div><ul>" +
      '<li class="' + (exOk ? "ok" : "") + '"><span class="cl-box">' + (exOk ? "✓" : "") + "</span>" + esc(t("chkExercises")) + " <em>(" + exPassed + "/" + lesson.exercises.length + ")</em></li>" +
      '<li class="' + (qOk ? "ok" : "") + '"><span class="cl-box">' + (qOk ? "✓" : "") + "</span>" + esc(t("chkQuiz")) + "</li></ul>";
  }

  function wireLesson(lesson) {
    var root = $(".lesson");
    // Mount editors
    $$(".editor", root).forEach(function (host) {
      var key = host.getAttribute("data-key");
      var cellEl = host.closest("[data-cell]"), exEl = host.closest("[data-ex]");
      var original;
      if (cellEl) original = SQ.dedent(lesson.blocks.filter(function (b) { return b.id === cellEl.getAttribute("data-cell"); })[0].code);
      else original = SQ.dedent(lesson.exercises.filter(function (e) { return e.id === exEl.getAttribute("data-ex"); })[0].starter || "");
      var code = S.drafts[key] !== undefined ? S.drafts[key] : original;
      mountEditor(host, code, function () {
        var btn = $('[data-action="run"]', host.parentNode) || $('[data-action="ex-check"]', host.parentNode);
        if (btn && !btn.disabled) btn.click();
      });
      host._original = original;
      host._onChange = function (v) {
        if (v === original) delete S.drafts[key]; else S.drafts[key] = v;
        save();
      };
    });
    // Restore hints already revealed
    lesson.exercises.forEach(function (ex) {
      var st = S.exercises[ex.id];
      if (st && st.hints) renderHints($('[data-ex="' + ex.id + '"]', root), ex, st.hints);
    });
    updateChecklist(lesson);
    renderPyStatus();
  }

  function renderHints(card, ex, n) {
    var box = $(".hints", card);
    var hints = (ex.hints || []).slice(0, n);
    box.innerHTML = hints.map(function (h, i) {
      return '<div class="hint"><span class="hint-n">' + esc(t("hint")) + " " + (i + 1) + "</span><div class=\"prose\">" + L(h) + "</div></div>";
    }).join("");
    var hb = $('.cell-actions [data-action="hint"]', card);
    if (hb) {
      hb.textContent = n >= (ex.hints || []).length ? t("hint") : (n ? t("nextHint") : t("hint"));
      hb.disabled = n >= (ex.hints || []).length;
    }
    if (n >= (ex.hints || []).length && n > 0) $(".sol-toggle", card).hidden = false;
  }

  /* ------------------------------------------------------------------ *
   * Cheat sheet
   * ------------------------------------------------------------------ */
  function cheatsheetHtml() {
    var cs = SQ.cheatsheet;
    if (!cs) return notFoundHtml();
    var h = '<section class="page cheatsheet"><header class="lesson-head"><div class="lh-meta"><span class="lh-num">' + esc(t("cheatsheet")) + "</span></div>" +
      "<h1>" + esc(L(cs.title)) + '</h1><p class="lead">' + esc(L(cs.summary)) + "</p></header>";
    h += '<nav class="cs-toc">' + cs.sections.map(function (s, i) { return '<a href="#/cheatsheet" data-jump="cs-' + i + '">' + esc(L(s.title)) + "</a>"; }).join("") + "</nav>";
    cs.sections.forEach(function (s, i) {
      h += '<h2 class="section-title" id="cs-' + i + '">' + esc(L(s.title)) + '</h2><div class="cs-grid">';
      s.items.forEach(function (it) {
        h += '<div class="cs-card card"><div class="cs-head">' + esc(L(it.title)) + "</div>" + readonlyCode(it.code, it.lang || "python", { compact: true, noGutter: true }) +
          (it.note ? '<div class="cs-note prose small">' + L(it.note) + "</div>" : "") + "</div>";
      });
      h += "</div>";
    });
    return h + "</section>";
  }

  /* ------------------------------------------------------------------ *
   * Events
   * ------------------------------------------------------------------ */
  function currentLesson() {
    var r = parseRoute();
    return r.name === "lesson" ? SQ.lessons.filter(function (l) { return l.id === r.id; })[0] : null;
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-action], [data-copy], [data-jump]");
    if (!a) return;
    if (a.hasAttribute("data-jump")) {
      e.preventDefault();
      var tgt = document.getElementById(a.getAttribute("data-jump"));
      if (tgt) tgt.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (a.hasAttribute("data-copy")) {
      var text = a.getAttribute("data-copy");
      var done = function () { a.textContent = t("copied"); setTimeout(function () { a.textContent = t("copy"); }, 1200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      else { fallbackCopy(text); done(); }
      return;
    }
    var action = a.getAttribute("data-action");
    var lesson = currentLesson();
    var cell = a.closest("[data-cell]"), card = a.closest("[data-ex]");
    if (action === "py-retry") { SQ.runtime.retry().catch(function () { /* */ }); return; }
    if (action === "reset-progress") {
      if (window.confirm(t("resetConfirm"))) {
        var keep = { lang: S.lang, theme: S.theme };
        S = defaultState(); S.lang = keep.lang; S.theme = keep.theme;
        quizSel = {};
        try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (er) { /* */ }
        render(false);
        toast(t("resetDone"), "", "info");
      }
      return;
    }
    if (!lesson) return;
    if (action === "run" && cell) {
      var block = lesson.blocks.filter(function (b) { return b.id === cell.getAttribute("data-cell"); })[0];
      runCell(cell, block, lesson);
    } else if (action === "reset") {
      var host = $(".editor", cell || card);
      host._set(host._original);
      var out = $(".out", cell || card); out.hidden = true; out.innerHTML = "";
      if (card) { $(".feedback", card).hidden = true; }
    } else if (card) {
      var ex = lesson.exercises.filter(function (x) { return x.id === card.getAttribute("data-ex"); })[0];
      if (action === "ex-check") checkExercise(card, ex, lesson, false);
      else if (action === "ex-run") checkExercise(card, ex, lesson, true);
      else if (action === "hint") {
        var st = exState(ex.id);
        st.hints = Math.min((st.hints || 0) + 1, (ex.hints || []).length);
        renderHints(card, ex, st.hints);
        save();
        var last = $$(".hint", card).pop(); if (last) last.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else if (action === "solution") {
        var sol = $(".solution", card);
        sol.hidden = !sol.hidden;
        a.textContent = sol.hidden ? t("solution") : t("hideSolution");
      } else if (action === "use-solution") {
        var hst = $(".editor", card);
        hst._set(SQ.dedent(ex.solution || ""));
        exState(ex.id).usedSolution = true;
        save();
      }
    } else if (action === "quiz-submit") {
      var sel = quizSel[lesson.id] || [];
      var score = lesson.quiz.reduce(function (acc, q, i) { return acc + (sel[i] === q.answer ? 1 : 0); }, 0);
      var prev = S.quizzes[lesson.id];
      var first = !prev;
      S.quizzes[lesson.id] = { answers: sel.slice(), score: score, total: lesson.quiz.length, best: Math.max(score, prev ? prev.best || 0 : 0), showing: true };
      if (first) { S.xp += score * 10; touchStreak(); if (score) toast("+" + score * 10 + " XP", t("quiz"), "xp"); }
      quizSel[lesson.id] = sel.slice();
      rerenderQuiz(lesson);
      checkLessonDone(lesson);
      afterProgress();
    } else if (action === "quiz-retry") {
      if (S.quizzes[lesson.id]) S.quizzes[lesson.id].showing = false;
      quizSel[lesson.id] = [];
      rerenderQuiz(lesson);
      save();
    }
  });

  function rerenderQuiz(lesson) {
    var q = $("#quiz");
    if (!q) return;
    var tmp = document.createElement("div");
    tmp.innerHTML = quizHtml(lesson);
    q.replaceWith(tmp.firstChild);
  }

  document.addEventListener("change", function (e) {
    var inp = e.target;
    if (!inp.matches || !inp.matches('.quiz input[type="radio"]')) return;
    var lesson = currentLesson();
    if (!lesson) return;
    var sel = quizSel[lesson.id] || (quizSel[lesson.id] = []);
    sel[+inp.getAttribute("data-q")] = +inp.value;
    $$('input[name="' + inp.name + '"]').forEach(function (r) { r.closest(".opt").classList.toggle("selected", r.checked); });
    var btn = $('[data-action="quiz-submit"]');
    if (btn) btn.disabled = sel.filter(function (x) { return x !== undefined && x !== null; }).length < lesson.quiz.length;
  });

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) { /* */ }
    ta.remove();
  }

  // Language & theme
  $$(".seg-btn[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (S.lang === b.getAttribute("data-lang")) return;
      S.lang = b.getAttribute("data-lang");
      save();
      render(true);
    });
  });
  function applyTheme() {
    var th = S.theme || (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.setAttribute("data-theme", th);
  }
  $("#theme-btn").addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme");
    S.theme = cur === "dark" ? "light" : "dark";
    applyTheme();
    save();
  });

  // Mobile menu
  function openMenu() { document.body.classList.add("menu-open"); $("#scrim").hidden = false; $("#menu-btn").setAttribute("aria-expanded", "true"); }
  function closeMenu() { document.body.classList.remove("menu-open"); $("#scrim").hidden = true; $("#menu-btn").setAttribute("aria-expanded", "false"); }
  $("#menu-btn").addEventListener("click", function () { document.body.classList.contains("menu-open") ? closeMenu() : openMenu(); });
  $("#scrim").addEventListener("click", closeMenu);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  SQ.runtime.onChange(function () { renderPyStatus(); });
  window.addEventListener("hashchange", function () { render(false); });

  applyTheme();
  render(false);
  if (!storageOk) toast(t("storageOff"), "", "info");

  // Small debug/test hook (used by the automated UI checks).
  SQ.app = { state: function () { return S; }, render: render, badges: BADGES };
})();
