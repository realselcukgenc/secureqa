SQ.addLesson({
  id: "08-exceptions",
  num: 8,
  icon: "try",
  minutes: 25,
  title: { tr: "Hatalar ve istisnalar", en: "Errors & exceptions" },
  summary: {
    tr: "try/except/else/finally, raise, kendi exception sınıfların ve flaky testler için “retry” kalıbı.",
    en: "try/except/else/finally, raise, your own exception classes and the “retry” pattern for flaky tests."
  },
  goals: {
    tr: [
      "Traceback okumak: hata tipi, mesaj ve satır numarası",
      "<code>try</code> / <code>except</code> / <code>else</code> / <code>finally</code> akışı",
      "<code>raise</code> ile hata fırlatmak ve kendi exception sınıfını yazmak",
      "<code>AssertionError</code>'ın testlerdeki rolü ve güvenlik açısından ayrıntılı hata mesajları"
    ],
    en: [
      "Reading a traceback: error type, message and line number",
      "The <code>try</code> / <code>except</code> / <code>else</code> / <code>finally</code> flow",
      "Raising errors with <code>raise</code> and writing your own exception class",
      "The role of <code>AssertionError</code> in tests and verbose errors from a security angle"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>Bir şey ters gittiğinde Python bir <strong>istisna</strong> (exception) fırlatır ve program durur. Ekranda gördüğün <strong>traceback</strong>, hatanın nereden geldiğini gösteren bir yığın izidir. En önemli kısım <strong>son satırdır</strong>: <code>HataTipi: mesaj</code>. Bu sitedeki hata kutusu sana tipi, satırı ve kısa bir açıklamayı gösteriyor.</p>`,
      en: `<p>When something goes wrong, Python raises an <strong>exception</strong> and the program stops. The <strong>traceback</strong> you see is a stack trace showing where the error came from. The most important part is <strong>the last line</strong>: <code>ErrorType: message</code>. The error box on this site shows you the type, the line and a short explanation.</p>` },
    { t: "code", id: "c1",
      title: { tr: "try / except", en: "try / except" },
      code: String.raw`
raw_values = ["200", "abc", "404", ""]

for raw in raw_values:
    try:
        status = int(raw)
    except ValueError as error:
        print(f"{raw!r} sayı değil / not a number -> {error}")
    else:
        print("Durum kodu / status:", status)      # sadece hata YOKSA / only if NO error
    finally:
        print("  (her durumda çalışır / always runs)")
` },
    { t: "callout", kind: "warn",
      tr: `<p>Çıplak <code>except:</code> veya <code>except Exception:</code> ile her hatayı yutma! Testlerde bu, gerçek hataları saklar ve testi “yeşil ama yanlış” yapar. Sadece <strong>beklediğin</strong> hatayı yakala (<code>ValueError</code>, <code>TimeoutError</code> …) ve yakaladığında ne yapacağını bil.</p>`,
      en: `<p>Don't swallow every error with a bare <code>except:</code> or <code>except Exception:</code>! In tests that hides real bugs and makes a test “green but wrong”. Catch only the error you <strong>expect</strong> (<code>ValueError</code>, <code>TimeoutError</code> …) and know what you'll do when you catch it.</p>` },
    { t: "h", tr: "Sık göreceğin hata tipleri", en: "Error types you'll often see" },
    { t: "text",
      tr: `<table><thead><tr><th>Tip</th><th>Ne zaman?</th></tr></thead><tbody>
<tr><td><code>NameError</code></td><td>Tanımsız isim (yazım hatası)</td></tr>
<tr><td><code>TypeError</code></td><td>Yanlış tip: <code>"a" + 1</code>, eksik argüman</td></tr>
<tr><td><code>ValueError</code></td><td>Tip doğru, değer yanlış: <code>int("abc")</code></td></tr>
<tr><td><code>KeyError</code> / <code>IndexError</code></td><td>Sözlükte olmayan anahtar / listenin dışında indeks</td></tr>
<tr><td><code>AttributeError</code></td><td>Nesnede olmayan metot: <code>None.click()</code></td></tr>
<tr><td><code>AssertionError</code></td><td><code>assert</code> başarısız: <strong>testin kırmızıya dönmesi</strong> budur</td></tr>
<tr><td><code>TimeoutError</code></td><td>Playwright: eleman zamanında bulunamadı</td></tr>
</tbody></table>`,
      en: `<table><thead><tr><th>Type</th><th>When?</th></tr></thead><tbody>
<tr><td><code>NameError</code></td><td>Undefined name (typo)</td></tr>
<tr><td><code>TypeError</code></td><td>Wrong type: <code>"a" + 1</code>, missing argument</td></tr>
<tr><td><code>ValueError</code></td><td>Right type, wrong value: <code>int("abc")</code></td></tr>
<tr><td><code>KeyError</code> / <code>IndexError</code></td><td>Missing dict key / index outside the list</td></tr>
<tr><td><code>AttributeError</code></td><td>Missing method on an object: <code>None.click()</code></td></tr>
<tr><td><code>AssertionError</code></td><td>A failed <code>assert</code>: this is <strong>what makes a test red</strong></td></tr>
<tr><td><code>TimeoutError</code></td><td>Playwright: element not found in time</td></tr>
</tbody></table>` },
    { t: "h", tr: "raise ve kendi exception sınıfın", en: "raise and your own exception class" },
    { t: "code", id: "c2",
      title: { tr: "Geçersiz veriyi erken reddet", en: "Reject bad data early" },
      code: String.raw`
SEVERITIES = ("critical", "high", "medium", "low", "info")


class InvalidSeverityError(ValueError):
    """Bilinmeyen önem derecesi. / Unknown severity."""


def normalize_severity(value: str) -> str:
    value = value.strip().lower()
    if value not in SEVERITIES:
        raise InvalidSeverityError(f"Unknown severity {value!r}; use one of {SEVERITIES}")
    return value


print(normalize_severity("  HIGH "))
try:
    normalize_severity("urgent")
except InvalidSeverityError as e:
    print("Yakalandı / caught:", type(e).__name__, "-", e)
    print("ValueError'dan mı türemiş?", isinstance(e, ValueError))
` },
    { t: "h", tr: "assert: testin kalbi", en: "assert: the heart of a test" },
    { t: "text",
      tr: `<p><code>assert koşul, "mesaj"</code> koşul yanlışsa <code>AssertionError("mesaj")</code> fırlatır. pytest bir testi “FAILED” saydığında aslında bu hatayı yakalamıştır. Mesajı her zaman yaz: rapordaki tek ipucu odur. Bu sitedeki alıştırmalar da gizli <code>assert</code>'lerle kontrol ediliyor!</p>`,
      en: `<p><code>assert condition, "message"</code> raises <code>AssertionError("message")</code> when the condition is false. When pytest marks a test “FAILED”, it actually caught this error. Always write the message: it's the only clue in the report. The exercises on this site are checked with hidden <code>assert</code>s too!</p>` },
    { t: "code", id: "c3",
      title: { tr: "Bir güvenlik testi gibi", en: "Like a security test" },
      code: String.raw`
response_text = "Traceback (most recent call last): ... sqlite3.OperationalError: unrecognized token"
vulnerable = "OperationalError" in response_text

try:
    assert not vulnerable, "SQL injection in login form (error leaked)."
    print("PASSED")
except AssertionError as failure:
    print("FAILED:", failure)
` },
    { t: "callout", kind: "sec",
      tr: `<p>Hata mesajları güvenlik açısından iki yönlüdür. Uygulama içeride exception'ı yakalamayıp kullanıcıya <strong>traceback gösterirse</strong> bu bir bilgi ifşası zafiyetidir (VulnShop'un <code>/debug</code> sayfası ve 500 hata sayfası gibi). SecureQA'nın SQLi kontrolü de tam olarak sızan <code>OperationalError</code> metnini arar: <em>error-based SQL injection</em>.</p>`,
      en: `<p>Error messages cut both ways in security. If the app doesn't catch an exception internally and <strong>shows the traceback</strong> to the user, that's an information disclosure vulnerability (like VulnShop's <code>/debug</code> page and 500 error page). SecureQA's SQLi check looks exactly for the leaked <code>OperationalError</code> text: <em>error-based SQL injection</em>.</p>` },
    { t: "code", id: "c4",
      title: { tr: "Kaynak temizliği: finally ve with", en: "Cleaning up: finally and with" },
      code: String.raw`
class FakeBrowser:
    def __init__(self):
        print("tarayıcı açıldı / browser opened")

    def goto(self, url):
        raise TimeoutError(f"Timeout 10000ms exceeded navigating to {url}")

    def close(self):
        print("tarayıcı kapandı / browser closed")


browser = FakeBrowser()
try:
    browser.goto("http://127.0.0.1:5000/slow")
except TimeoutError as e:
    print("Hata / error:", e)
finally:
    browser.close()        # hata olsa da olmasa da / with or without an error
` },
    { t: "project", file: "secureqa/findings.py",
      tr: `<p><code>Finding</code> nesnesi oluşturulurken önem derecesi kontrol ediliyor; yanlış bir değer sessizce rapora girmek yerine <strong>hemen</strong> <code>ValueError</code> fırlatıyor (“fail fast”). <code>conftest.py</code>'deki DB sıfırlama ise tam tersini yapıyor: o uç nokta yoksa testi bozmamak için <code>requests.RequestException</code>'ı bilerek yutuyor.</p>`,
      en: `<p>When a <code>Finding</code> is created its severity is validated; a wrong value raises <code>ValueError</code> <strong>immediately</strong> instead of silently entering the report (“fail fast”). The DB reset in <code>conftest.py</code> does the opposite: it deliberately swallows <code>requests.RequestException</code> so a missing endpoint doesn't break the test.</p>`,
      code: String.raw`
def __post_init__(self) -> None:
    """Validate the values right after the object is created."""
    self.severity = self.severity.lower()
    if self.severity not in SEVERITIES:
        raise ValueError(f"Unknown severity {self.severity!r}; use one of {SEVERITIES}")


# tests/conftest.py
@pytest.fixture(scope="function", autouse=True)
def _reset_db(base_url: str) -> None:
    """Reset the demo app database before every test (best effort)."""
    try:
        requests.post(base_url + "/__reset", timeout=5)
    except requests.RequestException:
        pass
`,
      notes: [
        { line: 4, tr: "Geçersiz değer kontrolü — bu dersteki <code>normalize_severity</code> ile aynı fikir.", en: "Invalid value check — same idea as this lesson's <code>normalize_severity</code>." },
        { line: 5, tr: "<code>!r</code> değeri tırnaklarıyla gösterir: <code>Unknown severity 'urgent'</code>.", en: "<code>!r</code> shows the value with quotes: <code>Unknown severity 'urgent'</code>." },
        { line: 14, tr: "Bilinçli olarak yutulan, <strong>dar</strong> bir hata tipi. Yorum (docstring) nedenini açıklıyor: “best effort”.", en: "A deliberately swallowed, <strong>narrow</strong> error type. The docstring explains why: “best effort”." }
      ] }
  ],
  exercises: [
    { id: "08-e1",
      title: { tr: "safe_int", en: "safe_int" },
      prompt: {
        tr: `<p><code>safe_int(text: str, default: int = 0) -&gt; int</code> yaz: metni <code>int</code>'e çevirsin; çevrilemiyorsa (<code>ValueError</code>) <code>default</code> döndürsün. <code>None</code> gelirse <code>int(None)</code> bir <code>TypeError</code> verir — onu da yakala.</p>`,
        en: `<p>Write <code>safe_int(text: str, default: int = 0) -&gt; int</code>: convert the text to <code>int</code>; if it can't (<code>ValueError</code>), return <code>default</code>. If <code>None</code> is passed, <code>int(None)</code> raises <code>TypeError</code> — catch that too.</p>`
      },
      starter: String.raw`
def safe_int(text, default=0):
    return int(text)


print(safe_int("42"), safe_int("abc"), safe_int(None, -1))
`,
      solution: String.raw`
def safe_int(text, default=0):
    try:
        return int(text)
    except (ValueError, TypeError):
        return default


print(safe_int("42"), safe_int("abc"), safe_int(None, -1))
`,
      check: String.raw`
assert safe_int("42") == 42, _t("safe_int('42') 42 olmalı.", "safe_int('42') must be 42.")
assert safe_int(" 7 ") == 7, _t("int() baştaki/sondaki boşluğu kabul eder: safe_int(' 7 ') 7 olmalı.", "int() accepts surrounding spaces: safe_int(' 7 ') must be 7.")
assert safe_int("abc") == 0, _t("Çevrilemeyen metin için varsayılan 0 dönmeli.", "A non-numeric text must return the default 0.")
assert safe_int("3.5", default=-1) == -1, _t("'3.5' int'e çevrilemez; default dönmeli.", "'3.5' can't become an int; default must be returned.")
assert safe_int(None, -1) == -1, _t("None için TypeError'ı da yakala.", "Catch TypeError for None too.")
`,
      hints: [
        { tr: "<code>try:</code> bloğunda <code>return int(text)</code>, <code>except ValueError:</code> bloğunda <code>return default</code>.", en: "Inside <code>try:</code> put <code>return int(text)</code>, inside <code>except ValueError:</code> put <code>return default</code>." },
        { tr: "Birden fazla tip için tuple kullan: <code>except (ValueError, TypeError):</code>", en: "Use a tuple for several types: <code>except (ValueError, TypeError):</code>" }
      ] },
    { id: "08-e2",
      title: { tr: "Flaky adımlar için retry", en: "Retry for flaky steps" },
      prompt: {
        tr: `<p><code>retry(action, attempts=3)</code> fonksiyonunu yaz. <code>action</code> argümansız bir fonksiyondur:</p><ul><li><code>action()</code>'ı çağır; başarılı olursa sonucunu döndür</li><li>Bir <code>Exception</code> fırlatırsa tekrar dene, en fazla <code>attempts</code> kez</li><li>Hepsi başarısızsa <strong>son hatayı</strong> yeniden fırlat (<code>raise</code>)</li></ul><p>Not: gerçek projelerde retry'ı dikkatli kullan; flaky bir testi gizlemek yerine nedenini bulmak daha iyidir.</p>`,
        en: `<p>Write <code>retry(action, attempts=3)</code>. <code>action</code> is a function with no arguments:</p><ul><li>call <code>action()</code>; if it succeeds return its result</li><li>if it raises an <code>Exception</code>, try again, at most <code>attempts</code> times</li><li>if all attempts fail, re-raise <strong>the last error</strong> (<code>raise</code>)</li></ul><p>Note: in real projects use retry carefully; finding the cause of a flaky test beats hiding it.</p>`
      },
      starter: String.raw`
def retry(action, attempts=3):
    return action()


calls = {"n": 0}

def flaky_click():
    calls["n"] += 1
    if calls["n"] < 3:
        raise TimeoutError("element not ready")
    return "clicked"


print(retry(flaky_click), "after", calls["n"], "calls")
`,
      solution: String.raw`
def retry(action, attempts=3):
    last_error = None
    for _ in range(attempts):
        try:
            return action()
        except Exception as error:
            last_error = error
    raise last_error


calls = {"n": 0}

def flaky_click():
    calls["n"] += 1
    if calls["n"] < 3:
        raise TimeoutError("element not ready")
    return "clicked"


print(retry(flaky_click), "after", calls["n"], "calls")
`,
      check: String.raw`
_n = {"c": 0}
def _flaky():
    _n["c"] += 1
    if _n["c"] < 3:
        raise TimeoutError("not yet")
    return "ok"
assert retry(_flaky, attempts=3) == "ok" and _n["c"] == 3, _t("3. denemede başarılı olan action için 'ok' dönmeli (3 çağrı).", "An action succeeding on the 3rd try must return 'ok' (3 calls).")
_m = {"c": 0}
def _always():
    _m["c"] += 1
    raise ConnectionError(f"fail {_m['c']}")
try:
    retry(_always, attempts=4)
    raise AssertionError(_t("Tüm denemeler başarısızsa hata fırlatılmalı.", "When all attempts fail an error must be raised."))
except ConnectionError as _e:
    assert _m["c"] == 4, _t(f"attempts=4 iken action 4 kez çağrılmalı, {_m['c']} kez çağrıldı.", f"With attempts=4 the action must be called 4 times, it was called {_m['c']} times.")
    assert str(_e) == "fail 4", _t("Son hata yeniden fırlatılmalı.", "The last error must be re-raised.")
_k = {"c": 0}
def _ok():
    _k["c"] += 1
    return 5
assert retry(_ok) == 5 and _k["c"] == 1, _t("Başarılı action sadece bir kez çağrılmalı.", "A successful action must be called only once.")
`,
      hints: [
        { tr: "<code>for _ in range(attempts):</code> içinde <code>try: return action()</code>. <code>return</code> döngüyü de bitirir.", en: "Inside <code>for _ in range(attempts):</code> do <code>try: return action()</code>. <code>return</code> also ends the loop." },
        { tr: "<code>except Exception as error: last_error = error</code>; döngüden sonra <code>raise last_error</code>.", en: "<code>except Exception as error: last_error = error</code>; after the loop <code>raise last_error</code>." }
      ] }
  ],
  quiz: [
    { q: { tr: "<code>try</code> bloğunda hata <strong>olmazsa</strong> hangi blok çalışır?", en: "Which block runs when the <code>try</code> block raises <strong>no</strong> error?" },
      options: [{ tr: "<code>except</code>", en: "<code>except</code>" }, { tr: "<code>else</code> (ve sonra <code>finally</code>)", en: "<code>else</code> (and then <code>finally</code>)" }, { tr: "Hiçbiri", en: "None" }],
      answer: 1, explain: { tr: "<code>else</code> sadece hata yoksa, <code>finally</code> her durumda çalışır.", en: "<code>else</code> runs only without an error, <code>finally</code> always runs." } },
    { q: { tr: "pytest'te bir testin FAILED olmasının en yaygın nedeni hangi hata tipidir?", en: "Which error type most commonly makes a pytest test FAILED?" },
      options: [{ tr: "<code>SyntaxError</code>", en: "<code>SyntaxError</code>" }, { tr: "<code>KeyboardInterrupt</code>", en: "<code>KeyboardInterrupt</code>" }, { tr: "<code>AssertionError</code>", en: "<code>AssertionError</code>" }],
      answer: 2, explain: { tr: "Başarısız bir <code>assert</code> <code>AssertionError</code> fırlatır.", en: "A failing <code>assert</code> raises <code>AssertionError</code>." } },
    { q: { tr: "Uygulamanın kullanıcıya tam traceback göstermesi hangi güvenlik sorunudur?", en: "An app showing users the full traceback is which security issue?" },
      options: [{ tr: "Bilgi ifşası (information disclosure)", en: "Information disclosure" }, { tr: "CSRF", en: "CSRF" }, { tr: "Açık yönlendirme", en: "Open redirect" }],
      answer: 0, explain: { tr: "Dosya yolları, sürümler ve SQL sorguları saldırgana yol haritası verir (OWASP A05).", en: "File paths, versions and SQL queries give attackers a map (OWASP A05)." } }
  ]
});
