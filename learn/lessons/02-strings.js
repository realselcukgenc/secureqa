SQ.addLesson({
  id: "02-strings",
  num: 2,
  icon: "f\"\"",
  minutes: 20,
  title: { tr: "String'ler ve f-string'ler", en: "Strings & f-strings" },
  summary: {
    tr: "URL, locator ve payload'ların hepsi metin: dilimleme, metotlar ve f-string ile biçimlendirme.",
    en: "URLs, locators and payloads are all text: slicing, methods and formatting with f-strings."
  },
  goals: {
    tr: [
      "İndeksleme ve dilimleme: <code>s[0]</code>, <code>s[-1]</code>, <code>s[2:5]</code>",
      "En çok kullanılan metotlar: <code>strip</code>, <code>lower</code>, <code>replace</code>, <code>split</code>, <code>join</code>, <code>startswith</code>",
      "<code>in</code> ile metin içinde arama (XSS kontrolünün kalbi!)",
      "f-string ile okunabilir mesajlar ve URL'ler üretmek"
    ],
    en: [
      "Indexing and slicing: <code>s[0]</code>, <code>s[-1]</code>, <code>s[2:5]</code>",
      "Most used methods: <code>strip</code>, <code>lower</code>, <code>replace</code>, <code>split</code>, <code>join</code>, <code>startswith</code>",
      "Searching inside text with <code>in</code> (the heart of the XSS check!)",
      "Building readable messages and URLs with f-strings"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>Bir <strong>string</strong> (<code>str</code>), karakterlerden oluşan bir dizidir. Tek (<code>'...'</code>) veya çift (<code>"..."</code>) tırnak aynı işi görür; içinde tırnak geçen metinlerde diğerini seçmek işini kolaylaştırır: <code>"' OR '1'='1"</code>. Çok satırlı metin için üç tırnak kullanılır: <code>"""..."""</code>.</p>
<p>Her karakterin bir <strong>indeksi</strong> vardır ve sayma <strong>0'dan</strong> başlar. Negatif indeks sondan sayar.</p>`,
      en: `<p>A <strong>string</strong> (<code>str</code>) is a sequence of characters. Single (<code>'...'</code>) and double (<code>"..."</code>) quotes do the same job; picking the other kind makes text with quotes easy: <code>"' OR '1'='1"</code>. Triple quotes make multi-line text: <code>"""..."""</code>.</p>
<p>Each character has an <strong>index</strong> and counting starts at <strong>0</strong>. Negative indexes count from the end.</p>` },
    { t: "code", id: "c1",
      title: { tr: "İndeksleme ve dilimleme", en: "Indexing and slicing" },
      code: String.raw`
word = "SecureQA"
print(word[0], word[1], word[-1])   # S e A
print(word[0:6])                     # Secure  (6 dahil değil / 6 not included)
print(word[6:])                      # QA
print(word[:3], word[-2:])           # Sec QA
print(len(word))                     # 8 karakter / characters

url = "http://127.0.0.1:5000/login"
print(url[:7])                       # http://
` },
    { t: "callout", kind: "tip",
      tr: `<p>Dilimleme <code>[başlangıç:bitiş]</code> şeklindedir ve <strong>bitiş dahil değildir</strong>. <code>word[0:6]</code> → indeks 0,1,2,3,4,5. Bu kural listelerde de (3. ders) aynıdır.</p>`,
      en: `<p>Slicing is <code>[start:stop]</code> and <strong>stop is not included</strong>. <code>word[0:6]</code> → indexes 0,1,2,3,4,5. The same rule applies to lists (lesson 3).</p>` },
    { t: "h", tr: "Metotlar: string'in araç kutusu", en: "Methods: the string toolbox" },
    { t: "text",
      tr: `<p>String'ler <strong>değiştirilemez</strong> (immutable): <code>lower()</code> gibi metotlar orijinali değiştirmez, <strong>yeni</strong> bir string döndürür. Sonucu kullanmak istiyorsan bir değişkene ata.</p>`,
      en: `<p>Strings are <strong>immutable</strong>: methods like <code>lower()</code> do not change the original, they return a <strong>new</strong> string. Assign the result if you want to keep it.</p>` },
    { t: "code", id: "c2",
      title: { tr: "Testlerde en sık kullanılanlar", en: "The ones you'll use most in tests" },
      code: String.raw`
error = "   Kullanıcı bulunamadı\n"
print(repr(error.strip()))            # baştaki/sondaki boşlukları sil / trim

header = "Content-Type"
print(header.lower(), header.upper())

base = "http://127.0.0.1:5000/"
print(base.rstrip("/") + "/login")    # sondaki / işaretini at / drop trailing slash

banner = "Werkzeug/3.1 Python/3.12"   # Flask'ın Server başlığı / Flask's header
print(banner.split(" "))              # ['Werkzeug/3.1', 'Python/3.12']
print(banner.startswith("Werkzeug"), banner.endswith(".12"))

parts = ["tests", "security", "test_xss.py"]
print("/".join(parts))                # tests/security/test_xss.py

payload = "<script>alert(1)</script>"
print(payload.replace("<", "&lt;").replace(">", "&gt;"))
print("script" in payload, payload.count("script"), payload.find("alert"))
` },
    { t: "callout", kind: "warn",
      tr: `<p>Türkçe büyük/küçük harf tuzağı: Python <code>"I".lower()</code> için <code>"i"</code> döndürür (Türkçe'deki <code>"ı"</code> değil) ve <code>"İ".lower()</code> sonucu iki karakterlik <code>"i̇"</code> olur. Arayüz metinlerini karşılaştırırken bunu hatırla; büyük/küçük harf duyarsız karşılaştırma için <code>casefold()</code> da var ama o da dil kurallarını bilmez.</p>`,
      en: `<p>Turkish case trap: Python returns <code>"i"</code> for <code>"I".lower()</code> (not the Turkish <code>"ı"</code>) and <code>"İ".lower()</code> becomes the two-character <code>"i̇"</code>. Remember this when comparing UI texts; <code>casefold()</code> exists for case-insensitive comparison but it doesn't know language rules either.</p>` },
    { t: "h", tr: "f-string: değerleri metne gömmek", en: "f-strings: embedding values in text" },
    { t: "text",
      tr: `<p>Başına <code>f</code> koyduğun string'in içindeki <code>{...}</code> alanları çalıştırılır ve sonucu metne yerleştirilir. <code>+</code> ile birleştirmekten çok daha okunaklıdır ve sayıları kendisi metne çevirir. Biçim belirteçleri de kullanabilirsin: <code>{fiyat:.2f}</code> (iki ondalık), <code>{deger!r}</code> (repr: tırnaklarıyla birlikte göster), <code>{x=}</code> (hata ayıklama: <code>x=5</code>).</p>`,
      en: `<p>In a string prefixed with <code>f</code>, the <code>{...}</code> fields are evaluated and the result is inserted into the text. It is much more readable than <code>+</code> concatenation and converts numbers for you. You can also use format specifiers: <code>{price:.2f}</code> (two decimals), <code>{value!r}</code> (repr: show it with quotes), <code>{x=}</code> (debugging: <code>x=5</code>).</p>` },
    { t: "code", id: "c3",
      title: { tr: "f-string örnekleri", en: "f-string examples" },
      code: String.raw`
base_url = "http://127.0.0.1:5000"
product_id = 7
term = "çay"
price = 129.9
status = 403

print(f"{base_url}/product/{product_id}")
print(f"{base_url}/products?q={term}")
print(f"Fiyat: {price:.2f} TL")
print(f"Beklenen 200, gelen {status}")
print(f"Kullanıcı adı: {'selcuk'!r}")
print(f"{status=}")
print(f"{'ID':<6}|{'Durum':^10}|")   # hizalama / alignment
` },
    { t: "callout", kind: "sec",
      tr: `<p>URL'ye kullanıcı girdisi koyarken <strong>URL kodlaması</strong> gerekir: boşluk, <code>&amp;</code>, <code>#</code>, <code>'</code> gibi karakterler adresi bozar. SecureQA'nın <code>ProductsPage.search()</code> metodu bu yüzden <code>urllib.parse.quote(query)</code> kullanıyor. f-string'i asla SQL sorgusu kurmak için kullanma — 15. derste nedenini canlı göreceğiz.</p>`,
      en: `<p>Putting user input into a URL needs <strong>URL encoding</strong>: characters like space, <code>&amp;</code>, <code>#</code>, <code>'</code> break the address. That's why SecureQA's <code>ProductsPage.search()</code> uses <code>urllib.parse.quote(query)</code>. Never use f-strings to build SQL queries — lesson 15 shows why, live.</p>` },
    { t: "code", id: "c4",
      title: { tr: "quote ile güvenli URL", en: "Safe URLs with quote" },
      code: String.raw`
from urllib.parse import quote

payload = "' OR '1'='1"
print(f"/products?q={payload}")          # ham / raw
print(f"/products?q={quote(payload)}")   # kodlanmış / encoded
` },
    { t: "project", file: "secureqa/security/xss.py",
      tr: `<p>XSS tespitinin ilk seviyesi tamamen string işlemidir! Güvenli bir uygulama <code>&lt;</code> karakterini <code>&amp;lt;</code> olarak kodlar. Eğer gönderdiğimiz payload HTML'in içinde <strong>aynen</strong> geçiyorsa, kodlanmamış demektir.</p>`,
      en: `<p>The first level of XSS detection is pure string work! A safe app encodes <code>&lt;</code> as <code>&amp;lt;</code>. If the payload we sent appears <strong>unchanged</strong> inside the HTML, it was not encoded.</p>`,
      code: String.raw`
def reflects_unescaped(html: str, payload: str) -> bool:
    """True when the *raw* payload appears in the HTML (i.e. it was NOT encoded)."""
    return payload in html


def is_encoded(html: str, payload: str) -> bool:
    """True when the payload's angle brackets are HTML-encoded somewhere in the page."""
    encoded = payload.replace("<", "&lt;").replace(">", "&gt;")
    return encoded in html
`,
      notes: [
        { line: 3, tr: "<code>in</code> operatörü: “bu metin, şu metnin içinde geçiyor mu?” → <code>True</code>/<code>False</code>.", en: "The <code>in</code> operator: “does this text occur inside that text?” → <code>True</code>/<code>False</code>." },
        { line: 8, tr: "<code>replace</code> zinciri: önce <code>&lt;</code>, sonra <code>&gt;</code> değiştirilir; her çağrı yeni bir string döndürür.", en: "A <code>replace</code> chain: first <code>&lt;</code>, then <code>&gt;</code>; each call returns a new string." },
        { line: 9, tr: "Kodlanmış hali sayfada varsa uygulama girdiyi güvenli şekilde göstermiş demektir.", en: "If the encoded form is on the page, the app displayed the input safely." }
      ] }
  ],
  exercises: [
    { id: "02-e1",
      title: { tr: "URL birleştir", en: "Join a URL" },
      prompt: {
        tr: `<p><code>base</code> sonunda <code>/</code> ile, <code>path</code> başında <code>/</code> ile geliyor. İkisini <strong>tek bir</strong> eğik çizgiyle birleştirip <code>url</code> değişkenine ata: <code>"http://127.0.0.1:5000/login"</code>. Sonra <code>f"Açılıyor: {url}"</code> yazdır.</p>`,
        en: `<p><code>base</code> ends with <code>/</code> and <code>path</code> starts with <code>/</code>. Join them with <strong>a single</strong> slash into a variable <code>url</code>: <code>"http://127.0.0.1:5000/login"</code>. Then print <code>f"Açılıyor: {url}"</code>.</p>`
      },
      starter: String.raw`
base = "http://127.0.0.1:5000/"
path = "/login"

url = base + path     # bu "//" üretir / this produces "//"
print(f"Açılıyor: {url}")
`,
      solution: String.raw`
base = "http://127.0.0.1:5000/"
path = "/login"

url = base.rstrip("/") + "/" + path.lstrip("/")
print(f"Açılıyor: {url}")
`,
      check: String.raw`
assert url == "http://127.0.0.1:5000/login", _t(f"url şu an {url!r}; beklenen 'http://127.0.0.1:5000/login'.", f"url is {url!r}; expected 'http://127.0.0.1:5000/login'.")
assert "Açılıyor: http://127.0.0.1:5000/login" in __output__, _t("f-string ile 'Açılıyor: <url>' yazdır.", "Print 'Açılıyor: <url>' with an f-string.")
`,
      hints: [
        { tr: "<code>rstrip(\"/\")</code> sağdaki, <code>lstrip(\"/\")</code> soldaki eğik çizgileri siler.", en: "<code>rstrip(\"/\")</code> removes slashes on the right, <code>lstrip(\"/\")</code> on the left." },
        { tr: "<code>base.rstrip(\"/\") + \"/\" + path.lstrip(\"/\")</code>", en: "<code>base.rstrip(\"/\") + \"/\" + path.lstrip(\"/\")</code>" }
      ] },
    { id: "02-e2",
      title: { tr: "Mini XSS kontrolü", en: "Mini XSS check" },
      prompt: {
        tr: `<p>Bir sayfanın HTML'i <code>html</code> değişkeninde. Şunları hesapla:</p><ul><li><code>encoded</code>: <code>payload</code> içindeki <code>&lt;</code> → <code>&amp;lt;</code> ve <code>&gt;</code> → <code>&amp;gt;</code> yapılmış hali</li><li><code>is_reflected</code>: ham payload HTML'de geçiyor mu? (<code>True</code>/<code>False</code>)</li><li><code>is_safe</code>: kodlanmış hali geçiyor ve ham hali geçmiyor mu?</li></ul>`,
        en: `<p>A page's HTML is in <code>html</code>. Compute:</p><ul><li><code>encoded</code>: the <code>payload</code> with <code>&lt;</code> → <code>&amp;lt;</code> and <code>&gt;</code> → <code>&amp;gt;</code></li><li><code>is_reflected</code>: does the raw payload appear in the HTML? (<code>True</code>/<code>False</code>)</li><li><code>is_safe</code>: does the encoded form appear and the raw form not?</li></ul>`
      },
      starter: String.raw`
payload = "<script>sqaMark('sqa7x9')</script>"
html = '<p>Sonuçlar: <span id="search-term">&lt;script&gt;sqaMark(\'sqa7x9\')&lt;/script&gt;</span></p>'

encoded = ...
is_reflected = ...
is_safe = ...

print(encoded, is_reflected, is_safe)
`,
      solution: String.raw`
payload = "<script>sqaMark('sqa7x9')</script>"
html = '<p>Sonuçlar: <span id="search-term">&lt;script&gt;sqaMark(\'sqa7x9\')&lt;/script&gt;</span></p>'

encoded = payload.replace("<", "&lt;").replace(">", "&gt;")
is_reflected = payload in html
is_safe = encoded in html and not is_reflected

print(encoded, is_reflected, is_safe)
`,
      check: String.raw`
assert encoded == "&lt;script&gt;sqaMark('sqa7x9')&lt;/script&gt;", _t(f"encoded yanlış: {encoded!r}", f"encoded is wrong: {encoded!r}")
assert is_reflected is False, _t("Bu HTML'de ham payload yok, is_reflected False olmalı.", "The raw payload is not in this HTML, is_reflected must be False.")
assert is_safe is True, _t("Kodlanmış hali sayfada var ve ham hali yok: is_safe True olmalı.", "The encoded form is there and the raw one isn't: is_safe must be True.")
`,
      hints: [
        { tr: "<code>payload.replace(\"&lt;\", \"&amp;lt;\")</code> sonucuna tekrar <code>.replace(...)</code> uygulayabilirsin.", en: "You can call <code>.replace(...)</code> again on the result of <code>payload.replace(\"&lt;\", \"&amp;lt;\")</code>." },
        { tr: "<code>payload in html</code> zaten bir bool verir. <code>is_safe</code> için <code>and</code> ve <code>not</code> kullan.", en: "<code>payload in html</code> already gives a bool. Use <code>and</code> and <code>not</code> for <code>is_safe</code>." }
      ] }
  ],
  quiz: [
    { q: { tr: "<code>\"SecureQA\"[0:6]</code> sonucu nedir?", en: "What is <code>\"SecureQA\"[0:6]</code>?" },
      options: [{ tr: "<code>\"Secure\"</code>", en: "<code>\"Secure\"</code>" }, { tr: "<code>\"SecureQ\"</code>", en: "<code>\"SecureQ\"</code>" }, { tr: "<code>\"ecureQ\"</code>", en: "<code>\"ecureQ\"</code>" }],
      answer: 0,
      explain: { tr: "Bitiş indeksi (6) dahil değildir: 0–5 arası karakterler alınır.", en: "The stop index (6) is excluded: characters 0–5 are taken." } },
    { q: { tr: "<code>f\"{3.14159:.2f}\"</code> ne üretir?", en: "What does <code>f\"{3.14159:.2f}\"</code> produce?" },
      options: [{ tr: "<code>\"3.14159\"</code>", en: "<code>\"3.14159\"</code>" }, { tr: "<code>\"3.14\"</code>", en: "<code>\"3.14\"</code>" }, { tr: "<code>\"3.1\"</code>", en: "<code>\"3.1\"</code>" }],
      answer: 1,
      explain: { tr: "<code>.2f</code> = noktadan sonra 2 basamak.", en: "<code>.2f</code> = 2 digits after the decimal point." } },
    { q: { tr: "<code>s = \"ABC\"; s.lower()</code> çalıştıktan sonra <code>s</code> nedir?", en: "After <code>s = \"ABC\"; s.lower()</code>, what is <code>s</code>?" },
      options: [{ tr: "<code>\"abc\"</code>", en: "<code>\"abc\"</code>" }, { tr: "<code>None</code>", en: "<code>None</code>" }, { tr: "<code>\"ABC\"</code>", en: "<code>\"ABC\"</code>" }],
      answer: 2,
      explain: { tr: "String'ler değiştirilemez. <code>lower()</code> yeni bir string döndürür; atamadığın için kayboldu.", en: "Strings are immutable. <code>lower()</code> returned a new string which was not assigned, so it's lost." } }
  ]
});
