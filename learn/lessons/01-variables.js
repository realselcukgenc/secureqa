SQ.addLesson({
  id: "01-variables",
  num: 1,
  icon: "x=1",
  minutes: 15,
  title: { tr: "Değişkenler ve veri tipleri", en: "Variables & data types" },
  summary: {
    tr: "Test verisini isimlendirmek: int, float, str, bool ve None ile tanış.",
    en: "Naming your test data: meet int, float, str, bool and None."
  },
  goals: {
    tr: [
      "Değişken oluşturmak ve <code>print()</code> ile yazdırmak",
      "Beş temel tipi tanımak: <code>int</code>, <code>float</code>, <code>str</code>, <code>bool</code>, <code>None</code>",
      "Tip dönüşümü: <code>int(\"42\")</code>, <code>str(5)</code>, <code>bool(...)</code>",
      "İsimlendirme kuralları: <code>snake_case</code> ve <code>SABIT_DEGER</code>"
    ],
    en: [
      "Create variables and print them with <code>print()</code>",
      "Know the five basic types: <code>int</code>, <code>float</code>, <code>str</code>, <code>bool</code>, <code>None</code>",
      "Type conversion: <code>int(\"42\")</code>, <code>str(5)</code>, <code>bool(...)</code>",
      "Naming rules: <code>snake_case</code> and <code>CONSTANT_VALUE</code>"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>Bir <strong>değişken</strong>, bir değere verdiğin <strong>isimdir</strong>. Test otomasyonunda bunu her gün yapıyorsun: kullanıcı adı, parola, adres, zaman aşımı… Bu değerleri kodun içine dağınık yazmak yerine bir isimle tutarsın ve her yerde o ismi kullanırsın.</p>
<p>Python'da değişken oluşturmak için <code>=</code> işareti yeterli. Tip belirtmen gerekmez; Python değere bakıp tipi kendisi anlar.</p>`,
      en: `<p>A <strong>variable</strong> is a <strong>name</strong> you give to a value. You already do this every day in test automation: username, password, URL, timeout… Instead of scattering these values around the code you keep them under a name and use that name everywhere.</p>
<p>In Python the <code>=</code> sign is enough to create a variable. You don't declare a type; Python looks at the value and figures it out.</p>` },
    { t: "code", id: "c1",
      title: { tr: "İlk değişkenlerin", en: "Your first variables" },
      code: String.raw`
base_url = "http://127.0.0.1:5000"   # str  (metin / text)
timeout_ms = 10000                     # int  (tam sayı / integer)
price = 129.90                         # float (ondalıklı / decimal)
headless = True                        # bool (True / False)
last_error = None                      # None (henüz değer yok / no value yet)

print("Adres:", base_url)
print("Zaman aşımı:", timeout_ms, "ms")
print(type(base_url), type(timeout_ms), type(price), type(headless), type(last_error))
` },
    { t: "callout", kind: "qa",
      tr: `<p>“Magic string” kullanmamak için test verisini değişkene koymak, Selenium/Playwright projelerinde locator'ları tek yerde tutmakla aynı fikir: <strong>değer değişirse sadece tek satırı değiştirirsin</strong>.</p>`,
      en: `<p>Putting test data into variables to avoid “magic strings” is the same idea as keeping locators in one place in Selenium/Playwright projects: <strong>when the value changes you edit a single line</strong>.</p>` },
    { t: "h", tr: "Beş temel tip", en: "The five basic types" },
    { t: "text",
      tr: `<table><thead><tr><th>Tip</th><th>Örnek</th><th>Testte nerede?</th></tr></thead><tbody>
<tr><td><code>int</code></td><td><code>200</code>, <code>-3</code>, <code>10_000</code></td><td>HTTP durum kodu, deneme sayısı, ms cinsinden timeout</td></tr>
<tr><td><code>float</code></td><td><code>129.9</code>, <code>0.5</code></td><td>Ürün fiyatı, saniye cinsinden bekleme</td></tr>
<tr><td><code>str</code></td><td><code>"selcuk"</code>, <code>'#login-btn'</code></td><td>URL, locator, kullanıcı adı, payload</td></tr>
<tr><td><code>bool</code></td><td><code>True</code>, <code>False</code></td><td><code>headless</code>, “giriş yapıldı mı?”</td></tr>
<tr><td><code>None</code></td><td><code>None</code></td><td>“Henüz değer yok”: ör. hata mesajı yoksa</td></tr>
</tbody></table>
<p><code>10_000</code> yazımındaki alt çizgi sadece okunabilirlik içindir; Python onu <code>10000</code> olarak görür.</p>`,
      en: `<table><thead><tr><th>Type</th><th>Example</th><th>Where in tests?</th></tr></thead><tbody>
<tr><td><code>int</code></td><td><code>200</code>, <code>-3</code>, <code>10_000</code></td><td>HTTP status code, retry count, timeout in ms</td></tr>
<tr><td><code>float</code></td><td><code>129.9</code>, <code>0.5</code></td><td>Product price, wait in seconds</td></tr>
<tr><td><code>str</code></td><td><code>"selcuk"</code>, <code>'#login-btn'</code></td><td>URL, locator, username, payload</td></tr>
<tr><td><code>bool</code></td><td><code>True</code>, <code>False</code></td><td><code>headless</code>, “is the user logged in?”</td></tr>
<tr><td><code>None</code></td><td><code>None</code></td><td>“No value yet”: e.g. when there is no error message</td></tr>
</tbody></table>
<p>The underscore in <code>10_000</code> is only for readability; Python sees <code>10000</code>.</p>` },
    { t: "h", tr: "Tip dönüşümü", en: "Type conversion" },
    { t: "text",
      tr: `<p>Ortam değişkenlerinden, dosyalardan veya web formlarından gelen her şey <strong>metindir</strong> (<code>str</code>). Hesap yapmadan önce doğru tipe çevirmen gerekir. SecureQA'nın <code>config.py</code> dosyası da tam olarak bunu yapıyor: <code>int(os.environ.get("SECUREQA_TIMEOUT_MS", "10000"))</code>.</p>`,
      en: `<p>Everything that comes from environment variables, files or web forms is <strong>text</strong> (<code>str</code>). You must convert it to the right type before calculating. SecureQA's <code>config.py</code> does exactly that: <code>int(os.environ.get("SECUREQA_TIMEOUT_MS", "10000"))</code>.</p>` },
    { t: "code", id: "c2",
      title: { tr: "Metinden sayıya, sayıdan metne", en: "Text to number, number to text" },
      code: String.raw`
raw_timeout = "2500"            # ortam değişkeninden gelmiş gibi / as if from an env var
timeout = int(raw_timeout)      # "2500" -> 2500
print(timeout + 500)            # 3000

seconds = timeout / 1000        # / her zaman float verir / always gives a float
print(seconds)                  # 2.5
print(timeout // 1000, timeout % 1000)   # tam bölme ve kalan / floor division and remainder

status = 404
message = "HTTP " + str(status) # sayıyı metne çevir / number to text
print(message)

# bool(): boş/sıfır değerler False, diğerleri True
print(bool(""), bool("x"), bool(0), bool(3), bool(None))
` },
    { t: "callout", kind: "warn",
      tr: `<p><code>"5" + 5</code> bir <code>TypeError</code> verir: Python metinle sayıyı kendiliğinden toplamaz. Ayrıca <code>bool("False")</code> sonucu <strong><code>True</code></strong>'dur, çünkü boş olmayan her metin doğrudur! <code>"true"</code> gibi bir ayarı bool'a çevirmek için karşılaştırma yap: <code>value.lower() == "true"</code>.</p>`,
      en: `<p><code>"5" + 5</code> raises a <code>TypeError</code>: Python does not add text and numbers automatically. Also <code>bool("False")</code> is <strong><code>True</code></strong>, because every non-empty string is truthy! To turn a setting like <code>"true"</code> into a bool, compare it: <code>value.lower() == "true"</code>.</p>` },
    { t: "code", id: "c3", expectError: true,
      title: { tr: "Hatayı kendin gör", en: "See the error yourself" },
      code: String.raw`
attempts = 3
print("Deneme sayısı: " + attempts)   # TypeError! Düzelt: str(attempts) ya da f-string
`,
      caption: {
        tr: "Çalıştır, hata kutusunu oku, sonra <code>str(attempts)</code> ile düzeltip tekrar çalıştır.",
        en: "Run it, read the error box, then fix it with <code>str(attempts)</code> and run again."
      } },
    { t: "h", tr: "İsimlendirme kuralları", en: "Naming rules" },
    { t: "text",
      tr: `<ul>
<li>Değişkenler <code>snake_case</code>: <code>login_url</code>, <code>max_retries</code>.</li>
<li>Değişmeyen ayarlar (sabitler) BÜYÜK HARF: <code>DEFAULT_BASE_URL</code>, <code>XSS_MARKER</code>. Python bunu zorlamaz, bu bir <strong>anlaşmadır</strong>.</li>
<li>Rakamla başlayamaz, boşluk ve <code>-</code> içeremez. Büyük/küçük harf farklıdır: <code>User</code> ≠ <code>user</code>.</li>
<li>Türkçe karakter teknik olarak çalışır ama kodda İngilizce isim kullanmak ekip standardıdır.</li>
</ul>`,
      en: `<ul>
<li>Variables use <code>snake_case</code>: <code>login_url</code>, <code>max_retries</code>.</li>
<li>Settings that never change (constants) are UPPER CASE: <code>DEFAULT_BASE_URL</code>, <code>XSS_MARKER</code>. Python doesn't enforce it, it's a <strong>convention</strong>.</li>
<li>Names cannot start with a digit or contain spaces or <code>-</code>. Case matters: <code>User</code> ≠ <code>user</code>.</li>
<li>Non-ASCII letters technically work, but English names are the usual team standard.</li>
</ul>` },
    { t: "code", id: "c4",
      title: { tr: "Kısa yollar", en: "Shortcuts" },
      code: String.raw`
retries = 0
retries += 1          # retries = retries + 1
retries += 1
print("retries:", retries)

username, password = "selcuk", "Selcuk!2026"   # aynı anda iki atama / two at once
print(username, password)

a, b = 1, 2
a, b = b, a           # yer değiştirme / swap
print(a, b)

# is None: None kontrolü için doğru yol / the right way to test for None
error_text = None
print(error_text is None)
` },
    { t: "project", file: "secureqa/config.py",
      tr: `<p>Projenin ayar dosyası, bu dersteki her şeyi kullanıyor: sabitler büyük harfle, tipler açıkça yazılmış (<code>: str</code>, <code>: tuple[str, ...]</code> — tip ipuçlarını 5. derste göreceğiz) ve ortam değişkeninden gelen metin <code>bool</code>'a <strong>karşılaştırma ile</strong> çevriliyor.</p>`,
      en: `<p>The project's settings file uses everything from this lesson: constants in upper case, types written explicitly (<code>: str</code>, <code>: tuple[str, ...]</code> — we'll cover type hints in lesson 5) and text from an environment variable is turned into a <code>bool</code> <strong>by comparing it</strong>.</p>`,
      code: String.raw`
DEFAULT_BASE_URL: str = "http://127.0.0.1:5000"       # SecureShop (functional target)
DEFAULT_JUICE_SHOP_URL: str = "http://127.0.0.1:3000"  # OWASP Juice Shop (security target)
SUPPORTED_LANGS: tuple[str, ...] = ("tr", "en")


def _env_bool(name: str, default: bool) -> bool:
    """Read a yes/no environment variable."""
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")
`,
      notes: [
        { line: 1, tr: "Sabit: SecureShop'un (güvenli demo mağaza) varsayılan adresi. Büyük harf = “bunu değiştirme”.", en: "Constant: default address of SecureShop (the secure demo shop). Upper case = “don't change me”." },
        { line: 2, tr: "İkinci hedef: güvenlik bulgularının geldiği OWASP Juice Shop, başka bir portta.", en: "The second target: OWASP Juice Shop, where security findings come from, on another port." },
        { line: 3, tr: "Desteklenen diller bir <em>tuple</em> içinde (3. derste).", en: "Supported languages live in a <em>tuple</em> (lesson 3)." },
        { line: 8, tr: "Ortam değişkeni yoksa <code>get</code> <code>None</code> döner…", en: "If the variable is missing, <code>get</code> returns <code>None</code>…" },
        { line: 9, tr: "…ve <code>is None</code> ile kontrol edilir.", en: "…which is checked with <code>is None</code>." },
        { line: 11, tr: "<code>bool(\"false\")</code> True olacağı için metin bir listeyle karşılaştırılır.", en: "Since <code>bool(\"false\")</code> would be True, the text is compared to a list instead." }
      ] }
  ],
  exercises: [
    { id: "01-e1",
      title: { tr: "Test ayarlarını tanımla", en: "Define test settings" },
      prompt: {
        tr: `<p>Aşağıdaki değişkenleri oluştur:</p><ul><li><code>base_url</code> → <code>"http://127.0.0.1:5000"</code></li><li><code>timeout_ms</code> → <code>10000</code> (tam sayı)</li><li><code>headless</code> → <code>True</code></li><li><code>browser</code> → <code>"chromium"</code></li></ul><p>Sonra <code>print()</code> ile en az birini yazdır.</p>`,
        en: `<p>Create these variables:</p><ul><li><code>base_url</code> → <code>"http://127.0.0.1:5000"</code></li><li><code>timeout_ms</code> → <code>10000</code> (an integer)</li><li><code>headless</code> → <code>True</code></li><li><code>browser</code> → <code>"chromium"</code></li></ul><p>Then print at least one of them with <code>print()</code>.</p>`
      },
      starter: String.raw`
# Değişkenlerini buraya yaz / Write your variables here
base_url = ...

print(base_url)
`,
      solution: String.raw`
base_url = "http://127.0.0.1:5000"
timeout_ms = 10000
headless = True
browser = "chromium"

print(base_url)
`,
      check: String.raw`
for _name in ("base_url", "timeout_ms", "headless", "browser"):
    assert _name in globals(), _t(f"'{_name}' adında bir değişken bulunamadı.", f"No variable named '{_name}' was found.")
assert base_url == "http://127.0.0.1:5000", _t("base_url değeri yanlış.", "base_url has the wrong value.")
assert type(timeout_ms) is int, _t("timeout_ms bir int olmalı (tırnak kullanma).", "timeout_ms must be an int (no quotes).")
assert timeout_ms == 10000, _t("timeout_ms 10000 olmalı.", "timeout_ms must be 10000.")
assert headless is True, _t("headless True olmalı (tırnaksız, büyük T).", "headless must be True (no quotes, capital T).")
assert browser == "chromium", _t("browser 'chromium' olmalı.", "browser must be 'chromium'.")
assert __output__.strip() != "", _t("En az bir değeri print() ile yazdır.", "Print at least one value with print().")
`,
      hints: [
        { tr: "Metin değerleri tırnak içinde yazılır: <code>\"chromium\"</code>. Sayılar ve <code>True</code> tırnaksız.", en: "Text values go in quotes: <code>\"chromium\"</code>. Numbers and <code>True</code> have no quotes." },
        { tr: "<code>...</code> (Ellipsis) sadece yer tutucu; onu gerçek değerle değiştir.", en: "<code>...</code> (Ellipsis) is just a placeholder; replace it with the real value." }
      ] },
    { id: "01-e2",
      title: { tr: "Ortam değişkenlerini çevir", en: "Convert environment values" },
      prompt: {
        tr: `<p>Ortam değişkenleri hep metin olarak gelir. Verilen <code>raw_timeout</code> ve <code>raw_headless</code> değerlerinden:</p><ul><li><code>timeout_s</code>: saniye cinsinden <strong>float</strong> (2500 ms → <code>2.5</code>)</li><li><code>headless</code>: <code>raw_headless</code> küçük harfe çevrildiğinde <code>"true"</code> ise <code>True</code>, değilse <code>False</code></li></ul><p>İpucu: <code>bool(raw_headless)</code> kullanma — neden? Yukarıdaki uyarıya bak.</p>`,
        en: `<p>Environment variables always arrive as text. From the given <code>raw_timeout</code> and <code>raw_headless</code> compute:</p><ul><li><code>timeout_s</code>: a <strong>float</strong> in seconds (2500 ms → <code>2.5</code>)</li><li><code>headless</code>: <code>True</code> if <code>raw_headless</code> lower-cased equals <code>"true"</code>, otherwise <code>False</code></li></ul><p>Hint: don't use <code>bool(raw_headless)</code> — why? See the warning above.</p>`
      },
      starter: String.raw`
raw_timeout = "2500"
raw_headless = "TRUE"

timeout_s = raw_timeout
headless = bool(raw_headless)

print(timeout_s, headless)
`,
      solution: String.raw`
raw_timeout = "2500"
raw_headless = "TRUE"

timeout_s = int(raw_timeout) / 1000
headless = raw_headless.lower() == "true"

print(timeout_s, headless)
`,
      check: String.raw`
assert isinstance(timeout_s, float), _t("timeout_s bir float olmalı. int(...) / 1000 deneyebilirsin.", "timeout_s must be a float. Try int(...) / 1000.")
assert timeout_s == 2.5, _t(f"timeout_s 2.5 olmalı, şu an {timeout_s!r}.", f"timeout_s should be 2.5, it is {timeout_s!r}.")
assert headless is True, _t("headless True olmalı.", "headless should be True.")
assert "lower()" in __source__, _t("headless'ı bool() ile değil, .lower() == \"true\" karşılaştırmasıyla hesapla.", "Compute headless with a .lower() == \"true\" comparison, not bool().")
`,
      hints: [
        { tr: "Önce <code>int(raw_timeout)</code> ile sayıya çevir, sonra <code>/ 1000</code>.", en: "First convert with <code>int(raw_timeout)</code>, then <code>/ 1000</code>." },
        { tr: "<code>raw_headless.lower()</code> → <code>\"true\"</code>. Bunu <code>== \"true\"</code> ile karşılaştırınca sonuç zaten bir bool olur.", en: "<code>raw_headless.lower()</code> → <code>\"true\"</code>. Comparing it with <code>== \"true\"</code> already gives a bool." }
      ] }
  ],
  quiz: [
    { q: { tr: "<code>type(3.0)</code> sonucu nedir?", en: "What is <code>type(3.0)</code>?" },
      options: [{ tr: "<code>int</code>", en: "<code>int</code>" }, { tr: "<code>float</code>", en: "<code>float</code>" }, { tr: "<code>str</code>", en: "<code>str</code>" }],
      answer: 1,
      explain: { tr: "Ondalık noktası olan her sayı <code>float</code>'tur; değeri tam sayı olsa bile.", en: "Any number written with a decimal point is a <code>float</code>, even if its value is whole." } },
    { q: { tr: "<code>bool(\"False\")</code> ne döndürür?", en: "What does <code>bool(\"False\")</code> return?" },
      options: [{ tr: "<code>False</code>", en: "<code>False</code>" }, { tr: "Hata verir", en: "It raises an error" }, { tr: "<code>True</code>", en: "<code>True</code>" }],
      answer: 2,
      explain: { tr: "Boş olmayan her metin <code>True</code>'dur. İçeriğinin “False” olması fark etmez.", en: "Every non-empty string is <code>True</code>. Its content being “False” doesn't matter." } },
    { q: { tr: "Bir değişkenin değeri olmadığını kontrol etmenin en doğru yolu hangisi?", en: "What is the most correct way to check that a variable has no value?" },
      options: [{ tr: "<code>if error is None:</code>", en: "<code>if error is None:</code>" }, { tr: "<code>if error == \"None\":</code>", en: "<code>if error == \"None\":</code>" }, { tr: "<code>if type(error) == 0:</code>", en: "<code>if type(error) == 0:</code>" }],
      answer: 0,
      explain: { tr: "<code>None</code> tektir; onu <code>is None</code> ile kontrol etmek Python standardıdır.", en: "There is only one <code>None</code>; checking with <code>is None</code> is the Python standard." } }
  ]
});
