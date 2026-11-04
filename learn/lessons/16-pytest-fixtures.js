SQ.addLesson({
  id: "16-pytest-fixtures",
  num: 16,
  icon: "fix+",
  minutes: 30,
  title: { tr: "İleri pytest: fixtures", en: "Advanced pytest: fixtures" },
  summary: {
    tr: "Fixture scope'ları, yield ile teardown, fixture kompozisyonu, conftest.py, parametrize ve marker seçimi (-m / -k).",
    en: "Fixture scopes, teardown with yield, fixture composition, conftest.py, parametrize and marker selection (-m / -k)."
  },
  goals: {
    tr: [
      "Fixture nedir, neden <code>self</code>'siz paylaşılan kurulum sağlar",
      "<code>yield</code> ile kurulum + <strong>teardown</strong> (temizlik) ve <code>scope=</code> (function/session)",
      "Fixture kompozisyonu: bir fixture başka bir fixture'ı parametre olarak ister",
      "<code>conftest.py</code>, <code>pytest_addoption</code>/<code>pytest_configure</code> ve <code>-m</code> / <code>-k</code> seçimi"
    ],
    en: [
      "What a fixture is and why it gives shared setup without <code>self</code>",
      "Setup + <strong>teardown</strong> (cleanup) with <code>yield</code>, and <code>scope=</code> (function/session)",
      "Fixture composition: a fixture asks for another fixture as a parameter",
      "<code>conftest.py</code>, <code>pytest_addoption</code>/<code>pytest_configure</code> and selecting with <code>-m</code> / <code>-k</code>"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>10. ve 11. derste fixture'ları tanıdık: teste <strong>parametre adıyla</strong> gelen hazır nesneler. Bu derste gerçek güç özelliklerine giriyoruz: bir fixture'ın testten <strong>sonra</strong> temizlik yapması (<code>yield</code>), ne sıklıkta yeniden kurulacağı (<code>scope</code>), ve fixture'ların birbirini çağırması (kompozisyon). SecureQA'nın <code>tests/conftest.py</code> dosyası bu kalıpların tümünü kullanır: SecureShop sunucusunu oturum başına bir kez başlatır, her teste taze bir tarayıcı sayfası verir ve oturum sonunda raporu yazar.</p>`,
      en: `<p>You met fixtures in lessons 10 and 11: ready-made objects that arrive in a test <strong>by parameter name</strong>. This lesson adds the real power features: a fixture cleaning up <strong>after</strong> the test (<code>yield</code>), how often it is rebuilt (<code>scope</code>), and fixtures calling each other (composition). SecureQA's <code>tests/conftest.py</code> uses all of these: it starts the SecureShop server once per session, gives every test a fresh browser page, and writes the report at the end of the session.</p>` },
    { t: "callout", kind: "info", title: { tr: "Simülasyon hakkında", en: "About the simulation" },
      tr: `<p>Gerçek pytest bu sayfada çalışamaz; düzenlenebilir hücreler, API'si gerçeğiyle aynı olan küçük bir <strong>mini-pytest</strong> kullanır. <code>@pytest.fixture</code>, <code>yield</code>, <code>@pytest.mark.parametrize</code> ve marker'lar gerçekteki gibi yazılır; hücre sonundaki <code>run_tests()</code> ise <code>pytest</code> komutunun yerini tutar (<code>run_tests(marker="security")</code> = <code>pytest -m security</code>, <code>run_tests(keyword="login")</code> = <code>pytest -k login</code>).</p>`,
      en: `<p>Real pytest can't run on this page; the editable cells use a small <strong>mini-pytest</strong> whose API matches the real thing. <code>@pytest.fixture</code>, <code>yield</code>, <code>@pytest.mark.parametrize</code> and markers are written just like the real ones; the <code>run_tests()</code> at the end of a cell stands in for the <code>pytest</code> command (<code>run_tests(marker="security")</code> = <code>pytest -m security</code>, <code>run_tests(keyword="login")</code> = <code>pytest -k login</code>).</p>` },
    { t: "h", tr: "yield: kurulum ve teardown", en: "yield: setup and teardown" },
    { t: "text",
      tr: `<p>Bir fixture <code>return</code> yerine <code>yield</code> kullanırsa, <code>yield</code>'e kadar olan kısım <strong>testten önce</strong> (kurulum), <code>yield</code>'den sonrası ise <strong>testten sonra</strong> (teardown) çalışır — test başarısız olsa bile. Açtığın her şeyi (sunucu, tarayıcı, dosya, DB bağlantısı) burada güvenle kapatırsın. Çıktıda sıranın <em>connect → test → close</em> olduğuna dikkat et.</p>`,
      en: `<p>If a fixture uses <code>yield</code> instead of <code>return</code>, the part up to <code>yield</code> runs <strong>before the test</strong> (setup), and the part after <code>yield</code> runs <strong>after the test</strong> (teardown) — even when the test fails. Anything you open (server, browser, file, DB connection) is safely closed here. Notice the order in the output is <em>connect → test → close</em>.</p>` },
    { t: "code", id: "c1", simulated: true, setup: SQ.shared.miniPytest,
      title: { tr: "yield teardown + fixture kompozisyonu", en: "yield teardown + fixture composition" },
      code: String.raw`
import pytest

LOG = []


@pytest.fixture
def db():
    LOG.append("db: connect")          # testten ÖNCE / before the test
    connection = {"users": []}
    yield connection                   # test burada çalışır / the test runs here
    LOG.append("db: close")            # testten SONRA / after the test (teardown)


@pytest.fixture
def seeded_user(db):                   # kompozisyon: bu fixture db'yi ister
    db["users"].append("selcuk")
    return "selcuk"


def test_user_is_seeded(db, seeded_user):
    assert seeded_user in db["users"]


run_tests()
print("LOG:", LOG)
` },
    { t: "callout", kind: "tip",
      tr: `<p><strong>scope</strong>, bir fixture'ın ne kadar sık kurulacağını belirler. Varsayılan <code>function</code> (her teste bir taze nesne) güvenlidir ama pahalı şeyler için israftır. Bir tarayıcıyı veya sunucuyu her teste yeniden başlatmak yavaştır; bu yüzden SecureQA'da <code>base_url</code> ve <code>_browser</code> fixture'ları <code>scope="session"</code> ile <strong>tüm oturumda bir kez</strong> kurulur, <code>page</code> ise her teste taze verilir.</p>`,
      en: `<p><strong>scope</strong> controls how often a fixture is built. The default <code>function</code> (a fresh object per test) is safe but wasteful for expensive things. Relaunching a browser or server per test is slow, so in SecureQA the <code>base_url</code> and <code>_browser</code> fixtures use <code>scope="session"</code> to build <strong>once for the whole session</strong>, while <code>page</code> is given fresh to each test.</p>` },
    { t: "code", id: "c2", simulated: true, setup: SQ.shared.miniPytest,
      title: { tr: "Marker'larla -m ve -k seçimi", en: "Selecting with -m and -k" },
      code: String.raw`
import pytest


@pytest.mark.security
@pytest.mark.parametrize("payload", ["' OR 1=1--", "admin'--", "kahve"])
def test_quote_is_flagged(payload):
    looks_sqli = "'" in payload
    # güvenli girdi (kahve) veya SQLi şüphelisi olmalı
    assert payload == "kahve" or looks_sqli


@pytest.mark.functional
def test_search_finds_coffee():
    assert "kahve" in "türk kahvesi"


print("pytest -m security")
run_tests(marker="security")
print()
print("pytest -k coffee")
run_tests(keyword="coffee")
` },
    { t: "code", id: "c3", readonly: true, real: true, lang: "bash", file: "terminal",
      title: { tr: "Gerçek pytest komutları (conftest.py seçenekleriyle)", en: "Real pytest commands (with conftest.py options)" },
      code: String.raw`
pytest -m security                  # sadece savunma kontrolleri / only defensive checks
pytest -m "security and owasp_a01"  # marker ifadesi / marker expression
pytest -m "not juiceshop"           # Juice Shop saldırıları hariç / all but Juice Shop
pytest -k "login or orders"         # adında geçenler / name contains
pytest -m security --no-server      # --no-server: SecureQA'nın conftest.py ek seçeneği
pytest -q --lf                      # sessiz + son başarısız olanlar / quiet + last-failed
` },
    { t: "project", file: "tests/conftest.py (kısaltılmış / shortened)",
      tr: `<p>SecureQA'nın <code>conftest.py</code>'si fixture'ların merkezidir: aynı klasördeki (ve alt klasörlerdeki) <strong>tüm testler</strong> buradaki fixture'ları isimle kullanabilir — import gerekmez. <code>base_url</code> bir <code>session</code> fixture'ıdır ve <code>yield</code> ile sunucuyu başlatıp sonunda durdurur. <code>pytest_configure</code> ise marker'ları kaydeder ki <code>-m security</code> çalışsın ve yazım hatası uyarı versin.</p>`,
      en: `<p>SecureQA's <code>conftest.py</code> is the home of fixtures: <strong>every test</strong> in that folder (and subfolders) can use these fixtures by name — no import needed. <code>base_url</code> is a <code>session</code> fixture and uses <code>yield</code> to start the server and stop it at the end. <code>pytest_configure</code> registers the markers so <code>-m security</code> works and a typo warns.</p>`,
      code: String.raw`
def pytest_configure(config: pytest.Config) -> None:
    """Register custom markers so -m filtering works and pytest does not warn."""
    markers = [
        "functional: normal behaviour tests against SecureShop (login, search, cart, i18n).",
        "security: a defensive regression check against SecureShop (should PASS).",
        "juiceshop: an attack against OWASP Juice Shop (a finding is EXPECTED).",
        "owasp_a01: Broken Access Control.",
        # ... owasp_a02 .. owasp_a07
    ]
    for marker in markers:
        config.addinivalue_line("markers", marker)


@pytest.fixture(scope="session")
def base_url(request: pytest.FixtureRequest) -> Iterator[str]:
    """Start SecureShop (once) and yield its base URL; stop it at the end."""
    external = os.environ.get("BASE_URL")
    if external or request.config.getoption("--no-server"):
        yield (external or "http://127.0.0.1:5000").rstrip("/")
        return
    server = DemoServer()
    server.start()
    try:
        yield server.base_url
    finally:
        server.stop()


@pytest.fixture()
def api(base_url: str) -> Iterator[requests.Session]:
    """A requests.Session with the base URL remembered (for API/security checks)."""
    session = requests.Session()
    session.base_url = base_url  # type: ignore[attr-defined]
    yield session
    session.close()
`,
      notes: [
        { line: 2, tr: "Marker'lar <code>pyproject.toml</code> yerine burada da kaydedilebilir; amaç <code>--strict-markers</code> ile yazım hatasını yakalamak.", en: "Markers can be registered here (as well as in <code>pyproject.toml</code>); the point is to catch typos with <code>--strict-markers</code>." },
        { line: 13, tr: "<code>scope=\"session\"</code>: sunucu tüm test oturumunda yalnızca bir kez başlatılır.", en: "<code>scope=\"session\"</code>: the server starts only once for the whole test session." },
        { line: 16, tr: "<code>--no-server</code>: 11. derste gördüğün <code>pytest_addoption</code> ile eklenen SecureQA seçeneği.", en: "<code>--no-server</code>: the SecureQA option added via <code>pytest_addoption</code> you saw in lesson 11." },
        { line: 22, tr: "<code>yield</code>'den önce kurulum, <code>finally</code> içinde teardown — test patlasa bile sunucu durdurulur.", en: "Setup before <code>yield</code>, teardown in <code>finally</code> — the server stops even if a test blows up." },
        { line: 27, tr: "Fixture kompozisyonu: <code>api</code>, <code>base_url</code>'u parametre olarak isteyerek ona bağlanır.", en: "Fixture composition: <code>api</code> depends on <code>base_url</code> by asking for it as a parameter." },
        { line: 31, tr: "Burada da <code>yield</code> + kapatma: her test sonrası HTTP oturumu temizlenir.", en: "<code>yield</code> + close here too: the HTTP session is cleaned up after each test." }
      ] }
  ],
  exercises: [
    { id: "16-e1",
      title: { tr: "Teardown yapan bir yield fixture", en: "A yield fixture with teardown" },
      setup: SQ.shared.miniPytest + "\n" + String.raw`
EVENTS = []
`,
      prompt: {
        tr: `<p>Hazır bir <code>EVENTS</code> listesi var. Şunları yaz:</p><ul><li><code>collector</code> adında bir <code>@pytest.fixture</code>: <code>yield</code>'den önce <code>EVENTS.append("start")</code>, boş bir liste <code>yield</code> et, <code>yield</code>'den sonra <code>EVENTS.append("stop")</code>.</li><li><code>test_uses_collector</code> adında, <code>collector</code>'ı parametre olarak alan bir test: ona bir eleman ekleyip uzunluğunun 1 olduğunu doğrula.</li></ul><p>Sonda <code>run_tests()</code> çağır. Kurulum testten önce, teardown sonra çalışmalı (EVENTS = ["start", "stop"]).</p>`,
        en: `<p>An <code>EVENTS</code> list is ready. Write:</p><ul><li>a <code>@pytest.fixture</code> called <code>collector</code>: before the <code>yield</code> do <code>EVENTS.append("start")</code>, <code>yield</code> an empty list, after the <code>yield</code> do <code>EVENTS.append("stop")</code>.</li><li>a test <code>test_uses_collector</code> that takes <code>collector</code> as a parameter: append one item to it and assert its length is 1.</li></ul><p>Call <code>run_tests()</code> at the end. Setup must run before the test and teardown after (EVENTS = ["start", "stop"]).</p>`
      },
      starter: String.raw`
import pytest


@pytest.fixture
def collector():
    ...


def test_uses_collector(collector):
    ...


run_tests()
`,
      solution: String.raw`
import pytest


@pytest.fixture
def collector():
    EVENTS.append("start")
    items = []
    yield items
    EVENTS.append("stop")


def test_uses_collector(collector):
    collector.append("finding")
    assert len(collector) == 1


run_tests()
`,
      check: String.raw`
import inspect as _inspect
assert "collector" in _FIXTURES, _t("collector adında bir @pytest.fixture tanımla.", "Define a @pytest.fixture named collector.")
assert _inspect.isgeneratorfunction(_FIXTURES["collector"]), _t("collector return değil, yield kullanan bir fixture olmalı.", "collector must be a yield fixture, not a return one.")
assert callable(globals().get("test_uses_collector")), _t("test_uses_collector adında bir test yaz.", "Write a test named test_uses_collector.")
EVENTS.clear()
_r = run_tests(verbose=False)
assert _r["passed"] >= 1 and _r["failed"] == 0, _t(f"Test geçmeli: {_r}", f"The test must pass: {_r}")
assert EVENTS == ["start", "stop"], _t(f"Kurulum testten ÖNCE, teardown SONRA çalışmalı; EVENTS = ['start','stop'] bekleniyordu, gelen {EVENTS}.", f"Setup must run BEFORE the test and teardown AFTER; expected EVENTS = ['start','stop'], got {EVENTS}.")
`,
      hints: [
        { tr: "Fixture gövdesi: <code>EVENTS.append(\"start\")</code>, sonra <code>yield []</code>, sonra <code>EVENTS.append(\"stop\")</code>.", en: "Fixture body: <code>EVENTS.append(\"start\")</code>, then <code>yield []</code>, then <code>EVENTS.append(\"stop\")</code>." },
        { tr: "Test <code>collector</code> parametresini alır: <code>collector.append(...)</code> ve <code>assert len(collector) == 1</code>.", en: "The test takes the <code>collector</code> parameter: <code>collector.append(...)</code> and <code>assert len(collector) == 1</code>." }
      ] },
    { id: "16-e2",
      title: { tr: "Marker'la seçim", en: "Selecting with a marker" },
      setup: SQ.shared.miniPytest + "\n" + String.raw`
EXPECTED_HEADERS = ["Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options"]
`,
      prompt: {
        tr: `<p>İki test yaz ve <strong>sadece ilkini</strong> <code>@pytest.mark.security</code> ile işaretle:</p><ul><li><code>test_csp_present</code> (security): <code>"Content-Security-Policy" in EXPECTED_HEADERS</code> doğru mu?</li><li><code>test_search_works</code> (işaretsiz): <code>"kahve" in "türk kahvesi"</code></li></ul><p>Sonra yalnızca güvenlik testini çalıştır: <code>run_tests(marker="security")</code>. Yalnızca 1 test seçilmeli (diğeri deselected).</p>`,
        en: `<p>Write two tests and mark <strong>only the first</strong> with <code>@pytest.mark.security</code>:</p><ul><li><code>test_csp_present</code> (security): is <code>"Content-Security-Policy" in EXPECTED_HEADERS</code>?</li><li><code>test_search_works</code> (no marker): <code>"kahve" in "türk kahvesi"</code></li></ul><p>Then run only the security test: <code>run_tests(marker="security")</code>. Only 1 test should be selected (the other deselected).</p>`
      },
      starter: String.raw`
import pytest


def test_csp_present():
    assert "Content-Security-Policy" in EXPECTED_HEADERS


def test_search_works():
    assert "kahve" in "türk kahvesi"


run_tests(marker="security")
`,
      solution: String.raw`
import pytest


@pytest.mark.security
def test_csp_present():
    assert "Content-Security-Policy" in EXPECTED_HEADERS


def test_search_works():
    assert "kahve" in "türk kahvesi"


run_tests(marker="security")
`,
      check: String.raw`
_sec = [m.name for m in _marks(test_csp_present)]
assert "security" in _sec, _t("test_csp_present @pytest.mark.security ile işaretlenmeli.", "test_csp_present must be marked with @pytest.mark.security.")
assert "security" not in [m.name for m in _marks(test_search_works)], _t("test_search_works işaretsiz kalmalı.", "test_search_works must stay unmarked.")
_r = run_tests(marker="security", verbose=False)
assert _r["passed"] == 1 and _r["deselected"] == 1, _t(f"-m security ile 1 test seçilip 1 test deselected olmalı; gelen {_r}.", f"-m security must select 1 test and deselect 1; got {_r}.")
`,
      hints: [
        { tr: "Marker'ı test fonksiyonunun hemen üstüne yaz: <code>@pytest.mark.security</code>.", en: "Put the marker right above the test function: <code>@pytest.mark.security</code>." },
        { tr: "İkinci testi <strong>işaretleme</strong>; <code>run_tests(marker=\"security\")</code> onu otomatik eler (deselected).", en: "Do <strong>not</strong> mark the second test; <code>run_tests(marker=\"security\")</code> deselects it automatically." }
      ] }
  ],
  quiz: [
    { q: { tr: "Bir fixture'da <code>yield</code>'den sonraki kod ne zaman çalışır?", en: "When does the code after <code>yield</code> in a fixture run?" },
      options: [{ tr: "Testten önce", en: "Before the test" }, { tr: "Test bittikten sonra (teardown), test başarısız olsa bile", en: "After the test finishes (teardown), even if the test failed" }, { tr: "Hiç çalışmaz", en: "It never runs" }],
      answer: 1, explain: { tr: "<code>yield</code> öncesi kurulum, sonrası teardown'dır; açtığını güvenle kapatırsın.", en: "Before <code>yield</code> is setup, after it is teardown; you safely close what you opened." } },
    { q: { tr: "Bir sunucuyu tüm test oturumunda yalnızca bir kez başlatmak için fixture'a ne verilir?", en: "To start a server only once for the whole test session, what do you give the fixture?" },
      options: [{ tr: "<code>scope=\"session\"</code>", en: "<code>scope=\"session\"</code>" }, { tr: "<code>scope=\"function\"</code>", en: "<code>scope=\"function\"</code>" }, { tr: "<code>autouse=True</code>", en: "<code>autouse=True</code>" }],
      answer: 0, explain: { tr: "<code>function</code> her teste bir yeni nesne verir; pahalı kaynaklar için <code>session</code> kullanılır.", en: "<code>function</code> gives a fresh object per test; use <code>session</code> for expensive resources." } },
    { q: { tr: "<code>conftest.py</code>'deki fixture'ları kullanmak için testte ne yapılır?", en: "To use a fixture from <code>conftest.py</code> in a test, what do you do?" },
      options: [{ tr: "<code>from conftest import ...</code> ile import edilir", en: "Import it with <code>from conftest import ...</code>" }, { tr: "Sadece fixture adını test fonksiyonuna parametre olarak yazmak yeter", en: "Just name the fixture as a parameter of the test function" }, { tr: "<code>pytest.use_fixture()</code> çağrılır", en: "Call <code>pytest.use_fixture()</code>" }],
      answer: 1, explain: { tr: "pytest aynı klasör/alt klasördeki conftest.py fixture'larını isimle otomatik enjekte eder.", en: "pytest auto-injects conftest.py fixtures from the same/parent folders by name." } }
  ]
});
