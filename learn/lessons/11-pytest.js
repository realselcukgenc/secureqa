SQ.addLesson({
  id: "11-pytest",
  num: 11,
  icon: "pytest",
  minutes: 30,
  title: { tr: "pytest temelleri ve marker'lar", en: "pytest basics & markers" },
  summary: {
    tr: "Test keşfi, düz assert, pytest.raises, parametrize, marker'lar (-m security) ve komut satırı seçenekleri.",
    en: "Test discovery, plain assert, pytest.raises, parametrize, markers (-m security) and command-line options."
  },
  goals: {
    tr: [
      "pytest'in testleri nasıl bulduğu: <code>test_*.py</code> dosyaları, <code>test_*</code> fonksiyonları",
      "Düz <code>assert</code> ve <code>pytest.raises</code> ile hata beklemek",
      "<code>@pytest.mark.parametrize</code> ile veri odaklı testler",
      "Marker'lar: <code>@pytest.mark.security</code>, <code>pytestmark</code>, <code>-m</code>, <code>-k</code>, <code>-x</code>, <code>-v</code>"
    ],
    en: [
      "How pytest finds tests: <code>test_*.py</code> files, <code>test_*</code> functions",
      "Plain <code>assert</code> and expecting errors with <code>pytest.raises</code>",
      "Data-driven tests with <code>@pytest.mark.parametrize</code>",
      "Markers: <code>@pytest.mark.security</code>, <code>pytestmark</code>, <code>-m</code>, <code>-k</code>, <code>-x</code>, <code>-v</code>"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>pytest'te bir test, adı <code>test_</code> ile başlayan sıradan bir fonksiyondur. Özel bir <code>assertEquals</code> metodu yoktur: düz <code>assert</code> yazarsın ve pytest başarısız olduğunda iki tarafın değerlerini akıllıca gösterir. pytest <code>test_*.py</code> dosyalarını tarar (SecureQA'da <code>pyproject.toml</code> içinde <code>testpaths = ["tests"]</code> ile <code>tests/</code> klasörüne sınırlı).</p>`,
      en: `<p>In pytest a test is an ordinary function whose name starts with <code>test_</code>. There's no special <code>assertEquals</code> method: you write a plain <code>assert</code> and when it fails pytest smartly shows the values on both sides. pytest scans <code>test_*.py</code> files (in SecureQA limited to <code>tests/</code> via <code>testpaths = ["tests"]</code> in <code>pyproject.toml</code>).</p>` },
    { t: "code", id: "c1", simulated: true, setup: SQ.shared.miniPytest,
      title: { tr: "İlk testlerin (mini-pytest ile)", en: "Your first tests (with mini-pytest)" },
      code: String.raw`
import pytest


def build_url(base: str, path: str) -> str:
    return base.rstrip("/") + "/" + path.lstrip("/")


def test_build_url_joins_with_one_slash():
    assert build_url("http://x/", "/login") == "http://x/login"


def test_status_code_is_ok():
    status = 404
    assert status == 200, f"beklenen 200, gelen {status}"


def test_int_rejects_text():
    with pytest.raises(ValueError):
        int("abc")


def helper_not_a_test():      # adı test_ ile başlamadığı için toplanmaz
    assert False


run_tests()
` },
    { t: "code", id: "c2", readonly: true, real: true, lang: "bash", file: "terminal",
      title: { tr: "Gerçek pytest komutları", en: "Real pytest commands" },
      code: String.raw`
pytest                              # tüm testler / all tests
pytest tests/security -v            # bir klasör, ayrıntılı / one folder, verbose
pytest -m security                  # sadece @pytest.mark.security olanlar
pytest -m "security and owasp_a03"  # marker ifadeleri / marker expressions
pytest -m "not security"            # güvenlik testleri hariç / all but security
pytest -k sqli                      # adında "sqli" geçenler / name contains "sqli"
pytest -x                           # ilk hatada dur / stop at first failure
pytest --lf                         # sadece son kalanları tekrar çalıştır / rerun last failed
pytest --mode secure                # SecureQA'nın kendi seçeneği (conftest.py)
` },
    { t: "h", tr: "parametrize: aynı test, farklı veriler", en: "parametrize: same test, different data" },
    { t: "text",
      tr: `<p>Bir döngü içinde assert yazarsan ilk başarısız veride test durur ve diğerlerini göremezsin. <code>@pytest.mark.parametrize</code> her veri için <strong>ayrı bir test</strong> üretir; raporda hangi payload'ın patladığı tek tek görünür: <code>test_x[admin' --]</code>.</p>`,
      en: `<p>If you assert inside a loop, the test stops at the first failing value and you never see the rest. <code>@pytest.mark.parametrize</code> generates <strong>a separate test</strong> per value; the report shows exactly which payload broke: <code>test_x[admin' --]</code>.</p>` },
    { t: "code", id: "c3", simulated: true, setup: SQ.shared.miniPytest,
      title: { tr: "Payload'larla parametrize", en: "Parametrize with payloads" },
      code: String.raw`
import html
import pytest

XSS_PAYLOADS = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "\"><svg onload=alert(1)>",
]


def render_search(q: str, secure: bool) -> str:
    shown = html.escape(q) if secure else q
    return f'<span id="search-term">{shown}</span>'


@pytest.mark.parametrize("payload", XSS_PAYLOADS)
def test_secure_mode_encodes(payload):
    assert payload not in render_search(payload, secure=True)


@pytest.mark.parametrize("payload", XSS_PAYLOADS)
def test_vulnerable_mode_reflects(payload):
    # güvenlik testi semantiği: zafiyet VARSA kırmızı / red when the vuln EXISTS
    assert payload not in render_search(payload, secure=False), "reflected XSS"


@pytest.mark.parametrize("status, expected_ok", [(200, True), (302, True), (500, False)])
def test_ok_flag(status, expected_ok):
    assert (status < 400) == expected_ok


run_tests()
` },
    { t: "h", tr: "Marker'lar: testleri etiketlemek", en: "Markers: tagging tests" },
    { t: "text",
      tr: `<p>Marker, teste yapıştırılan bir etikettir: <code>@pytest.mark.security</code>. Komut satırından <code>-m</code> ile seçim yaparsın. Bir dosyadaki tüm testlere aynı marker'ları vermek için modül seviyesinde <code>pytestmark = [...]</code> yazılır. Kendi marker'larını <code>pyproject.toml</code>'da kaydetmelisin; SecureQA <code>--strict-markers</code> kullandığı için yanlış yazılmış bir marker (<code>@pytest.mark.securty</code>) hata verir — yazım hatasına karşı güzel bir sigorta.</p>`,
      en: `<p>A marker is a label stuck on a test: <code>@pytest.mark.security</code>. You select with <code>-m</code> on the command line. To give the same markers to all tests in a file, write <code>pytestmark = [...]</code> at module level. Register your own markers in <code>pyproject.toml</code>; because SecureQA uses <code>--strict-markers</code>, a misspelled marker (<code>@pytest.mark.securty</code>) is an error — nice insurance against typos.</p>` },
    { t: "code", id: "c4", simulated: true, setup: SQ.shared.miniPytest,
      title: { tr: "-m ile seçim", en: "Selecting with -m" },
      code: String.raw`
import pytest


@pytest.mark.functional
def test_search_finds_coffee():
    assert "kahve" in "türk kahvesi"


@pytest.mark.security
@pytest.mark.owasp_a03
def test_no_sql_error_on_quote():
    body = "sqlite3.OperationalError: unrecognized token"
    assert "OperationalError" not in body, "SQL error leaked"


@pytest.mark.security
@pytest.mark.owasp_a05
def test_csp_header_present():
    headers = {"Content-Type": "text/html"}
    assert "Content-Security-Policy" in headers, "CSP missing"


print("pytest -m security")
run_tests(marker="security")
print()
print("pytest -m functional")
run_tests(marker="functional")
` },
    { t: "callout", kind: "sec",
      tr: `<p>SecureQA'daki <strong>anlam kuralı</strong>: bir güvenlik testi, zafiyet <strong>varsa</strong> FAIL olur. Böylece <code>--mode vulnerable</code> ile çalıştırınca çok sayıda kırmızı, <code>--mode secure</code> ile çalıştırınca hepsi yeşil görürsün. Kırmızı test = bulunan açık = rapordaki bir <code>Finding</code>.</p>`,
      en: `<p>SecureQA's <strong>semantics rule</strong>: a security test FAILS when the vulnerability <strong>is present</strong>. So running with <code>--mode vulnerable</code> shows lots of red, and <code>--mode secure</code> shows all green. Red test = vulnerability found = a <code>Finding</code> in the report.</p>` },
    { t: "project", file: "tests/security/test_injection_sqli.py",
      tr: `<p>Gerçek bir SecureQA güvenlik testi. Fixture'lar (<code>api</code>, <code>base_url</code>, <code>record_finding</code>) parametre adıyla geliyor, marker'lar <code>pytestmark</code> ile dosya seviyesinde veriliyor, test zafiyet bulursa önce bulguyu kaydedip sonra <code>assert</code> ile kırmızıya dönüyor.</p>`,
      en: `<p>A real SecureQA security test. Fixtures (<code>api</code>, <code>base_url</code>, <code>record_finding</code>) arrive by parameter name, markers are set at file level with <code>pytestmark</code>, and when the test finds the vulnerability it records the finding first, then turns red via <code>assert</code>.</p>`,
      code: String.raw`
from urllib.parse import quote

import pytest

from secureqa import catalog
from secureqa.security import sqli
from secureqa.security.payloads import SQLI_PROBE

pytestmark = [pytest.mark.security, pytest.mark.owasp_a03]


def test_sqli_in_product_search(api, base_url, record_finding) -> None:
    """The HTML search (/products?q=) must not be injectable."""
    url = f"{base_url}/products?q={quote(SQLI_PROBE)}"
    vulnerable, evidence = sqli.probe_error_based(api, url)
    if vulnerable:
        record_finding(catalog.SQLI_SEARCH.finding(url=url, evidence=evidence))
    assert not vulnerable, "SQL injection in product search (error leaked)."
`,
      notes: [
        { line: 9, tr: "Bu dosyadaki tüm testler <code>security</code> ve <code>owasp_a03</code> marker'larını alır.", en: "Every test in this file gets the <code>security</code> and <code>owasp_a03</code> markers." },
        { line: 12, tr: "Üç fixture isimle enjekte ediliyor (10. ders).", en: "Three fixtures injected by name (lesson 10)." },
        { line: 14, tr: "<code>SQLI_PROBE</code> = tek tırnak <code>'</code>; <code>quote()</code> ile URL'ye güvenle konuyor.", en: "<code>SQLI_PROBE</code> = a single quote <code>'</code>; put safely in the URL with <code>quote()</code>." },
        { line: 15, tr: "Fonksiyon bir tuple döndürüyor ve açılıyor: <code>(bool, str)</code>.", en: "The function returns a tuple that is unpacked: <code>(bool, str)</code>." },
        { line: 18, tr: "Zafiyet varsa test FAIL → kırmızı. Mesaj, raporda okunacak cümle.", en: "If vulnerable the test FAILS → red. The message is the sentence shown in the report." }
      ] }
  ],
  exercises: [
    { id: "11-e1",
      title: { tr: "Fonksiyonu test et", en: "Test a function" },
      setup: SQ.shared.miniPytest + "\n" + String.raw`
def classify(status: int) -> str:
    if status < 300:
        return "ok"
    if status < 400:
        return "redirect"
    if status < 500:
        return "client_error"
    return "server_error"
`,
      prompt: {
        tr: `<p>Hazır bir <code>classify(status)</code> fonksiyonu var (4. dersteki sınıflandırma). Onun için iki test yaz:</p><ul><li><code>test_classify_ok</code>: <code>classify(200)</code> → <code>"ok"</code></li><li><code>test_classify_server_error</code>: <code>classify(503)</code> → <code>"server_error"</code></li></ul><p>Bir de <code>@pytest.mark.parametrize("status, expected", [...])</code> ile en az 4 durumu kontrol eden <code>test_classify_many</code> yaz. Sonda <code>run_tests()</code> çağır; hepsi PASSED olmalı.</p>`,
        en: `<p>A <code>classify(status)</code> function is ready (the classification from lesson 4). Write two tests for it:</p><ul><li><code>test_classify_ok</code>: <code>classify(200)</code> → <code>"ok"</code></li><li><code>test_classify_server_error</code>: <code>classify(503)</code> → <code>"server_error"</code></li></ul><p>Also write <code>test_classify_many</code> with <code>@pytest.mark.parametrize("status, expected", [...])</code> checking at least 4 cases. Call <code>run_tests()</code> at the end; all must PASS.</p>`
      },
      starter: String.raw`
import pytest


def test_classify_ok():
    ...


run_tests()
`,
      solution: String.raw`
import pytest


def test_classify_ok():
    assert classify(200) == "ok"


def test_classify_server_error():
    assert classify(503) == "server_error"


@pytest.mark.parametrize("status, expected", [
    (201, "ok"),
    (302, "redirect"),
    (404, "client_error"),
    (500, "server_error"),
])
def test_classify_many(status, expected):
    assert classify(status) == expected


run_tests()
`,
      check: String.raw`
for _n in ("test_classify_ok", "test_classify_server_error", "test_classify_many"):
    assert callable(globals().get(_n)), _t(f"{_n} adında bir test fonksiyonu yaz.", f"Write a test function named {_n}.")
_pm = [m for m in _marks(test_classify_many) if m.name == "parametrize"]
assert _pm, _t("test_classify_many @pytest.mark.parametrize kullanmalı.", "test_classify_many must use @pytest.mark.parametrize.")
assert len(_pm[0].args[1]) >= 4, _t("parametrize en az 4 durum içermeli.", "parametrize must contain at least 4 cases.")
_real = classify
def classify(status):
    return "ok"
globals()["classify"] = classify
_r = run_tests(verbose=False)
globals()["classify"] = _real
assert _r["failed"] >= 1, _t("Testlerin bozuk bir classify()'ı yakalamıyor — gerçekten assert ediyor musun?", "Your tests don't catch a broken classify() — are you really asserting?")
_r2 = run_tests(verbose=False)
assert _r2["failed"] == 0 and _r2["passed"] >= 6, _t(f"Doğru classify ile tüm testler geçmeli: {_r2}", f"With the correct classify all tests must pass: {_r2}")
`,
      hints: [
        { tr: "Test gövdesi tek satır olabilir: <code>assert classify(200) == \"ok\"</code>", en: "The test body can be one line: <code>assert classify(200) == \"ok\"</code>" },
        { tr: "Parametrize listesi tuple'lardan oluşur: <code>[(201, \"ok\"), (302, \"redirect\"), ...]</code> ve fonksiyon <code>(status, expected)</code> parametrelerini alır.", en: "The parametrize list holds tuples: <code>[(201, \"ok\"), (302, \"redirect\"), ...]</code> and the function takes <code>(status, expected)</code>." }
      ] },
    { id: "11-e2",
      title: { tr: "Marker ve pytest.raises", en: "Markers and pytest.raises" },
      setup: SQ.shared.miniPytest + "\n" + String.raw`
SEVERITIES = ("critical", "high", "medium", "low", "info")


def normalize_severity(value: str) -> str:
    value = value.strip().lower()
    if value not in SEVERITIES:
        raise ValueError(f"Unknown severity {value!r}")
    return value
`,
      prompt: {
        tr: `<p><code>normalize_severity()</code> hazır: geçersiz değerde <code>ValueError</code> fırlatıyor. İki test yaz ve ikisini de <code>@pytest.mark.unit</code> ile işaretle:</p><ul><li><code>test_normalizes_case</code>: <code>normalize_severity(" HIGH ")</code> → <code>"high"</code></li><li><code>test_rejects_unknown</code>: <code>pytest.raises(ValueError)</code> ile <code>normalize_severity("urgent")</code> çağrısının hata verdiğini doğrula</li></ul><p>Sonra yalnızca bu marker'ı çalıştır: <code>run_tests(marker="unit")</code>.</p>`,
        en: `<p><code>normalize_severity()</code> is ready: it raises <code>ValueError</code> for invalid values. Write two tests and mark both with <code>@pytest.mark.unit</code>:</p><ul><li><code>test_normalizes_case</code>: <code>normalize_severity(" HIGH ")</code> → <code>"high"</code></li><li><code>test_rejects_unknown</code>: verify with <code>pytest.raises(ValueError)</code> that <code>normalize_severity("urgent")</code> raises</li></ul><p>Then run only that marker: <code>run_tests(marker="unit")</code>.</p>`
      },
      starter: String.raw`
import pytest


def test_normalizes_case():
    assert normalize_severity(" HIGH ") == "high"


def test_rejects_unknown():
    normalize_severity("urgent")


run_tests(marker="unit")
`,
      solution: String.raw`
import pytest


@pytest.mark.unit
def test_normalizes_case():
    assert normalize_severity(" HIGH ") == "high"


@pytest.mark.unit
def test_rejects_unknown():
    with pytest.raises(ValueError):
        normalize_severity("urgent")


run_tests(marker="unit")
`,
      check: String.raw`
for _n in ("test_normalizes_case", "test_rejects_unknown"):
    _f = globals().get(_n)
    assert callable(_f), _t(f"{_n} testi bulunamadı.", f"Test {_n} not found.")
    assert "unit" in [m.name for m in _marks(_f)], _t(f"{_n} @pytest.mark.unit ile işaretlenmeli.", f"{_n} must be marked with @pytest.mark.unit.")
_r = run_tests(marker="unit", verbose=False)
assert _r["passed"] == 2 and _r["failed"] == 0, _t(f"İki unit testi de geçmeli: {_r}. pytest.raises bloğunu kullandın mı?", f"Both unit tests must pass: {_r}. Did you use a pytest.raises block?")
_real = normalize_severity
globals()["normalize_severity"] = lambda v: v.strip().lower()
_r2 = run_tests(marker="unit", verbose=False)
globals()["normalize_severity"] = _real
assert _r2["failed"] >= 1, _t("Hata fırlatmayan bir fonksiyonda test_rejects_unknown FAIL olmalı (DID NOT RAISE).", "With a function that doesn't raise, test_rejects_unknown must FAIL (DID NOT RAISE).")
`,
      hints: [
        { tr: "Marker: test fonksiyonunun hemen üstüne <code>@pytest.mark.unit</code>.", en: "Marker: put <code>@pytest.mark.unit</code> right above the test function." },
        { tr: "<code>with pytest.raises(ValueError):</code> bloğunun içinde <code>normalize_severity(\"urgent\")</code> çağır.", en: "Call <code>normalize_severity(\"urgent\")</code> inside a <code>with pytest.raises(ValueError):</code> block." }
      ] }
  ],
  quiz: [
    { q: { tr: "pytest hangi fonksiyonu test olarak toplar?", en: "Which function does pytest collect as a test?" },
      options: [{ tr: "<code>def check_login():</code>", en: "<code>def check_login():</code>" }, { tr: "<code>def login_test():</code>", en: "<code>def login_test():</code>" }, { tr: "<code>def test_login():</code>", en: "<code>def test_login():</code>" }],
      answer: 2, explain: { tr: "Varsayılan kural: <code>test_</code> ile başlayan fonksiyonlar (<code>python_functions = [\"test_*\"]</code>).", en: "Default rule: functions starting with <code>test_</code> (<code>python_functions = [\"test_*\"]</code>)." } },
    { q: { tr: "Sadece güvenlik testlerini çalıştırmak için?", en: "To run only the security tests?" },
      options: [{ tr: "<code>pytest -m security</code>", en: "<code>pytest -m security</code>" }, { tr: "<code>pytest -k security_only</code>", en: "<code>pytest -k security_only</code>" }, { tr: "<code>pytest --security</code>", en: "<code>pytest --security</code>" }],
      answer: 0, explain: { tr: "<code>-m</code> marker ifadesiyle seçer; <code>-k</code> test adıyla.", en: "<code>-m</code> selects by marker expression; <code>-k</code> by test name." } },
    { q: { tr: "Bir payload listesini döngüyle değil de <code>parametrize</code> ile test etmenin avantajı?", en: "Advantage of testing a payload list with <code>parametrize</code> instead of a loop?" },
      options: [{ tr: "Daha az bellek kullanır", en: "Uses less memory" }, { tr: "Her payload ayrı bir test olur; biri patlasa da diğerleri çalışır ve raporda görünür", en: "Each payload is its own test; one failure doesn't hide the others and each shows in the report" }, { tr: "Marker gerektirmez", en: "It needs no markers" }],
      answer: 1, explain: { tr: "Raporda <code>test_x[payload]</code> şeklinde tek tek görürsün.", en: "You see each one in the report as <code>test_x[payload]</code>." } }
  ]
});
