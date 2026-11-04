SQ.addLesson({
  id: "17-pytest-raises",
  num: 17,
  icon: "raise",
  minutes: 30,
  title: { tr: "pytest ileri 2: raises & monkeypatch", en: "pytest advanced 2: raises & monkeypatch" },
  summary: {
    tr: "pytest.raises (match, .value), assert introspection, monkeypatch fikri ve fixture kompozisyonunun derinleşmesi.",
    en: "pytest.raises (match, .value), assert introspection, the monkeypatch idea, and deeper fixture composition."
  },
  goals: {
    tr: [
      "<code>pytest.raises</code> ile hata beklemek, <code>match=</code> ve <code>exc.value</code>",
      "Assert introspection: düz <code>assert</code> neden iki tarafı da gösterir",
      "<code>monkeypatch</code> fikri: bir bağımlılığı testte geçici değiştirip sonra geri koymak",
      "Fixture kompozisyonu: küçük fixture'lardan büyük nesne kurmak"
    ],
    en: [
      "Expecting errors with <code>pytest.raises</code>, plus <code>match=</code> and <code>exc.value</code>",
      "Assert introspection: why a plain <code>assert</code> shows both sides",
      "The <code>monkeypatch</code> idea: temporarily replace a dependency in a test, then restore it",
      "Fixture composition: building a big object from small fixtures"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>11. derste <code>pytest.raises</code>'e kısaca değindik. Güvenlik ve doğrulama kodunda <strong>bir fonksiyonun doğru durumda hata fırlatması</strong> çoğu zaman en önemli davranıştır: kötü girdi reddedilmeli. Bu derste hatanın sadece fırlatıldığını değil, <strong>doğru hata ve doğru mesaj</strong> olduğunu da doğrulamayı; testi yavaş/dış bağımlılıklardan kurtaran <code>monkeypatch</code> fikrini; ve fixture'ları iç içe geçirmeyi öğreniyoruz.</p>`,
      en: `<p>We touched on <code>pytest.raises</code> in lesson 11. In security and validation code, <strong>a function raising at the right moment</strong> is often the most important behaviour: bad input must be rejected. This lesson shows how to assert not just that it raised, but that it raised the <strong>right error with the right message</strong>; the <code>monkeypatch</code> idea that frees a test from slow/external dependencies; and nesting fixtures.</p>` },
    { t: "callout", kind: "info", title: { tr: "Simülasyon hakkında", en: "About the simulation" },
      tr: `<p>Düzenlenebilir hücreler yine API'si gerçeğiyle aynı olan <strong>mini-pytest</strong>'i kullanır. <code>pytest.raises(Exc, match="...")</code> ve <code>with ... as exc: exc.value</code> gerçekteki gibi çalışır; hücre sonundaki <code>run_tests()</code> <code>pytest</code>'in yerini tutar.</p>`,
      en: `<p>The editable cells again use <strong>mini-pytest</strong>, whose API matches the real thing. <code>pytest.raises(Exc, match="...")</code> and <code>with ... as exc: exc.value</code> behave like the real ones; <code>run_tests()</code> at the end stands in for <code>pytest</code>.</p>` },
    { t: "h", tr: "pytest.raises: match ve .value", en: "pytest.raises: match and .value" },
    { t: "text",
      tr: `<p><code>with pytest.raises(ValueError):</code> bloğu, içindeki kod <code>ValueError</code> fırlatmazsa testi <strong>DID NOT RAISE</strong> ile başarısız yapar. <code>match="regex"</code> ile mesajın belli bir deseni içerdiğini; <code>as exc</code> ile de yakalanan istisnayı (<code>exc.value</code>) inceleyebilirsin. Böylece "yanlış severity kabul edilmesin" gibi bir savunmayı tam olarak test edersin.</p>`,
      en: `<p>A <code>with pytest.raises(ValueError):</code> block fails the test with <strong>DID NOT RAISE</strong> if the code inside does not raise a <code>ValueError</code>. With <code>match="regex"</code> you assert the message contains a pattern; with <code>as exc</code> you inspect the caught exception (<code>exc.value</code>). This lets you test a defense like "a wrong severity must be rejected" precisely.</p>` },
    { t: "code", id: "c1", simulated: true, setup: SQ.shared.miniPytest,
      title: { tr: "Hata, mesaj ve değer", en: "Error, message and value" },
      code: String.raw`
import pytest

SEVERITIES = ("critical", "high", "medium", "low", "info")


def normalize_severity(value: str) -> str:
    v = value.strip().lower()
    if v not in SEVERITIES:
        raise ValueError(f"Unknown severity {value!r}; use one of {SEVERITIES}")
    return v


def test_rejects_unknown():
    with pytest.raises(ValueError):
        normalize_severity("urgent")


def test_message_matches():
    with pytest.raises(ValueError, match=r"Unknown severity"):
        normalize_severity("urgent")


def test_can_inspect_exception():
    with pytest.raises(ValueError) as exc:
        normalize_severity("urgent")
    assert "urgent" in str(exc.value)     # yakalanan istisnayı incele


run_tests()
` },
    { t: "h", tr: "Assert introspection", en: "Assert introspection" },
    { t: "text",
      tr: `<p>unittest'teki <code>assertEqual(a, b)</code>'nin aksine pytest düz <code>assert a == b</code> yazmanı ister ve test başarısız olduğunda ifadeyi <strong>parçalayıp</strong> her iki tarafın değerini gösterir (assert introspection). Aşağıdaki hücrede ilk test geçer, ikincisi <em>kasıtlı</em> hatalıdır — çıktıda başarısız olan satırı gör.</p>`,
      en: `<p>Unlike unittest's <code>assertEqual(a, b)</code>, pytest wants a plain <code>assert a == b</code> and, when it fails, <strong>rewrites</strong> the expression to show the value of both sides (assert introspection). In the cell below the first test passes and the second is <em>deliberately</em> wrong — see the failing line in the output.</p>` },
    { t: "code", id: "c2", simulated: true, setup: SQ.shared.miniPytest,
      title: { tr: "Başarısız assert neyi gösterir", en: "What a failing assert shows" },
      code: String.raw`
import pytest


def owasp_code(owasp: str) -> str:
    return owasp.split("-")[0]           # "A03:2021-Injection" -> "A03:2021"


def test_owasp_code_ok():
    assert owasp_code("A03:2021-Injection") == "A03:2021"


def test_owasp_code_wrong_on_purpose():
    # kasıtlı hata: raporda hangi satırın patladığını görürsün
    assert owasp_code("A03:2021-Injection") == "A03:2021-Injection"


run_tests()
` },
    { t: "h", tr: "monkeypatch fikri", en: "The monkeypatch idea" },
    { t: "text",
      tr: `<p>Bir fonksiyon <em>dış</em> bir şeye bağlıysa (saat, ağ, dosya) testi hem yavaş hem kırılgan olur. <code>monkeypatch</code> bu bağımlılığı test boyunca geçici olarak sahtesiyle değiştirir ve test bitince <strong>otomatik geri koyar</strong>. Aşağıda bu fikri elle (değiştir → <code>try/finally</code> ile geri koy) gösteriyoruz; gerçek pytest'te bunu <code>monkeypatch</code> fixture'ı senin için yapar.</p>`,
      en: `<p>If a function depends on something <em>external</em> (clock, network, files) the test becomes slow and brittle. <code>monkeypatch</code> temporarily replaces that dependency with a fake for the duration of the test and <strong>restores it automatically</strong> afterwards. Below we show the idea by hand (replace → restore with <code>try/finally</code>); real pytest does this for you with the <code>monkeypatch</code> fixture.</p>` },
    { t: "code", id: "c3", simulated: true,
      title: { tr: "Elle monkeypatch: sahte saat", en: "Monkeypatch by hand: a fake clock" },
      code: String.raw`
import time


def is_fresh(created_at: float, max_age_s: float) -> bool:
    """created_at'tan bu yana max_age_s saniyeden az geçtiyse True."""
    return (time.monotonic() - created_at) < max_age_s


# Dış bağımlılık: time.monotonic. Testte geçici olarak değiştiriyoruz.
fake_now = [1000.0]
real_monotonic = time.monotonic
time.monotonic = lambda: fake_now[0]        # DEĞİŞTİR / replace
try:
    print("taze mi (yeni)?", is_fresh(created_at=999.0, max_age_s=5))   # 1 sn geçti -> True
    fake_now[0] = 2000.0                     # saati ileri sar
    print("taze mi (eski)?", is_fresh(created_at=999.0, max_age_s=5))   # 1001 sn -> False
finally:
    time.monotonic = real_monotonic          # GERİ KOY / restore (her zaman!)

print("gerçek saat geri geldi:", time.monotonic() > 0)
` },
    { t: "code", id: "c4", readonly: true, real: true, file: "examples/test_with_monkeypatch.py",
      title: { tr: "Gerçek pytest: monkeypatch + raises", en: "Real pytest: monkeypatch + raises" },
      code: String.raw`
import pytest

from secureqa.findings import Finding
from secureqa.juiceshop import JuiceShopClient


def test_unknown_severity_is_rejected():
    # Finding.__post_init__ geçersiz severity'de ValueError fırlatır.
    with pytest.raises(ValueError, match="Unknown severity"):
        Finding(id="X", title_tr="t", title_en="t", severity="urgent",
                owasp="A03:2021-Injection", cwe="CWE-79", url="http://x",
                evidence="e", remediation_tr="r", remediation_en="r")


def test_is_reachable_without_network(monkeypatch):
    # Ağ çağrısını sahteleyip is_reachable'ı ağsız test et.
    client = JuiceShopClient("http://127.0.0.1:3000")

    class _FakeResp:
        ok = True

    monkeypatch.setattr(client.session, "get", lambda *a, **k: _FakeResp())
    assert client.is_reachable() is True
` },
    { t: "project", file: "tests/conftest.py (juice) + secureqa/findings.py",
      tr: `<p>Gerçek projede <code>juice</code> fixture'ı iki şeyi gösterir: <strong>kompozisyon</strong> (<code>juice_shop_url</code> fixture'ına bağlanır) ve <strong>koşullu atlama</strong> (<code>pytest.skip</code>): Juice Shop çalışmıyorsa test kırmızı değil, atlanmış (skipped) olur. <code>Finding.__post_init__</code> ise <code>pytest.raises</code> ile test edeceğin tipik savunmadır: geçersiz severity rapora hiç giremez.</p>`,
      en: `<p>In the real project the <code>juice</code> fixture shows two things: <strong>composition</strong> (it depends on the <code>juice_shop_url</code> fixture) and <strong>conditional skipping</strong> (<code>pytest.skip</code>): if Juice Shop is not running the test is skipped, not red. <code>Finding.__post_init__</code> is the kind of defense you would test with <code>pytest.raises</code>: an invalid severity never reaches the report.</p>`,
      code: String.raw`
@pytest.fixture()
def juice(juice_shop_url: str | None) -> Iterator[JuiceShopClient]:
    """A JuiceShopClient, or SKIP the test when Juice Shop is not reachable."""
    url = juice_shop_url or DEFAULT_JUICE_SHOP_URL
    client = JuiceShopClient(url)
    if juice_shop_url is None and not client.is_reachable():
        pytest.skip("Juice Shop is not running. Set JUICE_SHOP_URL to enable these tests.")
    if not client.is_reachable():
        pytest.skip(f"Juice Shop not reachable at {url}.")
    yield client


# secureqa/findings.py
def __post_init__(self) -> None:
    self.severity = self.severity.lower()
    if self.severity not in SEVERITIES:
        raise ValueError(f"Unknown severity {self.severity!r}; use one of {SEVERITIES}")
`,
      notes: [
        { line: 2, tr: "Kompozisyon: <code>juice</code>, <code>juice_shop_url</code> fixture'ını parametre olarak alır.", en: "Composition: <code>juice</code> takes the <code>juice_shop_url</code> fixture as a parameter." },
        { line: 7, tr: "<code>pytest.skip</code>: ortam uygun değilse test FAIL değil SKIPPED olur (CI yeşil kalır).", en: "<code>pytest.skip</code>: when the environment is not suitable the test is SKIPPED, not FAILED (CI stays green)." },
        { line: 10, tr: "<code>yield client</code>: teardown gerekmez ama yine de yield fixture — bir sonraki derste context yönetimiyle birleşir.", en: "<code>yield client</code>: no teardown needed but still a yield fixture — it composes with context management." },
        { line: 17, tr: "Bu satır <code>with pytest.raises(ValueError, match=\"Unknown severity\"):</code> ile test edilir.", en: "This line is tested with <code>with pytest.raises(ValueError, match=\"Unknown severity\"):</code>." }
      ] }
  ],
  exercises: [
    { id: "17-e1",
      title: { tr: "raises + match + value", en: "raises + match + value" },
      setup: SQ.shared.miniPytest + "\n" + String.raw`
def require_https(url: str) -> str:
    if not url.startswith("https://"):
        raise ValueError(f"insecure URL: {url}")
    return url
`,
      prompt: {
        tr: `<p><code>require_https(url)</code> hazır: <code>https://</code> ile başlamayan URL'de <code>ValueError("insecure URL: ...")</code> fırlatır. Üç test yaz:</p><ul><li><code>test_allows_https</code>: <code>require_https("https://x")</code> → <code>"https://x"</code></li><li><code>test_rejects_http</code>: <code>pytest.raises(ValueError, match="insecure")</code> bloğunda <code>require_https("http://x")</code></li><li><code>test_value_contains_url</code>: <code>as exc</code> ile yakala ve <code>"http://x"</code>'in <code>str(exc.value)</code> içinde olduğunu doğrula</li></ul><p>Sonda <code>run_tests()</code>. Hepsi geçmeli.</p>`,
        en: `<p><code>require_https(url)</code> is ready: it raises <code>ValueError("insecure URL: ...")</code> for a URL not starting with <code>https://</code>. Write three tests:</p><ul><li><code>test_allows_https</code>: <code>require_https("https://x")</code> → <code>"https://x"</code></li><li><code>test_rejects_http</code>: inside <code>pytest.raises(ValueError, match="insecure")</code> call <code>require_https("http://x")</code></li><li><code>test_value_contains_url</code>: capture with <code>as exc</code> and assert <code>"http://x"</code> is in <code>str(exc.value)</code></li></ul><p>Call <code>run_tests()</code> at the end. All must pass.</p>`
      },
      starter: String.raw`
import pytest


def test_allows_https():
    ...


def test_rejects_http():
    ...


def test_value_contains_url():
    ...


run_tests()
`,
      solution: String.raw`
import pytest


def test_allows_https():
    assert require_https("https://x") == "https://x"


def test_rejects_http():
    with pytest.raises(ValueError, match="insecure"):
        require_https("http://x")


def test_value_contains_url():
    with pytest.raises(ValueError) as exc:
        require_https("http://x")
    assert "http://x" in str(exc.value)


run_tests()
`,
      check: String.raw`
for _n in ("test_allows_https", "test_rejects_http", "test_value_contains_url"):
    assert callable(globals().get(_n)), _t(f"{_n} adında bir test yaz.", f"Write a test named {_n}.")
_r = run_tests(verbose=False)
assert _r["passed"] == 3 and _r["failed"] == 0, _t(f"Üç test de geçmeli: {_r}. pytest.raises bloğunu ve exc.value'yu kullandın mı?", f"All three tests must pass: {_r}. Did you use the pytest.raises block and exc.value?")
_real = require_https
globals()["require_https"] = lambda url: url      # artık hiç fırlatmıyor
_r2 = run_tests(verbose=False)
globals()["require_https"] = _real
assert _r2["failed"] >= 1, _t("Hata fırlatmayan bir fonksiyonla test_rejects_http FAIL olmalı (DID NOT RAISE).", "With a function that never raises, test_rejects_http must FAIL (DID NOT RAISE).")
`,
      hints: [
        { tr: "<code>with pytest.raises(ValueError, match=\"insecure\"):</code> bloğunun içinde çağrıyı yap.", en: "Put the call inside a <code>with pytest.raises(ValueError, match=\"insecure\"):</code> block." },
        { tr: "Değeri incelemek için <code>with pytest.raises(ValueError) as exc:</code> ve sonra <code>str(exc.value)</code>.", en: "To inspect the value use <code>with pytest.raises(ValueError) as exc:</code> then <code>str(exc.value)</code>." }
      ] },
    { id: "17-e2",
      title: { tr: "Fixture kompozisyonu", en: "Fixture composition" },
      setup: SQ.shared.miniPytest,
      prompt: {
        tr: `<p>Üç fixture ve bir test yaz:</p><ul><li><code>base_url</code> → <code>"http://127.0.0.1:5000"</code> döndürür</li><li><code>token</code> → <code>"abc123"</code> döndürür</li><li><code>client</code> → <code>base_url</code> ve <code>token</code>'ı parametre alır, <code>{"base_url": base_url, "token": token}</code> döndürür (kompozisyon)</li><li><code>test_client_is_composed(client)</code>: <code>client["base_url"]</code> ve <code>client["token"]</code> doğru mu?</li></ul><p>Sonda <code>run_tests()</code>.</p>`,
        en: `<p>Write three fixtures and a test:</p><ul><li><code>base_url</code> → returns <code>"http://127.0.0.1:5000"</code></li><li><code>token</code> → returns <code>"abc123"</code></li><li><code>client</code> → takes <code>base_url</code> and <code>token</code> as parameters, returns <code>{"base_url": base_url, "token": token}</code> (composition)</li><li><code>test_client_is_composed(client)</code>: are <code>client["base_url"]</code> and <code>client["token"]</code> correct?</li></ul><p>Call <code>run_tests()</code> at the end.</p>`
      },
      starter: String.raw`
import pytest


@pytest.fixture
def base_url():
    ...


# token ve client fixture'larını, sonra testi yaz


run_tests()
`,
      solution: String.raw`
import pytest


@pytest.fixture
def base_url():
    return "http://127.0.0.1:5000"


@pytest.fixture
def token():
    return "abc123"


@pytest.fixture
def client(base_url, token):
    return {"base_url": base_url, "token": token}


def test_client_is_composed(client):
    assert client["base_url"] == "http://127.0.0.1:5000"
    assert client["token"] == "abc123"


run_tests()
`,
      check: String.raw`
import inspect as _inspect
for _n in ("base_url", "token", "client"):
    assert _n in _FIXTURES, _t(f"{_n} adında bir fixture tanımla.", f"Define a fixture named {_n}.")
_params = list(_inspect.signature(_FIXTURES["client"]).parameters)
assert "base_url" in _params and "token" in _params, _t(f"client fixture'ı base_url ve token'ı parametre olarak almalı (kompozisyon); şu an {_params}.", f"The client fixture must take base_url and token as parameters (composition); got {_params}.")
assert callable(globals().get("test_client_is_composed")), _t("test_client_is_composed testini yaz.", "Write the test_client_is_composed test.")
_r = run_tests(verbose=False)
assert _r["passed"] >= 1 and _r["failed"] == 0, _t(f"Test geçmeli: {_r}", f"The test must pass: {_r}")
`,
      hints: [
        { tr: "Her fixture <code>@pytest.fixture</code> ile işaretlenir ve bir değer <code>return</code> eder.", en: "Each fixture is marked with <code>@pytest.fixture</code> and <code>return</code>s a value." },
        { tr: "Kompozisyon: <code>def client(base_url, token):</code> — pytest ikisini de otomatik enjekte eder.", en: "Composition: <code>def client(base_url, token):</code> — pytest injects both automatically." }
      ] }
  ],
  quiz: [
    { q: { tr: "<code>with pytest.raises(ValueError):</code> bloğundaki kod hata fırlatmazsa ne olur?", en: "What happens if the code in a <code>with pytest.raises(ValueError):</code> block does not raise?" },
      options: [{ tr: "Test geçer", en: "The test passes" }, { tr: "Test <strong>DID NOT RAISE</strong> ile başarısız olur", en: "The test fails with <strong>DID NOT RAISE</strong>" }, { tr: "Blok atlanır", en: "The block is skipped" }],
      answer: 1, explain: { tr: "Beklenen hata gelmezse pytest testi açıkça başarısız yapar.", en: "If the expected error doesn't come, pytest fails the test explicitly." } },
    { q: { tr: "<code>monkeypatch</code>'in en önemli özelliği nedir?", en: "What is the key property of <code>monkeypatch</code>?" },
      options: [{ tr: "Değişikliği test bitince otomatik geri alır", en: "It undoes the change automatically when the test ends" }, { tr: "Kodu daha hızlı derler", en: "It compiles code faster" }, { tr: "Testleri paralel çalıştırır", en: "It runs tests in parallel" }],
      answer: 0, explain: { tr: "Geçici değiştir, sonra güvenle geri koy — diğer testler etkilenmez.", en: "Temporarily replace, then restore safely — other tests are unaffected." } },
    { q: { tr: "pytest neden <code>assertEqual</code> yerine düz <code>assert</code> kullandırır?", en: "Why does pytest use a plain <code>assert</code> instead of <code>assertEqual</code>?" },
      options: [{ tr: "Daha az bellek için", en: "To use less memory" }, { tr: "Assert introspection ile başarısızlıkta iki tarafın değerini de gösterebildiği için", en: "Because assert introspection shows both sides' values on failure" }, { tr: "Zorunlu olduğu için", en: "Because it is required" }],
      answer: 1, explain: { tr: "pytest ifadeyi parçalayıp <code>assert a == b</code>'de a ve b'nin değerini raporlar.", en: "pytest rewrites the expression and reports a and b in <code>assert a == b</code>." } }
  ]
});
