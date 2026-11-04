SQ.addLesson({
  id: "05-functions",
  num: 5,
  icon: "def",
  minutes: 25,
  title: { tr: "Fonksiyonlar ve type hint'ler", en: "Functions & type hints" },
  summary: {
    tr: "Tekrar eden adımları isimli, test edilebilir parçalara böl; tipleri yazarak kodu kendini anlatır hale getir.",
    en: "Split repeated steps into named, testable pieces; write types so the code explains itself."
  },
  goals: {
    tr: [
      "<code>def</code>, parametreler, <code>return</code> ve docstring",
      "Varsayılan değerler ve keyword argümanlar: <code>launch(headless=True)</code>",
      "Type hint'ler: <code>str</code>, <code>int</code>, <code>list[str]</code>, <code>dict[str, int]</code>, <code>str | None</code>",
      "Fonksiyonların da bir değer olduğunu görmek (decorator'lara hazırlık)"
    ],
    en: [
      "<code>def</code>, parameters, <code>return</code> and docstrings",
      "Default values and keyword arguments: <code>launch(headless=True)</code>",
      "Type hints: <code>str</code>, <code>int</code>, <code>list[str]</code>, <code>dict[str, int]</code>, <code>str | None</code>",
      "Seeing that functions are values too (preparing for decorators)"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>Fonksiyon, bir işe <strong>isim verilmiş</strong> kod bloğudur. Test otomasyonundaki “keyword” veya “step” kavramının karşılığıdır: <code>login(...)</code>, <code>search(...)</code>, <code>assert_no_sql_error(...)</code>. Fonksiyon <code>return</code> ile bir değer döndürür; <code>return</code> yoksa <code>None</code> döner.</p>`,
      en: `<p>A function is a block of code with <strong>a name for a job</strong>. It's the equivalent of a “keyword” or “step” in test automation: <code>login(...)</code>, <code>search(...)</code>, <code>assert_no_sql_error(...)</code>. A function returns a value with <code>return</code>; without <code>return</code> it returns <code>None</code>.</p>` },
    { t: "code", id: "c1",
      title: { tr: "İlk fonksiyonun", en: "Your first function" },
      code: String.raw`
def build_url(base_url: str, path: str) -> str:
    """Taban adres ile yolu birleştirir. / Joins the base URL and a path."""
    if not path.startswith("/"):
        path = "/" + path
    return base_url.rstrip("/") + path


print(build_url("http://127.0.0.1:5000", "login"))
print(build_url("http://127.0.0.1:5000/", "/products?q=çay"))
help(build_url)
` },
    { t: "callout", kind: "qa",
      tr: `<p>Type hint'ler (<code>base_url: str</code>, <code>-&gt; str</code>) Python tarafından <strong>zorlanmaz</strong>; yanlış tip verirsen kod yine çalışır. Ama editörün (VS Code/PyCharm) otomatik tamamlamayı ve hata uyarılarını bunlardan yapar, <code>mypy</code> gibi araçlar da kontrol eder. Page Object metotlarında tip yazmak, ekip arkadaşının “bu metot ne döndürüyor?” sorusunu ortadan kaldırır.</p>`,
      en: `<p>Type hints (<code>base_url: str</code>, <code>-&gt; str</code>) are <strong>not enforced</strong> by Python; the code still runs with the wrong type. But your editor (VS Code/PyCharm) uses them for autocomplete and warnings, and tools like <code>mypy</code> check them. Typing Page Object methods answers your teammate's “what does this return?” question.</p>` },
    { t: "h", tr: "Varsayılan değerler ve keyword argümanlar", en: "Default values and keyword arguments" },
    { t: "code", id: "c2",
      title: { tr: "Playwright tarzı imza", en: "A Playwright-style signature" },
      code: String.raw`
def launch(browser: str = "chromium", headless: bool = True, slow_mo: int = 0) -> str:
    return f"{browser} (headless={headless}, slow_mo={slow_mo})"


print(launch())                              # tüm varsayılanlar / all defaults
print(launch("firefox"))                     # konuma göre / positional
print(launch(headless=False, slow_mo=250))   # isme göre / by keyword - sıra önemsiz
print(launch("webkit", slow_mo=100))


def check_status(status: int, expected: int = 200) -> tuple[bool, str]:
    ok = status == expected
    return ok, f"expected {expected}, got {status}"   # iki değer = tuple


passed, message = check_status(404)
print(passed, message)
` },
    { t: "callout", kind: "warn",
      tr: `<p>Varsayılan değer olarak <strong>değiştirilebilir</strong> bir nesne (<code>[]</code>, <code>{}</code>) kullanma: <code>def add(item, items=[])</code> yazarsan aynı liste <em>her çağrıda paylaşılır</em>. Doğrusu: <code>items: list | None = None</code> ve fonksiyonun içinde <code>if items is None: items = []</code>.</p>`,
      en: `<p>Don't use a <strong>mutable</strong> object (<code>[]</code>, <code>{}</code>) as a default: with <code>def add(item, items=[])</code> the same list is <em>shared between calls</em>. Correct: <code>items: list | None = None</code> and inside the function <code>if items is None: items = []</code>.</p>` },
    { t: "h", tr: "Sık kullanılan type hint'ler", en: "Common type hints" },
    { t: "text",
      tr: `<table><thead><tr><th>Hint</th><th>Anlamı</th></tr></thead><tbody>
<tr><td><code>str</code>, <code>int</code>, <code>float</code>, <code>bool</code></td><td>Temel tipler</td></tr>
<tr><td><code>list[str]</code></td><td>String listesi (ör. payload'lar)</td></tr>
<tr><td><code>dict[str, int]</code></td><td>Anahtarı str, değeri int olan sözlük</td></tr>
<tr><td><code>tuple[bool, str]</code></td><td>İki elemanlı tuple: <code>(is_vulnerable, evidence)</code></td></tr>
<tr><td><code>str | None</code></td><td>str <em>ya da</em> None (eski yazım: <code>Optional[str]</code>)</td></tr>
<tr><td><code>-&gt; None</code></td><td>Bir şey döndürmeyen fonksiyon (ör. <code>click()</code>)</td></tr>
</tbody></table>`,
      en: `<table><thead><tr><th>Hint</th><th>Meaning</th></tr></thead><tbody>
<tr><td><code>str</code>, <code>int</code>, <code>float</code>, <code>bool</code></td><td>Basic types</td></tr>
<tr><td><code>list[str]</code></td><td>List of strings (e.g. payloads)</td></tr>
<tr><td><code>dict[str, int]</code></td><td>Dict with str keys and int values</td></tr>
<tr><td><code>tuple[bool, str]</code></td><td>Two-item tuple: <code>(is_vulnerable, evidence)</code></td></tr>
<tr><td><code>str | None</code></td><td>str <em>or</em> None (old spelling: <code>Optional[str]</code>)</td></tr>
<tr><td><code>-&gt; None</code></td><td>Function that returns nothing (e.g. <code>click()</code>)</td></tr>
</tbody></table>` },
    { t: "h", tr: "Fonksiyonlar da birer değer", en: "Functions are values too" },
    { t: "text",
      tr: `<p>Python'da bir fonksiyonu değişkene atayabilir, listeye koyabilir veya başka bir fonksiyona argüman olarak verebilirsin. <code>sorted(..., key=...)</code> ve pytest fixture'ları bu özelliğe dayanır. Küçük, tek satırlık fonksiyonlar için <code>lambda</code> kullanılır.</p>`,
      en: `<p>In Python you can assign a function to a variable, put it in a list or pass it to another function. <code>sorted(..., key=...)</code> and pytest fixtures rely on this. Tiny one-line functions can be written with <code>lambda</code>.</p>` },
    { t: "code", id: "c3",
      title: { tr: "Fonksiyonu argüman olarak vermek", en: "Passing a function as an argument" },
      code: String.raw`
SEVERITY_WEIGHTS = {"critical": 10, "high": 7, "medium": 4, "low": 2, "info": 0}
findings = [("CSP eksik", "medium"), ("SQLi login", "critical"), ("Banner", "low"), ("XSS", "high")]


def weight(finding: tuple[str, str]) -> int:
    return SEVERITY_WEIGHTS[finding[1]]


for title, sev in sorted(findings, key=weight, reverse=True):
    print(f"{sev:>8}  {title}")

# Aynısı lambda ile / the same with a lambda
print(sorted(findings, key=lambda f: f[0]))


def run_check(check, value):        # check bir fonksiyon / check is a function
    return f"{check.__name__}({value!r}) -> {check(value)}"


print(run_check(str.isdigit, "2026"))
print(run_check(len, "payload"))
` },
    { t: "project", file: "secureqa/config.py + findings.py",
      tr: `<p>Projedeki fonksiyonlar kısa, tek iş yapan, tipli ve docstring'li. <code>risk_score</code> bir liste alıp bir sayı döndürüyor; içindeki <code>sum(...)</code> bir “generator ifadesi” (list comprehension'ın köşeli parantezsiz hali).</p>`,
      en: `<p>The project's functions are short, do one job, are typed and have docstrings. <code>risk_score</code> takes a list and returns a number; the <code>sum(...)</code> inside uses a “generator expression” (a list comprehension without the brackets).</p>`,
      code: String.raw`
def url(self, path: str) -> str:
    """Join the base URL with a path: settings.url("/login")."""
    if not path.startswith("/"):
        path = "/" + path
    return self.base_url + path


def risk_score(findings: list[Finding]) -> int:
    """Calculate a simple 0-100 risk score (higher = more dangerous)."""
    total = sum(SEVERITY_WEIGHTS[finding.severity] for finding in findings)
    return min(100, total)


def risk_grade(score: int) -> str:
    """Turn a risk score into a school-style letter grade (A = safest)."""
    if score == 0:
        return "A"
    if score < 15:
        return "B"
    if score < 40:
        return "C"
    if score < 70:
        return "D"
    return "F"
`,
      notes: [
        { line: 1, tr: "<code>Settings</code> sınıfının metodu (6. derste <code>self</code>'i göreceğiz). Bu dersteki <code>build_url</code> ile neredeyse aynı!", en: "A method of the <code>Settings</code> class (we meet <code>self</code> in lesson 6). Almost identical to this lesson's <code>build_url</code>!" },
        { line: 8, tr: "<code>list[Finding]</code>: Finding nesnelerinden oluşan liste (14. ders).", en: "<code>list[Finding]</code>: a list of Finding objects (lesson 14)." },
        { line: 11, tr: "<code>min(100, total)</code> puanı 100 ile sınırlar.", en: "<code>min(100, total)</code> caps the score at 100." },
        { line: 16, tr: "Erken <code>return</code>: koşul sağlanınca fonksiyon hemen biter, <code>elif</code>'e gerek kalmaz.", en: "Early <code>return</code>: the function ends as soon as a condition matches, no <code>elif</code> needed." }
      ] }
  ],
  exercises: [
    { id: "05-e1",
      title: { tr: "url_for fonksiyonu", en: "The url_for function" },
      prompt: {
        tr: `<p><code>url_for(base_url: str, path: str) -&gt; str</code> fonksiyonunu yaz. Hem <code>base_url</code> sonundaki hem <code>path</code> başındaki eğik çizgiler ne olursa olsun, sonuçta aralarında <strong>tam bir</strong> <code>/</code> olsun. <code>path</code> boşsa sadece <code>base_url</code> (sondaki <code>/</code> olmadan) dönsün.</p>`,
        en: `<p>Write <code>url_for(base_url: str, path: str) -&gt; str</code>. Whatever slashes are at the end of <code>base_url</code> or the start of <code>path</code>, the result must have <strong>exactly one</strong> <code>/</code> between them. If <code>path</code> is empty, return just <code>base_url</code> (without a trailing <code>/</code>).</p>`
      },
      starter: String.raw`
def url_for(base_url: str, path: str) -> str:
    # buraya yaz / write here
    pass


print(url_for("http://127.0.0.1:5000/", "/login"))
`,
      solution: String.raw`
def url_for(base_url: str, path: str) -> str:
    base = base_url.rstrip("/")
    path = path.lstrip("/")
    if not path:
        return base
    return f"{base}/{path}"


print(url_for("http://127.0.0.1:5000/", "/login"))
`,
      check: String.raw`
assert callable(globals().get("url_for")), _t("url_for adında bir fonksiyon tanımla.", "Define a function named url_for.")
_cases = [
    (("http://127.0.0.1:5000/", "/login"), "http://127.0.0.1:5000/login"),
    (("http://127.0.0.1:5000", "login"), "http://127.0.0.1:5000/login"),
    (("http://127.0.0.1:5000//", "//api/products"), "http://127.0.0.1:5000/api/products"),
    (("http://x", ""), "http://x"),
    (("http://x/", "/"), "http://x"),
]
for _args, _want in _cases:
    _got = url_for(*_args)
    assert _got == _want, _t(f"url_for{_args!r} -> {_got!r}, beklenen {_want!r}", f"url_for{_args!r} -> {_got!r}, expected {_want!r}")
`,
      hints: [
        { tr: "<code>rstrip(\"/\")</code> ve <code>lstrip(\"/\")</code> birden fazla eğik çizgiyi de siler.", en: "<code>rstrip(\"/\")</code> and <code>lstrip(\"/\")</code> remove multiple slashes too." },
        { tr: "Temizledikten sonra <code>if not path: return base</code> ile boş yolu ele al.", en: "After cleaning, handle the empty path with <code>if not path: return base</code>." }
      ] },
    { id: "05-e2",
      title: { tr: "Parola politikası kontrolü", en: "Password policy check" },
      prompt: {
        tr: `<p>Projedeki SecureShop zayıf parolaları reddeder (<code>demo_app/auth.py</code> içindeki <code>password_problems()</code>: en az 8 karakter, harf ve rakam şart) ve <code>tests/security/test_authentication_defenses.py</code>, <code>"1"</code> gibi bir parolanın kabul <strong>edilmediğini</strong> doğrular. Test verisi üretirken kullanmak için kendi (biraz daha sıkı) kuralını yaz: <code>is_strong_password(password: str, min_length: int = 8) -&gt; bool</code>. Parola şu durumda güçlüdür:</p><ul><li>uzunluğu en az <code>min_length</code></li><li>en az bir rakam, bir büyük harf ve bir küçük harf içeriyor</li></ul><p><code>str.isdigit()</code>, <code>str.isupper()</code>, <code>str.islower()</code> ve <code>any()</code> işine yarar.</p>`,
        en: `<p>The project's SecureShop rejects weak passwords (<code>password_problems()</code> in <code>demo_app/auth.py</code>: at least 8 characters, a letter and a digit) and <code>tests/security/test_authentication_defenses.py</code> verifies that a password like <code>"1"</code> is <strong>not</strong> accepted. Write your own (slightly stricter) rule for generating test data: <code>is_strong_password(password: str, min_length: int = 8) -&gt; bool</code>. A password is strong when:</p><ul><li>its length is at least <code>min_length</code></li><li>it contains at least one digit, one upper-case and one lower-case letter</li></ul><p><code>str.isdigit()</code>, <code>str.isupper()</code>, <code>str.islower()</code> and <code>any()</code> will help.</p>`
      },
      starter: String.raw`
def is_strong_password(password: str, min_length: int = 8) -> bool:
    return len(password) >= min_length


for pw in ["1", "selcuk2026", "Selcuk!2026", "KISA1a"]:
    print(pw, is_strong_password(pw))
`,
      solution: String.raw`
def is_strong_password(password: str, min_length: int = 8) -> bool:
    if len(password) < min_length:
        return False
    has_digit = any(ch.isdigit() for ch in password)
    has_upper = any(ch.isupper() for ch in password)
    has_lower = any(ch.islower() for ch in password)
    return has_digit and has_upper and has_lower


for pw in ["1", "selcuk2026", "Selcuk!2026", "KISA1a"]:
    print(pw, is_strong_password(pw))
`,
      check: String.raw`
_cases = {"1": False, "selcuk2026": False, "Selcuk!2026": True, "KISA1a": False, "ABCDEFG1": False,
          "Abcdefgh": False, "Abcdefg1": True, "Çok1Güçlü": True}
for _pw, _want in _cases.items():
    _got = is_strong_password(_pw)
    assert _got is _want, _t(f"is_strong_password({_pw!r}) {_want} olmalı, {_got!r} döndü.", f"is_strong_password({_pw!r}) should be {_want}, got {_got!r}.")
assert is_strong_password("Ab1", min_length=3) is True, _t("min_length parametresi kullanılmalı.", "The min_length parameter must be used.")
assert is_strong_password("Abcdefg1", min_length=12) is False, _t("min_length=12 ile 8 karakterlik parola reddedilmeli.", "With min_length=12 an 8-character password must be rejected.")
`,
      hints: [
        { tr: "<code>any(ch.isdigit() for ch in password)</code> → parolada en az bir rakam var mı?", en: "<code>any(ch.isdigit() for ch in password)</code> → does the password have at least one digit?" },
        { tr: "Üç koşulu <code>and</code> ile birleştir; uzunluk kontrolünü de unutma.", en: "Combine the three conditions with <code>and</code>; don't forget the length check." }
      ] }
  ],
  quiz: [
    { q: { tr: "<code>return</code> içermeyen bir fonksiyon ne döndürür?", en: "What does a function without <code>return</code> return?" },
      options: [{ tr: "<code>0</code>", en: "<code>0</code>" }, { tr: "<code>None</code>", en: "<code>None</code>" }, { tr: "Hata verir", en: "It raises an error" }],
      answer: 1, explain: { tr: "Python örtük olarak <code>None</code> döndürür.", en: "Python implicitly returns <code>None</code>." } },
    { q: { tr: "Type hint'ler için hangisi doğru?", en: "Which is true about type hints?" },
      options: [{ tr: "Yanlış tip verilirse Python hata fırlatır", en: "Python raises an error if the wrong type is passed" }, { tr: "Kodu hızlandırır", en: "They make code faster" }, { tr: "Çalışma zamanında zorlanmaz; editör ve araçlar için belgedir", en: "Not enforced at runtime; documentation for editors and tools" }],
      answer: 2, explain: { tr: "Hint'ler bilgi amaçlıdır; kontrolü mypy gibi araçlar yapar.", en: "Hints are informational; tools like mypy do the checking." } },
    { q: { tr: "<code>launch(\"firefox\", headless=False)</code> çağrısında <code>headless=False</code> nedir?", en: "In <code>launch(\"firefox\", headless=False)</code>, what is <code>headless=False</code>?" },
      options: [{ tr: "Keyword (isimli) argüman", en: "A keyword argument" }, { tr: "Yeni bir değişken tanımı", en: "A new variable definition" }, { tr: "Bir karşılaştırma", en: "A comparison" }],
      answer: 0, explain: { tr: "Parametre adıyla verilen argümandır; sırası önemli değildir.", en: "An argument passed by parameter name; its position doesn't matter." } }
  ]
});
