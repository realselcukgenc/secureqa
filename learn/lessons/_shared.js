/*
 * Hidden Python "setup" code shared by several lessons.
 * Real Playwright / requests / pytest cannot run inside the browser (Pyodide), so these small
 * simulations imitate their APIs well enough for learning. They are injected as fake modules
 * (sys.modules["playwright.sync_api"], ["requests"], ["pytest"]) so the cells look like real code.
 *
 * The simulated target is "MiniShop (simülasyon)" — a teaching stand-in, NOT a project target.
 * In the real project, defensive checks run against SecureShop (demo_app/, built securely) and
 * security findings come from OWASP Juice Shop (tests/juiceshop/, secureqa/juiceshop.py).
 * MiniShop's default mode is deliberately vulnerable (to show what a finding looks like);
 * secure=True turns on the same defenses SecureShop has.
 */
(function () {
  "use strict";
  var SQ = (window.SQ = window.SQ || {});
  SQ.shared = SQ.shared || {};

  /* ---------------------------------------------------------------- FakeWeb: MiniShop (simulation) */
  SQ.shared.fakeWeb = String.raw`
import sys as _sys, types as _types, html as _html, json as _json
from urllib.parse import urlparse as _urlparse, parse_qs as _parse_qs

_USERS = {"admin": ("admin123", "admin"), "selcuk": ("Selcuk!2026", "user"), "ayse": ("ayse2026", "user")}
_PRODUCTS = ["Türk Kahvesi", "Antep Fıstığı", "Lokum", "Çay Bardağı Seti", "Kilim Yastık"]


class FakeLocator:
    """Imitates playwright.sync_api.Locator (only the parts we use in lessons)."""

    def __init__(self, page, selector):
        self.page = page
        self.selector = selector

    @property
    def first(self):
        return self

    def fill(self, value):
        self.page.log.append(("fill", self.selector, value))
        self.page.values[self.selector] = value

    def press(self, key):
        self.page.log.append(("press", self.selector, key))
        if key == "Enter" and self.selector == "input[name='q']":
            self.page.goto(self.page._origin() + "/products?q=" + self.page.values.get(self.selector, ""))

    def click(self):
        self.page.log.append(("click", self.selector))
        self.page._click(self.selector)

    def inner_text(self):
        return self.page.texts.get(self.selector, "")

    text_content = inner_text

    def all_inner_texts(self):
        value = self.page.texts.get(self.selector)
        return value if isinstance(value, list) else ([value] if value else [])

    def input_value(self):
        return self.page.values.get(self.selector, "")

    def count(self):
        value = self.page.texts.get(self.selector)
        if isinstance(value, list):
            return len(value)
        return 1 if (self.selector in self.page.texts or self.selector in self.page.inputs) else 0

    def is_visible(self):
        return self.count() > 0

    def __repr__(self):
        return f"<FakeLocator selector={self.selector!r}>"


class _NoopContext:
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakePage:
    """Imitates playwright.sync_api.Page on top of "MiniShop", a tiny simulated shop.

    MiniShop is only a teaching simulation (not SecureShop, not Juice Shop).
    FakePage(secure=False) behaves like a VULNERABLE app (reflects input raw, SQLi bypass,
    user enumeration) - the kind of bugs the real project finds in OWASP Juice Shop.
    FakePage(secure=True) behaves like a defended app, the way SecureShop is built.
    Every action is recorded in page.log so you can see what your code did.
    """

    def __init__(self, secure=False):
        self.secure = secure
        self.url = "about:blank"
        self.log = []
        self.values = {}
        self.texts = {}
        self.inputs = set()
        self.user = None
        self.dialogs = []
        self._title = ""
        self._html = ""
        self._handlers = {}

    # ---- navigation -------------------------------------------------------
    def _origin(self):
        p = _urlparse(self.url)
        return f"{p.scheme}://{p.netloc}" if p.netloc else "http://127.0.0.1:5000"

    def goto(self, url, **kwargs):
        self.log.append(("goto", url))
        self.url = url
        self.values = {}
        parsed = _urlparse(url)
        self._render(parsed.path or "/", _parse_qs(parsed.query))
        return None

    def _render(self, path, query):
        self.texts, self.inputs = {}, set()
        if self.user:
            self.texts["a[href='/logout']"] = "Çıkış"
        if path == "/login":
            self._title = "Giriş · MiniShop"
            self.inputs = {"#username", "#password"}
            self.texts["#login-btn"] = "Giriş yap"
            body = '<form id="login-form"><input id="username"><input id="password" type="password"><button id="login-btn">Giriş yap</button></form>'
        elif path == "/products":
            q = query.get("q", [""])[0]
            self._title = "Ürünler · MiniShop"
            shown = _html.escape(q) if self.secure else q
            self.inputs = {"input[name='q']"}
            self.texts["#search-term"] = q
            hits = [p for p in _PRODUCTS if q.lower() in p.lower()] if q else list(_PRODUCTS)
            self.texts["[data-testid='product-card'] [data-testid='product-name']"] = hits
            self.texts["[data-testid='product-card']"] = hits
            body = f'<h1>Ürünler</h1><p>Sonuçlar: <span id="search-term">{shown}</span></p>'
            if not self.secure and "<script>alert(" in q and "dialog" in self._handlers:
                msg = q.split("alert(", 1)[1].split(")", 1)[0].strip("'\"")
                self._handlers["dialog"](FakeDialog(msg, self))
        elif path == "/account" and self.user:
            self._title = "Hesabım · MiniShop"
            self.texts["#account-username"] = self.user
            self.texts["#account-email"] = f"{self.user}@minishop.test"
            body = f'<h1 id="account-username">{self.user}</h1>'
        elif path == "/logout":
            self.user = None
            self.texts.pop("a[href='/logout']", None)
            self._title = "MiniShop"
            body = "<h1>MiniShop</h1>"
        else:
            self._title = "MiniShop"
            body = "<h1>MiniShop</h1>"
        self._html = f"<html><head><title>{self._title}</title></head><body>{body}</body></html>"

    def _click(self, selector):
        if selector == "#login-btn" and _urlparse(self.url).path == "/login":
            username = self.values.get("#username", "")
            password = self.values.get("#password", "")
            record = _USERS.get(username)
            ok = record is not None and record[0] == password
            looks_like_sqli = "'" in username and ("--" in username or " or " in username.lower())
            if not self.secure and looks_like_sqli:
                ok, username = True, "admin"   # simulated SQL injection auth bypass
            if ok:
                self.user = username
                self.goto(self._origin() + "/account")
            elif self.secure or record is not None:
                self.texts["#login-error"] = "Parola hatalı" if not self.secure else "Kullanıcı adı veya parola hatalı"
            else:
                self.texts["#login-error"] = "Kullanıcı bulunamadı"   # user enumeration!

    # ---- Playwright-like API ----------------------------------------------
    def locator(self, selector):
        return FakeLocator(self, selector)

    def get_by_test_id(self, test_id):
        return FakeLocator(self, f"[data-testid='{test_id}']")

    def fill(self, selector, value):
        self.locator(selector).fill(value)

    def click(self, selector):
        self.locator(selector).click()

    def title(self):
        return self._title

    def content(self):
        return self._html

    def expect_navigation(self, **kwargs):
        return _NoopContext()

    def on(self, event, handler):
        self._handlers[event] = handler

    def screenshot(self, path=None, **kwargs):
        self.log.append(("screenshot", path))
        return b""

    def evaluate(self, expression):
        return None

    def add_init_script(self, script):
        self.log.append(("init_script", script[:40]))

    def close(self):
        self.log.append(("close",))


class FakeDialog:
    def __init__(self, message, page):
        self.message = message
        self.type = "alert"
        page.dialogs.append(message)

    def dismiss(self):
        pass

    def accept(self):
        pass


class _FakeBrowser:
    def __init__(self, **options):
        self.options = options

    def new_context(self, **kwargs):
        return self

    def new_page(self):
        return FakePage()

    def set_default_timeout(self, ms):
        pass

    def close(self):
        pass


class _FakeBrowserType:
    def __init__(self, name):
        self.name = name

    def launch(self, **options):
        print(f"[sim] {self.name}.launch({', '.join(f'{k}={v!r}' for k, v in options.items())})")
        return _FakeBrowser(**options)


class _FakePlaywright:
    chromium = _FakeBrowserType("chromium")
    firefox = _FakeBrowserType("firefox")
    webkit = _FakeBrowserType("webkit")

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def sync_playwright():
    return _FakePlaywright()


class _Expect:
    def __init__(self, target):
        self.target = target

    def to_have_text(self, expected):
        actual = self.target.inner_text()
        assert actual == expected, f"expected text {expected!r}, got {actual!r}"

    def to_contain_text(self, expected):
        actual = self.target.inner_text()
        assert expected in actual, f"expected {actual!r} to contain {expected!r}"

    def to_be_visible(self):
        assert self.target.is_visible(), f"{self.target!r} is not visible"

    def to_have_url(self, expected):
        assert self.target.url == expected, f"expected URL {expected!r}, got {self.target.url!r}"

    def to_have_title(self, expected):
        assert self.target.title() == expected, f"expected title {expected!r}, got {self.target.title()!r}"

    def to_have_count(self, n):
        assert self.target.count() == n, f"expected {n} elements, got {self.target.count()}"


def expect(target):
    return _Expect(target)


_pw = _types.ModuleType("playwright")
_pw_sync = _types.ModuleType("playwright.sync_api")
for _name, _obj in {"sync_playwright": sync_playwright, "expect": expect, "Page": FakePage,
                    "Locator": FakeLocator, "Response": object, "Browser": _FakeBrowser}.items():
    setattr(_pw_sync, _name, _obj)
_pw.sync_api = _pw_sync
_sys.modules["playwright"] = _pw
_sys.modules["playwright.sync_api"] = _pw_sync
`;

  /* ---------------------------------------------------------------- FakeHTTP: requests imitation */
  SQ.shared.fakeHttp = String.raw`
import sys as _sys, types as _types, json as _json, html as _html
from urllib.parse import urlparse as _urlparse, parse_qs as _parse_qs, urlencode as _urlencode


class CaseInsensitiveDict(dict):
    """Header dict where 'content-type' and 'Content-Type' are the same key (like requests)."""

    def __init__(self, data=None):
        super().__init__()
        self._keys = {}
        for k, v in (data or {}).items():
            self[k] = v

    def __setitem__(self, key, value):
        old = self._keys.get(key.lower())
        if old is not None and old != key:
            super().__delitem__(old)
        self._keys[key.lower()] = key
        super().__setitem__(key, value)

    def __getitem__(self, key):
        return super().__getitem__(self._keys.get(key.lower(), key))

    def __contains__(self, key):
        return isinstance(key, str) and key.lower() in self._keys

    def get(self, key, default=None):
        return self[key] if key in self else default


class HTTPError(Exception):
    def __init__(self, message, response=None):
        super().__init__(message)
        self.response = response


class FakeResponse:
    def __init__(self, url, status_code=200, headers=None, text="", history=None):
        self.url = url
        self.status_code = status_code
        self.headers = CaseInsensitiveDict(headers or {})
        self.text = text
        self.history = history or []

    @property
    def ok(self):
        return self.status_code < 400

    def json(self):
        return _json.loads(self.text)

    def raise_for_status(self):
        if self.status_code >= 400:
            raise HTTPError(f"{self.status_code} Error for url: {self.url}", response=self)

    def __repr__(self):
        return f"<Response [{self.status_code}]>"


_DB_USERS = {
    1: {"id": 1, "username": "admin", "email": "admin@minishop.test", "role": "admin", "password_hash": "5f4dcc3b5aa765d61d8327deb882cf99"},
    2: {"id": 2, "username": "selcuk", "email": "selcuk@minishop.test", "role": "user", "password_hash": "e10adc3949ba59abbe56e057f20f883e"},
    3: {"id": 3, "username": "ayse", "email": "ayse@minishop.test", "role": "user", "password_hash": "25d55ad283aa400af464c76d713c07ad"},
}
_ORDERS = {101: {"id": 101, "user_id": 2, "total": 249.90}, 102: {"id": 102, "user_id": 3, "total": 89.50}}
_PASSWORDS = {"admin": "admin123", "selcuk": "Selcuk!2026", "ayse": "ayse2026"}


class FakeServer:
    """A tiny simulated HTTP server: "MiniShop (simülasyon)".

    Default = deliberately vulnerable (like the bugs found in Juice Shop);
    secure=True = defended (like SecureShop). Teaching simulation only.
    """

    def __init__(self, secure=False):
        self.secure = secure

    def base_headers(self, content_type="text/html; charset=utf-8"):
        h = {"Content-Type": content_type}
        if self.secure:
            h.update({"Content-Security-Policy": "default-src 'self'", "X-Frame-Options": "DENY",
                      "X-Content-Type-Options": "nosniff", "Server": "MiniShop"})
        else:
            h["Server"] = "MiniShop/0.9 Werkzeug/3.1.3"
        return h

    def handle(self, method, url, params=None, data=None, json_body=None, cookies=None):
        p = _urlparse(url)
        q = {k: v[0] for k, v in _parse_qs(p.query).items()}
        q.update(params or {})
        path = p.path or "/"
        cookies = cookies or {}
        if path.startswith("/api/users/"):
            uid = int(path.rsplit("/", 1)[1])
            if self.secure and cookies.get("session") is None:
                return 401, self.base_headers("application/json"), _json.dumps({"error": "login required"})
            user = _DB_USERS.get(uid)
            if user is None:
                return 404, self.base_headers("application/json"), _json.dumps({"error": "not found"})
            body = dict(user)
            if self.secure:
                body.pop("password_hash")
            return 200, self.base_headers("application/json"), _json.dumps(body)
        if path.startswith("/orders/"):
            oid = int(path.rsplit("/", 1)[1])
            order = _ORDERS.get(oid)
            if "session" not in cookies:
                return 302, dict(self.base_headers(), Location="/login"), ""
            if order is None:
                return 404, self.base_headers(), "Not found"
            if self.secure and order["user_id"] != cookies.get("user_id"):
                return 403, self.base_headers(), "Forbidden"
            return 200, self.base_headers(), f"<h1>Sipariş #{oid}</h1><p>Toplam: {order['total']} TL</p>"
        if path in ("/products", "/api/products"):
            term = q.get("q", "")
            if "'" in term and not self.secure:
                return 500, self.base_headers(), "Traceback ... sqlite3.OperationalError: unrecognized token: \"'\""
            if path == "/api/products":
                return 200, self.base_headers("application/json"), _json.dumps([{"id": 1, "name": "Türk Kahvesi", "price": 129.9}])
            shown = _html.escape(term) if self.secure else term
            return 200, self.base_headers(), f'<p>Sonuçlar: <span id="search-term">{shown}</span></p>'
        if path == "/login" and method == "POST":
            form = data or {}
            if _PASSWORDS.get(form.get("username")) == form.get("password"):
                uid = [u["id"] for u in _DB_USERS.values() if u["username"] == form.get("username")][0]
                h = dict(self.base_headers(), Location="/account")
                flags = "; HttpOnly; SameSite=Lax" if self.secure else ""
                h["Set-Cookie"] = f"session=abc123{flags}"
                return 302, h, "", {"session": "abc123", "user_id": uid}
            return 200, self.base_headers(), '<div id="login-error">Hatalı giriş</div>'
        if path == "/redirect":
            target = q.get("next", "/")
            if self.secure and not target.startswith("/") or target.startswith("//"):
                target = "/" if self.secure else target
            return 302, dict(self.base_headers(), Location=target), ""
        return 200, self.base_headers(), "<h1>MiniShop</h1>"


SERVER = FakeServer()


class Session:
    """Imitates requests.Session against the simulated server (no real network)."""

    def __init__(self, server=None):
        self.server = server or SERVER
        self.cookies = {}
        self.headers = {}

    def request(self, method, url, params=None, data=None, json=None, timeout=None, allow_redirects=True, headers=None):
        if timeout is None:
            print("[sim] Uyarı/Warning: timeout= verilmedi / no timeout given")
        if params:
            url = url + ("&" if "?" in url else "?") + _urlencode(params)
        result = self.server.handle(method, url, None, data, json, self.cookies)
        status, hdrs, text = result[0], result[1], result[2]
        if len(result) > 3:
            self.cookies.update(result[3])
        response = FakeResponse(url, status, hdrs, text)
        if allow_redirects and status in (301, 302) and "Location" in response.headers:
            location = response.headers["Location"]
            if location.startswith("/") and not location.startswith("//"):
                origin = "{0.scheme}://{0.netloc}".format(_urlparse(url))
                final = self.request("GET", origin + location, timeout=timeout)
            else:
                final = FakeResponse(location, 200, {"Content-Type": "text/html"}, "<h1>external site</h1>")
            final.history = [response] + final.history
            return final
        return response

    def get(self, url, **kwargs):
        return self.request("GET", url, **kwargs)

    def post(self, url, **kwargs):
        return self.request("POST", url, **kwargs)

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def get(url, **kwargs):
    return Session().get(url, **kwargs)


def post(url, **kwargs):
    return Session().post(url, **kwargs)


class RequestException(Exception):
    pass


_req = _types.ModuleType("requests")
for _name, _obj in {"Session": Session, "get": get, "post": post, "Response": FakeResponse,
                    "HTTPError": HTTPError, "RequestException": RequestException}.items():
    setattr(_req, _name, _obj)
_req.exceptions = _types.SimpleNamespace(HTTPError=HTTPError, RequestException=RequestException)
_sys.modules["requests"] = _req
`;

  /* ---------------------------------------------------------------- mini pytest */
  SQ.shared.miniPytest = String.raw`
import sys as _sys, types as _types, inspect as _inspect, re as _re

_FIXTURES = {}


def _fixture(fn=None, *, scope="function", autouse=False, name=None):
    def register(f):
        f._fixture_scope = scope
        _FIXTURES[name or f.__name__] = f
        return f
    return register(fn) if fn is not None else register


class _MarkDecorator:
    def __init__(self, name, args=(), kwargs=None):
        self.name, self.args, self.kwargs = name, args, kwargs or {}

    def __call__(self, *args, **kwargs):
        if len(args) == 1 and callable(args[0]) and not kwargs:
            fn = args[0]
            fn.__dict__.setdefault("_marks", []).append(self)
            return fn
        return _MarkDecorator(self.name, args, kwargs)


class _MarkGenerator:
    def __getattr__(self, name):
        if name.startswith("__"):
            raise AttributeError(name)
        return _MarkDecorator(name)


class _Raises:
    def __init__(self, exc, match=None):
        self.expected, self.match, self.value = exc, match, None

    def __enter__(self):
        return self

    def __exit__(self, et, ev, tb):
        if et is None:
            raise AssertionError(f"DID NOT RAISE {self.expected.__name__}")
        if not issubclass(et, self.expected):
            return False
        if self.match and not _re.search(self.match, str(ev)):
            raise AssertionError(f"Regex {self.match!r} does not match {str(ev)!r}")
        self.value = ev
        return True


def _raises(exc, match=None):
    return _Raises(exc, match)


class _Skip(Exception):
    pass


def _skip(reason=""):
    raise _Skip(reason)


pytest = _types.ModuleType("pytest")
pytest.fixture = _fixture
pytest.mark = _MarkGenerator()
pytest.raises = _raises
pytest.skip = _skip
pytest.__doc__ = "mini pytest simulation for SecureQA Learn"
_sys.modules["pytest"] = pytest


def _marks(fn):
    return getattr(fn, "_marks", [])


def _expand(fn):
    """Yield (id, kwargs) pairs for every parametrize combination."""
    cases = [("", {})]
    for mark in reversed([m for m in _marks(fn) if m.name == "parametrize"]):
        names, values = mark.args[0], mark.args[1]
        names = [n.strip() for n in names.split(",")] if isinstance(names, str) else list(names)
        new = []
        for case_id, kw in cases:
            for value in values:
                vals = value if len(names) > 1 else (value,)
                params = dict(kw)
                params.update(dict(zip(names, vals)))
                vid = "-".join(str(v) for v in vals)
                new.append((case_id + ("-" if case_id else "") + vid, params))
        cases = new
    return cases


def _resolve(name, active, teardowns, cache):
    if name in cache:
        return cache[name]
    if name not in _FIXTURES:
        raise LookupError(f"fixture '{name}' not found")
    fx = _FIXTURES[name]
    kwargs = {p: _resolve(p, active, teardowns, cache) for p in _inspect.signature(fx).parameters}
    value = fx(**kwargs)
    if _inspect.isgenerator(value):
        gen = value
        value = next(gen)
        teardowns.append(gen)
    cache[name] = value
    return value


def run_tests(marker=None, keyword=None, verbose=True):
    """Collect test_* functions defined in this cell and run them like pytest -v.

    marker="security" behaves like:  pytest -m security
    keyword="login"   behaves like:  pytest -k login
    """
    ns = globals()
    source_lines = ns.get("__source__", "").splitlines()
    tests = [(n, f) for n, f in list(ns.items()) if n.startswith("test_") and callable(f)]
    passed = failed = skipped = deselected = 0
    print("=" * 18 + " test session starts (mini-pytest) " + "=" * 18)
    for name, fn in tests:
        mark_names = [m.name for m in _marks(fn)]
        if marker and marker not in mark_names:
            deselected += 1
            continue
        if keyword and keyword not in name:
            deselected += 1
            continue
        for case_id, params in _expand(fn):
            label = name + (f"[{case_id}]" if case_id else "")
            teardowns, cache = [], {}
            try:
                for p in _inspect.signature(fn).parameters:
                    if p not in params:
                        params[p] = _resolve(p, None, teardowns, cache)
                fn(**params)
                outcome = "PASSED"
                passed += 1
            except _Skip as e:
                outcome, detail = "SKIPPED", str(e)
                skipped += 1
            except AssertionError as e:
                outcome = "FAILED"
                failed += 1
                tb = e.__traceback__
                line = None
                while tb is not None:
                    if tb.tb_frame.f_code.co_filename == "<kod>":
                        line = tb.tb_lineno
                    tb = tb.tb_next
                detail = str(e)
                if line and 0 < line <= len(source_lines):
                    detail = f"line {line}: {source_lines[line - 1].strip()}" + (f"  ->  {e}" if str(e) else "")
            except Exception as e:
                outcome, detail = "ERROR", f"{type(e).__name__}: {e}"
                failed += 1
            finally:
                for gen in reversed(teardowns):
                    try:
                        next(gen)
                    except StopIteration:
                        pass
            if verbose:
                print(f"{label} {outcome}")
                if outcome in ("FAILED", "ERROR", "SKIPPED") and detail:
                    print(f"    {detail}")
    parts = [f"{passed} passed"] + ([f"{failed} failed"] if failed else []) + \
            ([f"{skipped} skipped"] if skipped else []) + ([f"{deselected} deselected"] if deselected else [])
    print("=" * 26 + " " + ", ".join(parts) + " " + "=" * 26)
    return {"passed": passed, "failed": failed, "skipped": skipped, "deselected": deselected}
`;

  /* ---------------------------------------------------------------- MiniDB: a fake SQL engine */
  SQ.shared.miniDb = String.raw`
import re as _re


class MiniDBError(Exception):
    """Raised like sqlite3.OperationalError when the SQL text is broken."""


class MiniDB:
    """A VERY small fake SQL engine, for teaching SQL injection safely in the browser.

    Supports:  SELECT * FROM <table> [WHERE cond]   with  =, !=, AND, OR, ( ), -- comments
    and ? placeholders whose values are NEVER parsed as SQL (that is parameterization).
    """

    _TOKEN = _re.compile(r"\s*(?:(--.*)|('(?:[^']|'')*')|(')|(\?)|(\d+)|([A-Za-z_]\w*|\*)|(!=|=|\(|\)|,|;))")

    def __init__(self):
        self.tables = {
            "users": [
                {"id": 1, "username": "admin", "password": "admin123", "role": "admin"},
                {"id": 2, "username": "selcuk", "password": "Selcuk!2026", "role": "user"},
                {"id": 3, "username": "ayse", "password": "ayse2026", "role": "user"},
            ]
        }
        self.log = []

    def _tokenize(self, sql, params):
        tokens, pos, params = [], 0, list(params)
        while pos < len(sql):
            if sql[pos:].strip() == "":
                break
            m = self._TOKEN.match(sql, pos)
            if not m:
                raise MiniDBError(f'near "{sql[pos:pos + 10]}": syntax error')
            pos = m.end()
            comment, string, lone_quote, param, number, word, op = m.groups()
            if comment is not None:
                continue                      # everything after -- is ignored!
            if lone_quote is not None:
                raise MiniDBError('unrecognized token: "\'"')
            if string is not None:
                tokens.append(("val", string[1:-1].replace("''", "'")))
            elif param is not None:
                if not params:
                    raise MiniDBError("not enough parameters for ? placeholders")
                tokens.append(("val", params.pop(0)))     # bound value: never parsed
            elif number is not None:
                tokens.append(("val", int(number)))
            elif word is not None:
                kw = word.upper()
                tokens.append(("kw", kw) if kw in ("SELECT", "FROM", "WHERE", "AND", "OR", "NOT") else ("id", word))
            else:
                tokens.append(("op", op))
        return tokens

    def execute(self, sql, params=()):
        """Run a query and return the matching rows (a list of dicts)."""
        self.log.append(sql if not params else f"{sql}   params={tuple(params)!r}")
        toks = self._tokenize(sql, params)
        self._toks, self._i = toks, 0
        self._expect("kw", "SELECT")
        while not self._peek("kw", "FROM"):
            if self._i >= len(toks):
                raise MiniDBError("incomplete input")
            self._i += 1
        self._expect("kw", "FROM")
        table = self._next()
        if table[0] != "id" or table[1] not in self.tables:
            raise MiniDBError(f"no such table: {table[1]}")
        cond = None
        if self._peek("kw", "WHERE"):
            self._i += 1
            cond = self._or()
        if self._peek("op", ";"):
            self._i += 1
        if self._i != len(toks):
            raise MiniDBError(f'near "{toks[self._i][1]}": syntax error')
        rows = self.tables[table[1]]
        return [dict(r) for r in rows if cond is None or cond(r)]

    # --- tiny recursive-descent parser -----------------------------------------
    def _peek(self, kind, value=None):
        if self._i < len(self._toks):
            k, v = self._toks[self._i]
            return k == kind and (value is None or v == value)
        return False

    def _next(self):
        if self._i >= len(self._toks):
            raise MiniDBError("incomplete input")
        tok = self._toks[self._i]
        self._i += 1
        return tok

    def _expect(self, kind, value):
        tok = self._next()
        if tok != (kind, value):
            raise MiniDBError(f'near "{tok[1]}": syntax error')

    def _or(self):
        left = self._and()
        while self._peek("kw", "OR"):
            self._i += 1
            right = self._and()
            left = (lambda a, b: lambda r: a(r) or b(r))(left, right)
        return left

    def _and(self):
        left = self._cmp()
        while self._peek("kw", "AND"):
            self._i += 1
            right = self._cmp()
            left = (lambda a, b: lambda r: a(r) and b(r))(left, right)
        return left

    def _cmp(self):
        if self._peek("op", "("):
            self._i += 1
            inner = self._or()
            self._expect("op", ")")
            return inner
        a = self._term()
        op = self._next()
        if op not in (("op", "="), ("op", "!=")):
            raise MiniDBError(f'near "{op[1]}": syntax error')
        b = self._term()
        if op[1] == "=":
            return lambda r: str(a(r)) == str(b(r))
        return lambda r: str(a(r)) != str(b(r))

    def _term(self):
        kind, value = self._next()
        if kind == "val":
            return lambda r: value
        if kind == "id":
            return lambda r: r.get(value)
        raise MiniDBError(f'near "{value}": syntax error')


db = MiniDB()
`;

  /* ---------------------------------------------------------------- module maker (lesson 7) */
  SQ.shared.moduleMaker = String.raw`
import sys as _sys, os as _os, importlib as _importlib
_WORK = "/tmp/sqlearn_modules"
_os.makedirs(_WORK, exist_ok=True)
if _WORK not in _sys.path:
    _sys.path.insert(0, _WORK)


def make_module(relative_path, code):
    """Write a .py file (e.g. "secureqa_demo/config.py") into a temp folder on sys.path."""
    full = _os.path.join(_WORK, relative_path)
    _os.makedirs(_os.path.dirname(full) or _WORK, exist_ok=True)
    with open(full, "w", encoding="utf-8") as fh:
        fh.write(code)
    # forget previously imported versions so the new code is used
    top = relative_path.split("/")[0].replace(".py", "")
    for name in list(_sys.modules):
        if name == top or name.startswith(top + "."):
            del _sys.modules[name]
    _importlib.invalidate_caches()
    return full
`;
})();
