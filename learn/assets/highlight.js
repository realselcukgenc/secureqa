/*
 * Tiny, dependency-free syntax highlighter for Python (plus minimal bash/text).
 * Produces HTML with <span class="tk-..."> tokens. Good enough for teaching snippets.
 */
(function () {
  "use strict";
  var SQ = (window.SQ = window.SQ || {});

  var KEYWORDS = ("False None True and as assert async await break class continue def del elif else except " +
    "finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case").split(" ");
  var BUILTINS = ("print len range str int float bool list dict set tuple type isinstance issubclass open input " +
    "enumerate zip map filter sorted reversed sum min max abs round any all repr hash id iter next super " +
    "getattr setattr hasattr vars dir format object property staticmethod classmethod Exception ValueError " +
    "TypeError KeyError IndexError AttributeError NameError ZeroDivisionError AssertionError RuntimeError " +
    "FileNotFoundError TimeoutError ImportError ModuleNotFoundError OSError StopIteration NotImplementedError " +
    "PermissionError ConnectionError").split(" ");
  var KW = {}, BI = {};
  KEYWORDS.forEach(function (k) { KW[k] = 1; });
  BUILTINS.forEach(function (k) { BI[k] = 1; });

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  SQ.escapeHtml = function (s) { return esc(String(s)).replace(/"/g, "&quot;"); };

  function span(cls, text) { return '<span class="tk-' + cls + '">' + esc(text) + "</span>"; }

  /* Highlight {expressions} inside an f-string body. */
  function fstring(text) {
    var out = "", i = 0, buf = "";
    while (i < text.length) {
      var c = text[i];
      if (c === "{" && text[i + 1] === "{") { buf += "{{"; i += 2; continue; }
      if (c === "}" && text[i + 1] === "}") { buf += "}}"; i += 2; continue; }
      if (c === "{") {
        var depth = 1, j = i + 1;
        while (j < text.length && depth) { if (text[j] === "{") depth++; else if (text[j] === "}") depth--; j++; }
        out += span("str", buf); buf = "";
        out += '<span class="tk-fx">' + esc("{") + python(text.slice(i + 1, j - 1)) + esc("}") + "</span>";
        i = j; continue;
      }
      buf += c; i++;
    }
    return out + span("str", buf);
  }

  var RE = {
    ws: /^[ \t]+/,
    nl: /^\n/,
    comment: /^#[^\n]*/,
    str: /^([rRbBuUfF]{0,2})("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)/,
    num: /^(?:0[xX][0-9a-fA-F_]+|\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?|\.\d+)j?/,
    deco: /^@[A-Za-z_][\w.]*/,
    ident: /^[A-Za-z_À-ɏ][\wÀ-ɏ]*/,
    op: /^(?:->|\*\*|\/\/|==|!=|<=|>=|:=|[-+*\/%<>=!&|^~:.,;()[\]{}])/
  };

  function python(src) {
    var out = "", s = src, prev = "", m;
    while (s.length) {
      if ((m = RE.ws.exec(s)) || (m = RE.nl.exec(s))) { out += m[0]; s = s.slice(m[0].length); continue; }
      if ((m = RE.comment.exec(s))) { out += span("com", m[0]); s = s.slice(m[0].length); continue; }
      if ((m = RE.str.exec(s))) {
        var prefix = m[1] || "", body = m[2];
        // An identifier that merely starts with r/b/f letters (e.g. "for") is not a string prefix.
        if (prefix && !/^["']/.test(s.slice(prefix.length))) { m = null; }
        else {
          if (/f/i.test(prefix)) out += span("kw2", prefix) + fstring(body);
          else out += span("str", prefix + body);
          s = s.slice(m[0].length); prev = "str"; continue;
        }
      }
      if ((m = RE.deco.exec(s)) && (prev === "" || prev === "nl" || /\n[ \t]*$/.test(out) || out === "")) {
        out += span("deco", m[0]); s = s.slice(m[0].length); continue;
      }
      if ((m = RE.num.exec(s))) { out += span("num", m[0]); s = s.slice(m[0].length); prev = "num"; continue; }
      if ((m = RE.ident.exec(s))) {
        var w = m[0], rest = s.slice(w.length), cls = null;
        if (prev === "def") cls = "fn";
        else if (prev === "class") cls = "cls";
        else if (KW[w]) cls = "kw";
        else if (w === "self" || w === "cls") cls = "self";
        else if (BI[w]) cls = "bi";
        else if (/^\s*\(/.test(rest)) cls = /^[A-Z]/.test(w) ? "cls" : "call";
        else if (/^[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*$/.test(w)) cls = "cls";
        else if (/^[A-Z][A-Z0-9_]+$/.test(w)) cls = "const";
        out += cls ? span(cls, w) : esc(w);
        prev = (w === "def" || w === "class") ? w : "id";
        s = rest; continue;
      }
      if ((m = RE.op.exec(s))) { out += span("op", m[0]); s = s.slice(m[0].length); prev = "op"; continue; }
      out += esc(s[0]); s = s.slice(1);
    }
    return out;
  }

  function bash(src) {
    return src.split("\n").map(function (line) {
      if (/^\s*#/.test(line)) return span("com", line);
      var m = line.match(/^(\s*\$?\s*)(\S+)(.*)$/);
      if (!m) return esc(line);
      return esc(m[1]) + span("fn", m[2]) + esc(m[3]).replace(/(\s)(--?[\w-]+)/g, '$1<span class="tk-kw">$2</span>');
    }).join("\n");
  }

  SQ.highlight = function (src, lang) {
    src = String(src == null ? "" : src);
    if (lang === "text") return esc(src);
    if (lang === "bash") return bash(src);
    return python(src);
  };
})();
