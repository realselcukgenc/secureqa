SQ.addLesson({
  id: "10-decorators-fixtures",
  num: 10,
  icon: "@fix",
  minutes: 30,
  title: { tr: "Decorator'lar, generator'lar ve pytest fixture'ları", en: "Decorators, generators & pytest fixtures" },
  summary: {
    tr: "@ işaretinin arkasındaki sihir, yield ile setup/teardown ve conftest.py'deki page/api fixture'larının nasıl çalıştığı.",
    en: "The magic behind @, setup/teardown with yield, and how the page/api fixtures in conftest.py work."
  },
  goals: {
    tr: [
      "Decorator = bir fonksiyonu alıp sarmalayan (wrap) fonksiyon",
      "<code>functools.wraps</code> ve argümanlı decorator'lar",
      "<code>yield</code> ile generator: “burada dur, sonra devam et”",
      "pytest fixture'ları: isimle enjeksiyon, <code>yield</code> ile teardown, <code>scope</code>, <code>conftest.py</code>"
    ],
    en: [
      "Decorator = a function that takes a function and wraps it",
      "<code>functools.wraps</code> and decorators with arguments",
      "Generators with <code>yield</code>: “pause here, continue later”",
      "pytest fixtures: injection by name, teardown with <code>yield</code>, <code>scope</code>, <code>conftest.py</code>"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>5. derste fonksiyonların da birer değer olduğunu gördük. <strong>Decorator</strong>, bir fonksiyonu argüman olarak alıp onun yerine geçecek yeni bir fonksiyon (genelde <em>wrapper</em>) döndüren fonksiyondur. <code>@log_step</code> yazmak, <code>fonksiyon = log_step(fonksiyon)</code> yazmanın kısa yoludur.</p>`,
      en: `<p>In lesson 5 we saw that functions are values. A <strong>decorator</strong> is a function that takes a function and returns a new function (usually a <em>wrapper</em>) to replace it. Writing <code>@log_step</code> is shorthand for <code>function = log_step(function)</code>.</p>` },
    { t: "code", id: "c1",
      title: { tr: "İlk decorator'ın: adımları logla", en: "Your first decorator: log steps" },
      code: String.raw`
import functools
import time


def log_step(func):
    @functools.wraps(func)                 # orijinal adı/docstring'i koru / keep name & docstring
    def wrapper(*args, **kwargs):
        print(f"▶ {func.__name__}{args}")
        start = time.perf_counter()
        result = func(*args, **kwargs)     # asıl fonksiyonu çağır / call the real function
        print(f"✔ {func.__name__} ({(time.perf_counter() - start) * 1000:.1f} ms)")
        return result
    return wrapper


@log_step
def login(username, password):
    """Kullanıcıyı giriş yaptırır."""
    return username == "selcuk" and password == "Selcuk!2026"


print("sonuç / result:", login("selcuk", "Selcuk!2026"))
print(login.__name__, "-", login.__doc__)
` },
    { t: "callout", kind: "tip",
      tr: `<p><code>*args</code> “konuma göre verilen tüm argümanlar (tuple)”, <code>**kwargs</code> “isimle verilen tüm argümanlar (dict)” demektir. Wrapper bunları olduğu gibi asıl fonksiyona ilettiği için her imzayla çalışır.</p>`,
      en: `<p><code>*args</code> means “all positional arguments (a tuple)”, <code>**kwargs</code> “all keyword arguments (a dict)”. Because the wrapper forwards them unchanged, it works with any signature.</p>` },
    { t: "code", id: "c2",
      title: { tr: "Argüman alan decorator: retry(times=3)", en: "A decorator with arguments: retry(times=3)" },
      code: String.raw`
import functools


def retry(times: int = 3):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except AssertionError as error:
                    print(f"  deneme {attempt}/{times} başarısız: {error}")
            raise AssertionError(f"{func.__name__} failed {times} times")
        return wrapper
    return decorator


counter = {"n": 0}


@retry(times=3)          # = retry(times=3)(check_banner)
def check_banner():
    counter["n"] += 1
    assert counter["n"] >= 2, "banner not visible yet"
    return "visible"


print(check_banner())
` },
    { t: "h", tr: "Generator ve yield", en: "Generators and yield" },
    { t: "text",
      tr: `<p>İçinde <code>yield</code> geçen bir fonksiyon çağrıldığında hemen çalışmaz; bir <strong>generator</strong> nesnesi döner. <code>next()</code> her çağrıldığında kod bir sonraki <code>yield</code>'e kadar çalışır ve orada <strong>durur</strong>. Fixture'ların “önce kur, testi çalıştır, sonra temizle” davranışı tam olarak buna dayanır.</p>`,
      en: `<p>A function containing <code>yield</code> doesn't run immediately when called; it returns a <strong>generator</strong>. Each <code>next()</code> runs the code up to the next <code>yield</code> and <strong>pauses</strong> there. The “set up, run the test, then clean up” behaviour of fixtures is built exactly on this.</p>` },
    { t: "code", id: "c3",
      title: { tr: "yield'de durup devam etmek", en: "Pausing at yield and resuming" },
      code: String.raw`
def browser_session():
    print("1) SETUP: tarayıcı açılıyor / opening browser")
    page = {"url": "about:blank"}
    yield page                                   # testi bu noktada çalıştır / test runs here
    print("3) TEARDOWN: tarayıcı kapanıyor / closing browser")


gen = browser_session()
print("generator oluştu, henüz hiçbir şey çalışmadı:", gen)
page = next(gen)                                 # setup + yield'e kadar
print("2) TEST: page =", page)
try:
    next(gen)                                    # yield'den sonrası (teardown)
except StopIteration:
    print("generator bitti / finished")
` },
    { t: "h", tr: "pytest fixture'ları", en: "pytest fixtures" },
    { t: "text",
      tr: `<p><strong>Fixture</strong>, bir testin ihtiyaç duyduğu hazır nesnedir (tarayıcı sayfası, API oturumu, test kullanıcısı…). <code>@pytest.fixture</code> ile işaretlenir ve test fonksiyonu onu <strong>parametre adıyla</strong> ister: <code>def test_login(page):</code> yazdığında pytest <code>page</code> adlı fixture'ı bulur, çalıştırır ve sonucunu teste verir (dependency injection). Fixture'da <code>yield</code> varsa, test bitince <code>yield</code>'den sonraki kod (teardown) çalışır — test <strong>başarısız olsa bile</strong>.</p>
<p>Aşağıdaki hücrede tarayıcıda çalışan bir <strong>mini-pytest</strong> simülasyonu var: <code>import pytest</code>, <code>@pytest.fixture</code> ve <code>run_tests()</code> gerçek pytest'e benzer şekilde davranır.</p>`,
      en: `<p>A <strong>fixture</strong> is a ready-made object a test needs (a browser page, an API session, a test user…). It's marked with <code>@pytest.fixture</code> and the test asks for it <strong>by parameter name</strong>: when you write <code>def test_login(page):</code> pytest finds the fixture called <code>page</code>, runs it and passes the result to the test (dependency injection). If the fixture has a <code>yield</code>, the code after it (teardown) runs when the test ends — <strong>even if the test fails</strong>.</p>
<p>The cell below has a <strong>mini-pytest</strong> simulation running in the browser: <code>import pytest</code>, <code>@pytest.fixture</code> and <code>run_tests()</code> behave like real pytest.</p>` },
    { t: "code", id: "c4", simulated: true, setup: SQ.shared.miniPytest,
      title: { tr: "Fixture zinciri: base_url → api → test", en: "A fixture chain: base_url → api → test" },
      code: String.raw`
import pytest


@pytest.fixture
def base_url():
    return "http://127.0.0.1:5000"


@pytest.fixture
def api(base_url):                     # fixture başka bir fixture isteyebilir
    print(f"  [setup] api session for {base_url}")
    session = {"base_url": base_url, "cookies": {}}
    yield session
    print("  [teardown] api session closed")


def test_base_url_is_local(base_url):
    assert base_url.startswith("http://127.0.0.1")


def test_api_has_no_cookies(api):
    assert api["cookies"] == {}


def test_this_one_fails(api):
    assert api["base_url"].endswith(":8000"), "wrong port"


run_tests()
` },
    { t: "callout", kind: "qa",
      tr: `<p><strong>scope</strong> bir fixture'ın ne kadar yaşayacağını belirler: <code>"function"</code> (varsayılan, her test için yeni), <code>"module"</code>, <code>"session"</code> (tüm koşu boyunca bir kez). Tarayıcıyı açmak pahalıdır, bu yüzden SecureQA tarayıcıyı <code>session</code> scope'ta bir kez açar, ama her teste <strong>yeni bir context ve page</strong> verir: çerezler ve oturumlar testler arasında sızmaz.</p>`,
      en: `<p><strong>scope</strong> sets how long a fixture lives: <code>"function"</code> (default, new for every test), <code>"module"</code>, <code>"session"</code> (once for the whole run). Opening a browser is expensive, so SecureQA opens it once with <code>session</code> scope, but gives every test <strong>a new context and page</strong>: cookies and logins never leak between tests.</p>` },
    { t: "project", file: "tests/conftest.py",
      tr: `<p>Projenin <code>conftest.py</code> dosyasından gerçek fixture'lar. pytest bu dosyayı otomatik yükler; içindeki fixture'lar import edilmeden tüm testlerde kullanılabilir.</p>`,
      en: `<p>Real fixtures from the project's <code>conftest.py</code>. pytest loads this file automatically; its fixtures are available in every test without importing them.</p>`,
      code: String.raw`
@pytest.fixture()
def api(base_url: str) -> Iterator[requests.Session]:
    """A requests.Session with the base URL remembered (for API/security checks)."""
    session = requests.Session()
    session.base_url = base_url
    yield session
    session.close()


@pytest.fixture(scope="session")
def _browser(_playwright, settings: Settings) -> Iterator:
    """Launch one browser for the whole session (internal helper)."""
    browser = launch_browser(_playwright, settings)
    yield browser
    browser.close()


@pytest.fixture()
def page(_browser, settings: Settings) -> Iterator:
    """A fresh browser page (new context) for each test, with an XSS probe installed."""
    from secureqa.security.xss import install_xss_probe

    context = _browser.new_context(ignore_https_errors=True)
    context.set_default_timeout(settings.timeout_ms)
    page = context.new_page()
    install_xss_probe(page)
    yield page
    context.close()
`,
      notes: [
        { line: 2, tr: "<code>api</code>, <code>base_url</code> fixture'ını parametre adıyla istiyor; dönüş tipi <code>Iterator</code> çünkü bir generator.", en: "<code>api</code> asks for the <code>base_url</code> fixture by parameter name; its return type is <code>Iterator</code> because it's a generator." },
        { line: 6, tr: "<code>yield</code>: test bu noktada çalışır; sonra <code>session.close()</code> teardown'ı gelir.", en: "<code>yield</code>: the test runs here; then comes the <code>session.close()</code> teardown." },
        { line: 10, tr: "<code>scope=\"session\"</code>: tarayıcı tüm test koşusu için bir kez açılır.", en: "<code>scope=\"session\"</code>: the browser opens once for the whole test run." },
        { line: 23, tr: "Her test için izole bir context: çerezler/oturumlar paylaşılmaz.", en: "An isolated context per test: cookies/logins are not shared." },
        { line: 26, tr: "XSS kanıt fonksiyonu sayfa yüklenmeden enjekte ediliyor (15. ders).", en: "The XSS proof function is injected before the page loads (lesson 15)." }
      ] }
  ],
  exercises: [
    { id: "10-e1",
      title: { tr: "log_step decorator'ı", en: "The log_step decorator" },
      prompt: {
        tr: `<p><code>log_step</code> adında bir decorator yaz. Sarmaladığı fonksiyon çağrıldığında önce <code>STEP: &lt;fonksiyon adı&gt;</code> yazdırsın, sonra fonksiyonu aynı argümanlarla çağırıp <strong>sonucunu döndürsün</strong>. <code>functools.wraps</code> kullanarak fonksiyonun adını koru.</p>`,
        en: `<p>Write a decorator called <code>log_step</code>. When the wrapped function is called it first prints <code>STEP: &lt;function name&gt;</code>, then calls the function with the same arguments and <strong>returns its result</strong>. Keep the function's name with <code>functools.wraps</code>.</p>`
      },
      starter: String.raw`
import functools


def log_step(func):
    def wrapper(*args, **kwargs):
        ...
    return wrapper


@log_step
def add_to_cart(product_id, quantity=1):
    return f"{quantity} x #{product_id}"


print(add_to_cart(7, quantity=2))
`,
      solution: String.raw`
import functools


def log_step(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(f"STEP: {func.__name__}")
        return func(*args, **kwargs)
    return wrapper


@log_step
def add_to_cart(product_id, quantity=1):
    return f"{quantity} x #{product_id}"


print(add_to_cart(7, quantity=2))
`,
      check: String.raw`
import io as _io, contextlib as _cl
@log_step
def _open_page(path, lang="tr"):
    return f"{path}?lang={lang}"
_buf = _io.StringIO()
with _cl.redirect_stdout(_buf):
    _r = _open_page("/login", lang="en")
assert _r == "/login?lang=en", _t("Wrapper asıl fonksiyonun sonucunu döndürmeli (return func(*args, **kwargs)).", "The wrapper must return the real function's result (return func(*args, **kwargs)).")
assert "STEP: _open_page" in _buf.getvalue(), _t("Çağrıdan önce 'STEP: <fonksiyon adı>' yazdırılmalı.", "It must print 'STEP: <function name>' before the call.")
assert _open_page.__name__ == "_open_page", _t("@functools.wraps(func) ile fonksiyon adını koru.", "Keep the function name with @functools.wraps(func).")
`,
      hints: [
        { tr: "Wrapper içinde: <code>print(f\"STEP: {func.__name__}\")</code> sonra <code>return func(*args, **kwargs)</code>.", en: "Inside the wrapper: <code>print(f\"STEP: {func.__name__}\")</code> then <code>return func(*args, **kwargs)</code>." },
        { tr: "<code>def wrapper</code> satırının hemen üstüne <code>@functools.wraps(func)</code> ekle.", en: "Add <code>@functools.wraps(func)</code> right above the <code>def wrapper</code> line." }
      ] },
    { id: "10-e2",
      title: { tr: "Teardown'lu fixture", en: "A fixture with teardown" },
      setup: SQ.shared.miniPytest,
      prompt: {
        tr: `<p><code>events</code> listesi hazır. <code>temp_user</code> adında bir <strong>pytest fixture'ı</strong> yaz:</p><ul><li>önce <code>events.append("create")</code></li><li>sonra <code>{"username": "qa_temp", "role": "user"}</code> sözlüğünü <code>yield</code> etsin</li><li>yield'den sonra <code>events.append("delete")</code> (teardown)</li></ul><p>Ardından <code>temp_user</code>'ı kullanan ve kullanıcı adının <code>"qa_"</code> ile başladığını doğrulayan bir <code>test_temp_user_name</code> testi yaz. En sonda <code>run_tests()</code> çağır.</p>`,
        en: `<p>The <code>events</code> list is ready. Write a <strong>pytest fixture</strong> named <code>temp_user</code>:</p><ul><li>first <code>events.append("create")</code></li><li>then <code>yield</code> the dict <code>{"username": "qa_temp", "role": "user"}</code></li><li>after the yield <code>events.append("delete")</code> (teardown)</li></ul><p>Then write a test <code>test_temp_user_name</code> that uses <code>temp_user</code> and asserts the username starts with <code>"qa_"</code>. Finally call <code>run_tests()</code>.</p>`
      },
      starter: String.raw`
import pytest

events = []


def temp_user():
    return {"username": "qa_temp", "role": "user"}


def test_temp_user_name(temp_user):
    ...


run_tests()
print(events)
`,
      solution: String.raw`
import pytest

events = []


@pytest.fixture
def temp_user():
    events.append("create")
    yield {"username": "qa_temp", "role": "user"}
    events.append("delete")


def test_temp_user_name(temp_user):
    assert temp_user["username"].startswith("qa_")


run_tests()
print(events)
`,
      check: String.raw`
import inspect as _insp
assert "temp_user" in _FIXTURES, _t("temp_user fonksiyonunu @pytest.fixture ile işaretle.", "Mark the temp_user function with @pytest.fixture.")
assert _insp.isgeneratorfunction(_FIXTURES["temp_user"]), _t("Fixture 'return' yerine 'yield' kullanmalı (teardown için).", "The fixture must use 'yield' instead of 'return' (for teardown).")
assert events[:2] == ["create", "delete"], _t(f"events şu an {events}; önce 'create', test bitince 'delete' olmalı.", f"events is {events}; it should be 'create' then 'delete' after the test.")
assert "test_temp_user_name PASSED" in __output__, _t("test_temp_user_name PASSED olmalı (run_tests() çıktısına bak).", "test_temp_user_name must PASS (see the run_tests() output).")
def _bad(temp_user):
    assert temp_user["username"] == "x"
globals()["test__bad_probe"] = _bad
events.clear()
run_tests(keyword="_bad_probe", verbose=False)
assert events == ["create", "delete"], _t("Teardown, test başarısız olsa bile çalışmalı (yield'den sonraki satır).", "Teardown must run even when the test fails (the line after yield).")
`,
      hints: [
        { tr: "<code>@pytest.fixture</code> satırını <code>def temp_user():</code>'ın üstüne ekle; <code>return</code> yerine <code>yield</code> kullan.", en: "Put <code>@pytest.fixture</code> above <code>def temp_user():</code>; use <code>yield</code> instead of <code>return</code>." },
        { tr: "Test: <code>assert temp_user[\"username\"].startswith(\"qa_\")</code>", en: "Test: <code>assert temp_user[\"username\"].startswith(\"qa_\")</code>" }
      ] }
  ],
  quiz: [
    { q: { tr: "<code>@my_deco</code> ile süslenmiş <code>def f(): ...</code> neye eşdeğerdir?", en: "<code>def f(): ...</code> decorated with <code>@my_deco</code> is equivalent to?" },
      options: [{ tr: "<code>f = my_deco(f)</code>", en: "<code>f = my_deco(f)</code>" }, { tr: "<code>my_deco = f(my_deco)</code>", en: "<code>my_deco = f(my_deco)</code>" }, { tr: "<code>f()</code> çağrısının iki kez yapılması", en: "Calling <code>f()</code> twice" }],
      answer: 0, explain: { tr: "Decorator, fonksiyonu alır ve yerine geçecek olanı döndürür.", en: "The decorator takes the function and returns its replacement." } },
    { q: { tr: "pytest bir teste hangi fixture'ı vereceğini nasıl bilir?", en: "How does pytest know which fixture to give a test?" },
      options: [{ tr: "Testin içindeki import'lardan", en: "From the imports inside the test" }, { tr: "Test fonksiyonunun parametre adlarından", en: "From the test function's parameter names" }, { tr: "Fixture'ların tanım sırasından", en: "From the order fixtures are defined" }],
      answer: 1, explain: { tr: "<code>def test_x(page, api)</code> → <code>page</code> ve <code>api</code> fixture'ları aranır.", en: "<code>def test_x(page, api)</code> → fixtures named <code>page</code> and <code>api</code> are looked up." } },
    { q: { tr: "Bir fixture'da <code>yield</code>'den sonraki kod ne zaman çalışır?", en: "When does the code after <code>yield</code> in a fixture run?" },
      options: [{ tr: "Hiçbir zaman", en: "Never" }, { tr: "Sadece test geçerse", en: "Only if the test passes" }, { tr: "Test bittikten sonra, geçse de kalsa da", en: "After the test ends, pass or fail" }],
      answer: 2, explain: { tr: "Teardown her durumda çalışır; tarayıcı/oturum kapatma işleri buraya konur.", en: "Teardown always runs; closing browsers/sessions goes here." } }
  ]
});
