/* Cheat sheet: Python for test automation — bilingual quick reference. */
SQ.setCheatsheet({
  title: { tr: "Kopya kâğıdı: test otomasyonu için Python", en: "Cheat sheet: Python for test automation" },
  summary: {
    tr: "Derslerdeki en önemli kalıplar tek sayfada. Kopyala butonuyla kod parçalarını al.",
    en: "The most important patterns from the lessons on one page. Grab snippets with the copy button."
  },
  sections: [
    { title: { tr: "Temeller", en: "Basics" }, items: [
      { title: { tr: "Değişkenler ve tipler", en: "Variables & types" }, code: String.raw`
base_url = "http://127.0.0.1:5000"   # str
timeout_ms = 10_000                   # int
price = 129.9                         # float
headless = True                       # bool
error = None                          # None -> "if error is None:"
type(price)                           # <class 'float'>`,
        note: { tr: "Sabitler BÜYÜK_HARF, değişkenler snake_case.", en: "Constants UPPER_CASE, variables snake_case." } },
      { title: { tr: "Tip dönüşümü", en: "Type conversion" }, code: String.raw`
int("42")        # 42
float("2.5")     # 2.5
str(404)         # "404"
bool("")         # False  (boş = False)
bool("False")    # True!  -> value.lower() == "true" kullan`,
        note: { tr: "Ortam değişkenleri ve form verileri hep <code>str</code> gelir.", en: "Environment variables and form data always arrive as <code>str</code>." } },
      { title: { tr: "Operatörler", en: "Operators" }, code: String.raw`
7 / 2, 7 // 2, 7 % 2, 2 ** 10     # 3.5 3 1 1024
x += 1                            # x = x + 1
a, b = b, a                       # swap
200 <= status < 300               # zincir karşılaştırma / chained`,
        note: null }
    ] },
    { title: { tr: "String'ler", en: "Strings" }, items: [
      { title: { tr: "Dilimleme ve metotlar", en: "Slicing & methods" }, code: String.raw`
s = "SecureQA"
s[0], s[-1], s[:6], s[6:]           # 'S' 'A' 'Secure' 'QA'
"  hata \n".strip()                 # 'hata'
"Content-Type".lower()
"a,b,c".split(",")                  # ['a', 'b', 'c']
"/".join(["tests", "security"])     # 'tests/security'
url.rstrip("/") + "/login"
"script" in html                    # True / False`,
        note: { tr: "String'ler değiştirilemez: metotlar yeni string döndürür.", en: "Strings are immutable: methods return a new string." } },
      { title: { tr: "f-string", en: "f-strings" }, code: String.raw`
f"{base_url}/product/{pid}"
f"{price:.2f} TL"          # 129.90 TL
f"{value!r}"               # 'selcuk' (tırnaklı / with quotes)
f"{status=}"               # status=404
f"{'ID':<6}|{'OK':^6}|"    # hizalama / alignment`,
        note: null },
      { title: { tr: "URL ve HTML kodlama", en: "URL & HTML encoding" }, code: String.raw`
from urllib.parse import quote, urlencode
import html

quote("' OR '1'='1")             # %27%20OR%20%271%27%3D%271
urlencode({"q": "çay", "page": 2})
html.escape("<script>")          # &lt;script&gt;`,
        note: { tr: "Kullanıcı girdisini URL'ye <code>quote</code>, HTML'e <code>html.escape</code> ile koy.", en: "Put user input into URLs with <code>quote</code>, into HTML with <code>html.escape</code>." } }
    ] },
    { title: { tr: "Koleksiyonlar", en: "Collections" }, items: [
      { title: { tr: "list", en: "list" }, code: String.raw`
payloads = ["'", "<script>"]
payloads.append("admin' --")
payloads[0], payloads[-1], len(payloads)
"'" in payloads
payloads.sort(); payloads.remove("'")
[p for p in payloads if "'" in p]       # comprehension`,
        note: null },
      { title: { tr: "dict", en: "dict" }, code: String.raw`
user = {"id": 2, "username": "selcuk"}
user["username"]               # KeyError olabilir / may raise KeyError
user.get("role", "user")       # güvenli varsayılan / safe default
user["role"] = "admin"
user.pop("password_hash", None)
for key, value in user.items(): ...
{k: v for k, v in user.items() if k != "id"}`,
        note: { tr: "JSON nesneleri, header'lar, form verileri = dict.", en: "JSON objects, headers, form data = dict." } },
      { title: { tr: "tuple ve set", en: "tuple & set" }, code: String.raw`
SEVERITIES = ("critical", "high", "medium", "low", "info")
ok, evidence = True, "reflected"           # unpacking
expected = {"Content-Security-Policy", "X-Frame-Options"}
missing = expected - set(headers)          # küme farkı / set difference
unique_urls = set(visited)`,
        note: null }
    ] },
    { title: { tr: "Kontrol akışı", en: "Control flow" }, items: [
      { title: { tr: "if / elif / else", en: "if / elif / else" }, code: String.raw`
if status == 200:
    ...
elif status in (301, 302):
    ...
elif 400 <= status < 500:
    ...
else:
    ...
if not logged_in and role == "admin": ...`,
        note: { tr: "Falsy: <code>0, \"\", [], {}, None</code>.", en: "Falsy: <code>0, \"\", [], {}, None</code>." } },
      { title: { tr: "Döngüler", en: "Loops" }, code: String.raw`
for payload in payloads: ...
for i in range(3): ...                       # 0 1 2
for i, p in enumerate(payloads, start=1): ...
for name, value in headers.items(): ...
for code, label in zip(codes, labels): ...
any(s in body for s in SQL_ERROR_SIGNS)
all(h in headers for h in EXPECTED)`,
        note: null },
      { title: { tr: "Polling (bekle-tekrar dene)", en: "Polling (wait & retry)" }, code: String.raw`
for attempt in range(10):
    if server_is_ready():
        break
    time.sleep(0.5)
else:
    raise TimeoutError("server not ready")`,
        note: { tr: "Her zaman bir üst sınır koy.", en: "Always set an upper limit." } }
    ] },
    { title: { tr: "Fonksiyonlar", en: "Functions" }, items: [
      { title: { tr: "Tanım ve type hint'ler", en: "Definition & type hints" }, code: String.raw`
def url_for(base_url: str, path: str = "/") -> str:
    """Docstring: ne yaptığını anlat."""
    return base_url.rstrip("/") + "/" + path.lstrip("/")

def probe(url: str) -> tuple[bool, str]: ...
def find(name: str) -> str | None: ...
def click(selector: str) -> None: ...`,
        note: null },
      { title: { tr: "Argümanlar", en: "Arguments" }, code: String.raw`
launch("firefox", headless=False)          # konum + isim / positional + keyword
def log(*args, **kwargs): ...              # tuple + dict
def add(item, items: list | None = None):  # [] varsayılan YAPMA / don't default to []
    items = [] if items is None else items
sorted(findings, key=lambda f: f.severity)`,
        note: null }
    ] },
    { title: { tr: "Sınıflar ve POM", en: "Classes & POM" }, items: [
      { title: { tr: "Page Object", en: "Page Object" }, code: String.raw`
class BasePage:
    PATH = "/"
    def __init__(self, page, base_url: str) -> None:
        self.page = page
        self.base_url = base_url.rstrip("/")
    def open(self) -> None:
        self.page.goto(self.base_url + self.PATH)

class LoginPage(BasePage):
    PATH = "/login"
    @property
    def username_input(self):
        return self.page.locator("#username")
    def login(self, user: str, pw: str) -> None:
        self.open()
        self.username_input.fill(user)
        self.page.locator("#password").fill(pw)
        self.page.locator("#login-btn").click()`,
        note: { tr: "Locator'lar ve aksiyonlar sayfa sınıfında; testler sadece okunur cümleler.", en: "Locators and actions live in the page class; tests are readable sentences." } },
      { title: { tr: "Kalıtım araçları", en: "Inheritance tools" }, code: String.raw`
class AdminPage(BasePage):
    def __init__(self, page, base_url, strict=True):
        super().__init__(page, base_url)
        self.strict = strict

isinstance(admin, BasePage)   # True
def __repr__(self): return f"User({self.name!r})"`,
        note: null }
    ] },
    { title: { tr: "Hatalar", en: "Errors" }, items: [
      { title: { tr: "try / except", en: "try / except" }, code: String.raw`
try:
    status = int(raw)
except (ValueError, TypeError) as error:
    status = 0
else:
    print("ok")
finally:
    browser.close()

raise ValueError(f"Unknown severity {value!r}")
class InvalidSeverityError(ValueError): ...`,
        note: { tr: "Sadece beklediğin hatayı yakala; çıplak <code>except:</code> yazma.", en: "Catch only the error you expect; never write a bare <code>except:</code>." } },
      { title: { tr: "assert", en: "assert" }, code: String.raw`
assert response.status_code == 200, f"got {response.status_code}"
assert safe, "Reflected XSS: the search term was not safely encoded."`,
        note: { tr: "Mesaj, rapordaki tek ipucudur — her zaman yaz.", en: "The message is the only clue in the report — always write it." } }
    ] },
    { title: { tr: "Dosyalar ve JSON", en: "Files & JSON" }, items: [
      { title: { tr: "Dosya okuma/yazma", en: "Reading/writing files" }, code: String.raw`
with open("log.txt", "a", encoding="utf-8") as f:
    f.write("PASSED\n")

from pathlib import Path
path = Path("reports") / "findings.json"
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(text, encoding="utf-8")
path.read_text(encoding="utf-8"), path.exists(), path.name, path.suffix`,
        note: { tr: "<code>encoding=\"utf-8\"</code> = Türkçe karakter güvencesi.", en: "<code>encoding=\"utf-8\"</code> = safe Turkish characters." } },
      { title: { tr: "json", en: "json" }, code: String.raw`
import json
data = json.loads(response_text)               # str -> obje
text = json.dumps(data, ensure_ascii=False, indent=2)
with open(path, "w", encoding="utf-8") as f:
    json.dump(findings, f, ensure_ascii=False, indent=2)
with open(path, encoding="utf-8") as f:
    findings = json.load(f)`,
        note: { tr: "Sonu <strong>s</strong> ile biten = string; bitmeyen = dosya.", en: "Ending in <strong>s</strong> = string; otherwise = file." } }
    ] },
    { title: { tr: "Decorator ve fixture", en: "Decorators & fixtures" }, items: [
      { title: { tr: "Decorator kalıbı", en: "Decorator pattern" }, code: String.raw`
import functools

def log_step(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(f"STEP: {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

@log_step
def login(user, pw): ...`,
        note: null },
      { title: { tr: "Fixture (setup + teardown)", en: "Fixture (setup + teardown)" }, code: String.raw`
import pytest

@pytest.fixture(scope="session")
def base_url() -> str:
    return "http://127.0.0.1:5000"

@pytest.fixture
def api(base_url):
    session = requests.Session()
    yield session            # test burada çalışır / test runs here
    session.close()          # teardown (test kalsa bile / even on failure)

def test_users_api(api, base_url): ...`,
        note: { tr: "Fixture'lar <code>conftest.py</code>'de durur ve parametre adıyla enjekte edilir.", en: "Fixtures live in <code>conftest.py</code> and are injected by parameter name." } }
    ] },
    { title: { tr: "pytest", en: "pytest" }, items: [
      { title: { tr: "Test, raises, parametrize", en: "Test, raises, parametrize" }, code: String.raw`
import pytest

pytestmark = [pytest.mark.security, pytest.mark.owasp_a03]

def test_ok():
    assert classify(200) == "ok"

def test_rejects():
    with pytest.raises(ValueError, match="Unknown"):
        normalize_severity("urgent")

@pytest.mark.parametrize("payload", XSS_PAYLOADS)
def test_xss(page, payload): ...`,
        note: null },
      { title: { tr: "Komut satırı", en: "Command line" }, lang: "bash", code: String.raw`
pytest -v                          # ayrıntılı / verbose
pytest -m security                 # marker ile seç / select by marker
pytest -m "not security"
pytest -k sqli -x                  # isimle seç, ilk hatada dur
pytest --lf                        # son kalanlar / last failed
pytest -m juiceshop --no-server    # Juice Shop (JUICE_SHOP_URL)
pytest --html=reports/pytest.html  # pytest-html`,
        note: null }
    ] },
    { title: { tr: "Playwright (sync)", en: "Playwright (sync)" }, items: [
      { title: { tr: "Kurulum ve temel akış", en: "Setup & basic flow" }, code: String.raw`
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.goto("http://127.0.0.1:5000/login")
    page.locator("#username").fill("selcuk")
    page.locator("#login-btn").click()
    expect(page.locator("#login-error")).to_be_visible()
    page.screenshot(path="reports/login.png", full_page=True)
    browser.close()`,
        note: { tr: "Auto-wait: <code>time.sleep</code> yazma.", en: "Auto-wait: don't write <code>time.sleep</code>." } },
      { title: { tr: "Locator'lar ve güvenlik kancaları", en: "Locators & security hooks" }, code: String.raw`
page.get_by_test_id("product-card").count()
page.get_by_role("button", name="Giriş yap")
page.locator(".review-body").all_inner_texts()
page.on("dialog", lambda d: d.dismiss())
page.add_init_script("window.sqaMark = id => window.__sqa_fired = id;")
page.evaluate("window.__sqa_fired")
page.context.cookies()`,
        note: null }
    ] },
    { title: { tr: "requests", en: "requests" }, items: [
      { title: { tr: "İstekler", en: "Requests" }, code: String.raw`
import requests

api = requests.Session()
r = api.get(f"{BASE}/api/users/2", timeout=5)
r.status_code, r.ok, r.headers["content-type"], r.json()
api.post(f"{BASE}/login", data={"username": "u", "password": "p"}, timeout=5)
api.get(f"{BASE}/products", params={"q": "çay"}, timeout=5)
api.get(f"{BASE}/redirect?next=//evil", allow_redirects=False, timeout=5)
r.raise_for_status()`,
        note: { tr: "Her çağrıda <code>timeout=</code>!", en: "<code>timeout=</code> on every call!" } }
    ] },
    { title: { tr: "Dataclass'lar", en: "Dataclasses" }, items: [
      { title: { tr: "Finding kalıbı", en: "Finding pattern" }, code: String.raw`
from dataclasses import asdict, dataclass, field, replace

@dataclass
class Finding:
    id: str
    severity: str
    url: str
    evidence: str = ""
    tags: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.severity = self.severity.lower()

asdict(finding)                     # -> dict (JSON'a hazır / JSON-ready)

@dataclass(frozen=True)
class ChallengeInfo: ...
replace(info, severity="high")      # değiştirilmiş kopya / modified copy`,
        note: null }
    ] },
    { title: { tr: "Güvenlik kontrolleri", en: "Security checks" }, items: [
      { title: { tr: "SQLi: tehlikeli vs güvenli", en: "SQLi: dangerous vs safe" }, code: String.raw`
# TEHLİKELİ / DANGEROUS
cur.execute(f"SELECT * FROM users WHERE username = '{u}'")
# GÜVENLİ / SAFE
cur.execute("SELECT * FROM users WHERE username = ?", (u,))

# Oracle: tek tırnak gönder, hata imzası ara / send a quote, look for an error signature
vulnerable = any(s in body.lower() for s in ("sqlite3", "syntax error", "unrecognized token"))`,
        note: null },
      { title: { tr: "XSS ve IDOR", en: "XSS & IDOR" }, code: String.raw`
# XSS: ham payload yansıyor mu? / is the raw payload reflected?
reflected = payload in page.content()
safe_html = html.escape(user_input)

# IDOR: A olarak B'nin kaynağını iste / as A, request B's resource
r = api_as_user2.get(f"{BASE}/orders/102", allow_redirects=False, timeout=5)
exposed = r.status_code == 200 and "Sipariş #102" in r.text`,
        note: { tr: "Sadece izinli sistemlerde test et.", en: "Only test systems you're authorized to test." } },
      { title: { tr: "Header ve çerez kontrolleri", en: "Header & cookie checks" }, code: String.raw`
EXPECTED = ["Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options"]
missing = [h for h in EXPECTED if h not in r.headers]
leaks_version = any(ch.isdigit() for ch in r.headers.get("Server", ""))
cookie = r.headers.get("Set-Cookie", "")
insecure_cookie = "httponly" not in cookie.lower() or "samesite" not in cookie.lower()`,
        note: null }
    ] }
  ]
});
