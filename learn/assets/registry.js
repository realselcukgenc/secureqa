/*
 * SecureQA Learn — lesson registry.
 *
 * Every file in learn/lessons/ calls SQ.addLesson({...}). To add a lesson:
 *   1. create learn/lessons/16-my-topic.js  (copy an existing lesson as a template)
 *   2. add a <script src="lessons/16-my-topic.js"></script> tag to index.html
 * Lessons are sorted by `num`, so file order in index.html does not matter.
 *
 * Lesson shape (all user-facing text is bilingual {tr, en}; text fields may contain HTML):
 * {
 *   id: "01-variables", num: 1, icon: "x=1", minutes: 15,
 *   title: {tr, en}, summary: {tr, en}, goals: {tr: [..], en: [..]},
 *   blocks: [
 *     { t: "text", tr: "<p>..</p>", en: "<p>..</p>" },
 *     { t: "h", tr: "Başlık", en: "Heading" },
 *     { t: "code", id: "c1", title: {tr,en}, code: "...", setup?: "hidden python run first",
 *       readonly?: true, lang?: "python"|"text"|"bash", file?: "path/shown/as/badge.py" },
 *     { t: "callout", kind: "tip"|"warn"|"qa"|"sec", title: {tr,en}, tr, en },
 *     { t: "project", file: "secureqa/pages/login_page.py", tr, en, code, notes?: [{line, tr, en}] }
 *   ],
 *   exercises: [{ id, title: {tr,en}, prompt: {tr,en}, starter, check, setup?,
 *                 hints: [{tr,en}], solution }],
 *   quiz: [{ q: {tr,en}, options: [{tr,en}], answer: 0, explain: {tr,en} }]
 * }
 *
 * Exercise `check` code runs in the same namespace after the learner's code. Available helpers:
 *   __output__  -> everything the learner's code printed (str)
 *   __lang__    -> "tr" or "en"
 *   _t(tr, en)  -> pick a message in the current language (use it in assert messages)
 */
(function () {
  "use strict";
  var SQ = (window.SQ = window.SQ || {});
  SQ.lessons = SQ.lessons || [];
  SQ.cheatsheet = SQ.cheatsheet || null;

  SQ.addLesson = function (lesson) {
    if (!lesson || !lesson.id) { console.warn("SQ.addLesson: lesson without id ignored"); return; }
    if (SQ.lessons.some(function (l) { return l.id === lesson.id; })) {
      console.warn("SQ.addLesson: duplicate lesson id " + lesson.id); return;
    }
    lesson.blocks = lesson.blocks || [];
    lesson.exercises = lesson.exercises || [];
    lesson.quiz = lesson.quiz || [];
    SQ.lessons.push(lesson);
    SQ.lessons.sort(function (a, b) { return a.num - b.num; });
  };

  SQ.setCheatsheet = function (cs) { SQ.cheatsheet = cs; };

  /** Remove the common leading indentation of a code string and trim blank edge lines. */
  SQ.dedent = function (src) {
    var lines = String(src).replace(/\t/g, "    ").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    var min = Infinity;
    lines.forEach(function (l) {
      if (!l.trim()) return;
      var m = l.match(/^ */)[0].length;
      if (m < min) min = m;
    });
    if (!isFinite(min)) min = 0;
    return lines.map(function (l) { return l.slice(min); }).join("\n");
  };
})();
