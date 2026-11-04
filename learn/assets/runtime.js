/*
 * Python runtime for SecureQA Learn: Pyodide (CPython compiled to WebAssembly).
 *
 * - Loaded lazily from cdn.jsdelivr.net (pinned version) the first time a lesson needs it.
 * - Runs inside a Web Worker so an infinite loop can be stopped (we terminate + restart the worker).
 * - If a Worker cannot be created (some file:// setups), falls back to the main thread.
 * - Self-hosting / offline: put the Pyodide "full" files in a folder and open the site with
 *   ?pyodide=<folder-url>/  (remembered in localStorage).
 */
(function () {
  "use strict";
  var SQ = (window.SQ = window.SQ || {});

  var PYODIDE_VERSION = "0.26.4";
  var CDN_BASE = "https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/";
  var RUN_TIMEOUT_MS = 10000;
  var LOAD_TIMEOUT_MS = 120000;

  function resolveBase() {
    var base = CDN_BASE;
    try {
      var qp = new URLSearchParams(location.search).get("pyodide");
      if (qp === "cdn" || qp === "") { localStorage.removeItem("secureqa.learn.pyodideBase"); }
      else if (qp) { localStorage.setItem("secureqa.learn.pyodideBase", qp); }
      var saved = localStorage.getItem("secureqa.learn.pyodideBase");
      if (saved) base = saved;
    } catch (e) {
      try { var q2 = new URLSearchParams(location.search).get("pyodide"); if (q2 && q2 !== "cdn") base = q2; } catch (e2) { /* ignore */ }
    }
    if (!/\/$/.test(base)) base += "/";
    try { base = new URL(base, location.href).href; } catch (e) { /* keep */ }
    return base;
  }

  /* Python helper installed once into the interpreter. Executes learner code in a fresh namespace,
     captures stdout/stderr, runs hidden checks and returns a JSON result. */
  var PRELUDE = [
    "import sys, io, json, traceback, builtins",
    "class _SQBuf(io.StringIO):",
    "    LIMIT = 40000",
    "    def write(self, s):",
    "        if self.tell() < self.LIMIT:",
    "            return super().write(s)",
    "        return len(s)",
    "def _sq_no_input(*args, **kwargs):",
    "    raise RuntimeError('input() is not supported here / input() burada desteklenmiyor')",
    "builtins.input = _sq_no_input",
    "def _sq_err(e, fname):",
    "    line = None",
    "    if isinstance(e, SyntaxError) and e.filename == fname:",
    "        line = e.lineno",
    "    else:",
    "        for fr in traceback.extract_tb(e.__traceback__):",
    "            if fr.filename == fname:",
    "                line = fr.lineno",
    "    tb = [l for l in traceback.format_exception(type(e), e, e.__traceback__)]",
    "    keep = []",
    "    for chunk in tb:",
    "        if 'File \"<' in chunk and fname not in chunk:",
    "            continue",
    "        if '_sq_run' in chunk or 'pyodide' in chunk:",
    "            continue",
    "        keep.append(chunk)",
    "    return {'type': type(e).__name__, 'msg': str(e), 'line': line, 'tb': ''.join(keep)[-3000:]}",
    "def _sq_run(code, setup, check, lang):",
    "    ns = {'__name__': '__main__', '__lang__': lang, '__source__': code}",
    "    buf = _SQBuf()",
    "    res = {'ok': True, 'out': '', 'error': None, 'check': None}",
    "    old = sys.stdout, sys.stderr",
    "    sys.stdout = sys.stderr = buf",
    "    try:",
    "        if setup:",
    "            exec(compile(setup, '<setup>', 'exec'), ns)",
    "        try:",
    "            exec(compile(code, '<kod>', 'exec'), ns)",
    "        except BaseException as e:",
    "            res['ok'] = False",
    "            res['error'] = _sq_err(e, '<kod>')",
    "    finally:",
    "        sys.stdout, sys.stderr = old",
    "    res['out'] = buf.getvalue()",
    "    if check and res['ok']:",
    "        ns['__output__'] = res['out']",
    "        ns['_t'] = (lambda tr, en: tr if lang == 'tr' else en)",
    "        cbuf = _SQBuf()",
    "        sys.stdout = sys.stderr = cbuf",
    "        try:",
    "            exec(compile(check, '<check>', 'exec'), ns)",
    "            res['check'] = {'passed': True}",
    "        except AssertionError as e:",
    "            res['check'] = {'passed': False, 'msg': str(e), 'type': 'AssertionError'}",
    "        except BaseException as e:",
    "            res['check'] = {'passed': False, 'msg': type(e).__name__ + ': ' + str(e), 'type': type(e).__name__}",
    "        finally:",
    "            sys.stdout, sys.stderr = old",
    "    return json.dumps(res)"
  ].join("\n");

  /* Source of the worker (and of the main-thread fallback). Kept as a function so it is plain JS. */
  function engineSource() {
    var py = null;
    async function init(base, prelude) {
      if (typeof loadPyodide === "undefined") {
        if (typeof importScripts === "function") importScripts(base + "pyodide.js");
      }
      py = await loadPyodide({ indexURL: base });
      py.runPython(prelude);
      return py.version;
    }
    async function run(msg) {
      if (msg.packages && msg.packages.length) { await py.loadPackage(msg.packages); }
      var fn = py.globals.get("_sq_run");
      var out = fn(msg.code, msg.setup || "", msg.check || "", msg.lang || "tr");
      fn.destroy();
      return JSON.parse(out);
    }
    return { init: init, run: run };
  }

  var WORKER_SRC =
    "var engine = (" + engineSource.toString() + ")();\n" +
    "self.onmessage = async function (e) {\n" +
    "  var m = e.data;\n" +
    "  if (m.type === 'init') {\n" +
    "    try { var v = await engine.init(m.base, m.prelude); self.postMessage({ type: 'ready', version: v }); }\n" +
    "    catch (err) { self.postMessage({ type: 'init-error', error: String(err && err.message || err) }); }\n" +
    "  } else if (m.type === 'run') {\n" +
    "    try { var r = await engine.run(m); self.postMessage({ type: 'result', id: m.id, result: r }); }\n" +
    "    catch (err) { self.postMessage({ type: 'result', id: m.id, result: { ok: false, out: '', error: { type: 'InternalError', msg: String(err && err.message || err) } } }); }\n" +
    "  }\n" +
    "};\n";

  var state = "idle";          // idle | loading | ready | error
  var listeners = [];
  var worker = null;
  var mainEngine = null;       // fallback when Workers are unavailable
  var readyPromise = null;
  var pending = {};
  var seq = 0;
  var lastError = "";
  var version = "";
  var mode = "";               // "worker" | "main-thread"

  function setState(s, err) {
    state = s;
    if (err) lastError = err;
    listeners.forEach(function (fn) { try { fn(state, lastError); } catch (e) { console.error(e); } });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement("script");
      el.src = src; el.async = true;
      el.onload = resolve;
      el.onerror = function () { reject(new Error("Could not load " + src)); };
      document.head.appendChild(el);
    });
  }

  function startWorker(base) {
    return new Promise(function (resolve, reject) {
      var w;
      try {
        var blobUrl = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
        w = new Worker(blobUrl);
      } catch (e) { reject(e); return; }
      var timer = setTimeout(function () { reject(new Error("Pyodide load timeout")); try { w.terminate(); } catch (e) { /* */ } }, LOAD_TIMEOUT_MS);
      w.onmessage = function (e) {
        var m = e.data;
        if (m.type === "ready") { clearTimeout(timer); version = m.version; worker = w; mode = "worker"; resolve(); }
        else if (m.type === "init-error") { clearTimeout(timer); try { w.terminate(); } catch (er) { /* */ } reject(new Error(m.error)); }
        else if (m.type === "result" && pending[m.id]) { var p = pending[m.id]; delete pending[m.id]; clearTimeout(p.timer); p.resolve(m.result); }
      };
      w.onerror = function (e) { clearTimeout(timer); e.preventDefault && e.preventDefault(); reject(new Error(e.message || "Worker error")); };
      w.postMessage({ type: "init", base: base, prelude: PRELUDE });
    });
  }

  function startMainThread(base) {
    return loadScript(base + "pyodide.js").then(function () {
      mainEngine = engineSource();
      return mainEngine.init(base, PRELUDE).then(function (v) { version = v; mode = "main-thread"; });
    });
  }

  function ensure() {
    if (readyPromise) return readyPromise;
    var base = resolveBase();
    setState("loading");
    readyPromise = startWorker(base).catch(function (err) {
      console.warn("[SecureQA] Worker runtime failed, trying main thread:", err && err.message);
      return startMainThread(base);
    }).then(function () {
      setState("ready");
    }, function (err) {
      readyPromise = null;
      setState("error", String(err && err.message || err));
      throw err;
    });
    return readyPromise;
  }

  function restartWorker() {
    try { if (worker) worker.terminate(); } catch (e) { /* */ }
    worker = null;
    readyPromise = null;
    Object.keys(pending).forEach(function (id) { delete pending[id]; });
    ensure().catch(function () { /* state already set */ });
  }

  /**
   * Run Python code. opts: {setup, check, lang, packages}. Resolves to
   * {ok, out, error:{type,msg,line,tb}|null, check:{passed,msg}|null, timeout?}
   */
  function run(code, opts) {
    opts = opts || {};
    return ensure().then(function () {
      var msg = { type: "run", code: code, setup: opts.setup || "", check: opts.check || "", lang: opts.lang || "tr", packages: opts.packages || [] };
      if (mainEngine) {
        return mainEngine.run(msg).catch(function (err) {
          return { ok: false, out: "", error: { type: "InternalError", msg: String(err && err.message || err) } };
        });
      }
      return new Promise(function (resolve) {
        var id = ++seq;
        msg.id = id;
        var timer = setTimeout(function () {
          delete pending[id];
          resolve({ ok: false, out: "", timeout: true, error: { type: "TimeoutError", msg: "timeout" } });
          restartWorker();
        }, RUN_TIMEOUT_MS + (msg.packages.length ? 30000 : 0));
        pending[id] = { resolve: resolve, timer: timer };
        worker.postMessage(msg);
      });
    });
  }

  SQ.runtime = {
    version: PYODIDE_VERSION,
    ensure: ensure,
    run: run,
    getState: function () { return state; },
    getError: function () { return lastError; },
    getLoadedVersion: function () { return version; },
    getMode: function () { return mode; },
    onChange: function (fn) { listeners.push(fn); },
    retry: function () { readyPromise = null; return ensure(); }
  };
})();
