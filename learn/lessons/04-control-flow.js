SQ.addLesson({
  id: "04-control-flow",
  num: 4,
  icon: "if",
  minutes: 25,
  title: { tr: "Koşullar ve döngüler", en: "Conditions & loops" },
  summary: {
    tr: "if/elif/else ile karar ver, for ve while ile tekrarla: durum kodu sınıflandırma ve “bekle-tekrar dene” kalıbı.",
    en: "Decide with if/elif/else, repeat with for and while: classifying status codes and the “wait and retry” pattern."
  },
  goals: {
    tr: [
      "<code>if</code> / <code>elif</code> / <code>else</code> ve karşılaştırma operatörleri",
      "<code>and</code>, <code>or</code>, <code>not</code> ve “truthy/falsy” değerler",
      "<code>for</code> ile liste, <code>range</code>, <code>enumerate</code>, <code>dict.items()</code> gezmek",
      "<code>while</code>, <code>break</code>, <code>continue</code> ve <code>any()</code> / <code>all()</code>"
    ],
    en: [
      "<code>if</code> / <code>elif</code> / <code>else</code> and comparison operators",
      "<code>and</code>, <code>or</code>, <code>not</code> and “truthy/falsy” values",
      "Looping over lists, <code>range</code>, <code>enumerate</code>, <code>dict.items()</code> with <code>for</code>",
      "<code>while</code>, <code>break</code>, <code>continue</code> and <code>any()</code> / <code>all()</code>"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>Python blokları <strong>girinti</strong> ile belirler: süslü parantez yok. Satır sonundaki <code>:</code> yeni bir blok başlatır, bloğun içi <strong>4 boşluk</strong> içeride yazılır. Editörde <kbd>Enter</kbd>'a bastığında girinti otomatik eklenir; <kbd>Tab</kbd> 4 boşluk ekler, <kbd>Shift</kbd>+<kbd>Tab</kbd> geri alır.</p>`,
      en: `<p>Python marks blocks with <strong>indentation</strong>: no curly braces. A <code>:</code> at the end of a line starts a block, and its body is indented by <strong>4 spaces</strong>. When you press <kbd>Enter</kbd> in the editor the indentation is added automatically; <kbd>Tab</kbd> adds 4 spaces, <kbd>Shift</kbd>+<kbd>Tab</kbd> removes them.</p>` },
    { t: "code", id: "c1",
      title: { tr: "if / elif / else", en: "if / elif / else" },
      code: String.raw`
status = 403

if status == 200:
    print("OK")
elif status in (301, 302):
    print("Yönlendirme / redirect")
elif 400 <= status < 500:
    print("İstemci hatası / client error")   # 403 buraya düşer / lands here
else:
    print("Sunucu hatası / server error")

# Karşılaştırmalar: ==  !=  <  <=  >  >=  in  not in  is
logged_in = False
role = "admin"
if not logged_in and role == "admin":
    print("Uyarı: admin rolü var ama oturum yok -> erişim kontrolü şüpheli!")
` },
    { t: "callout", kind: "tip",
      tr: `<p><strong>Truthy / falsy:</strong> <code>if</code> her değeri bool gibi değerlendirir. <code>0</code>, <code>""</code>, <code>[]</code>, <code>{}</code>, <code>None</code> → yanlış; geri kalan her şey doğru. Bu yüzden <code>if error_text:</code> “hata metni boş değilse” demektir.</p>`,
      en: `<p><strong>Truthy / falsy:</strong> <code>if</code> evaluates any value as a bool. <code>0</code>, <code>""</code>, <code>[]</code>, <code>{}</code>, <code>None</code> → false; everything else is true. So <code>if error_text:</code> means “if the error text is not empty”.</p>` },
    { t: "h", tr: "for döngüsü", en: "The for loop" },
    { t: "text",
      tr: `<p><code>for</code> bir koleksiyonun her elemanı için bloğu bir kez çalıştırır. Veri odaklı testlerin temeli budur: aynı kontrolü her payload için tekrarla.</p>`,
      en: `<p><code>for</code> runs the block once for each item of a collection. This is the foundation of data-driven testing: repeat the same check for every payload.</p>` },
    { t: "code", id: "c2",
      title: { tr: "for, range, enumerate, items", en: "for, range, enumerate, items" },
      code: String.raw`
payloads = ["'", "' OR '1'='1", "admin' --"]
for payload in payloads:
    print("Deneniyor / trying:", payload)

for i in range(3):                 # 0, 1, 2
    print("deneme / attempt", i + 1)

for index, payload in enumerate(payloads, start=1):
    print(f"{index}. {payload}")

headers = {"Server": "SecureShop", "Content-Type": "text/html; charset=utf-8"}
for name, value in headers.items():
    print(f"{name} = {value}")
` },
    { t: "code", id: "c3",
      title: { tr: "break, continue ve any()", en: "break, continue and any()" },
      code: String.raw`
SQL_ERROR_SIGNS = ("sqlite3", "syntax error", "unrecognized token")
body = "Internal Server Error: sqlite3.OperationalError: unrecognized token"

# Döngü ile / with a loop
found = False
for sign in SQL_ERROR_SIGNS:
    if sign in body.lower():
        found = True
        print("Bulundu / found:", sign)
        break                      # ilk eşleşmede dur / stop at first match
print("loop ->", found)

# Aynı şey tek satırda / the same thing in one line
print("any  ->", any(sign in body.lower() for sign in SQL_ERROR_SIGNS))

# continue: bu elemanı atla / skip this item
for code in [200, 204, 500, 200, 503]:
    if code < 500:
        continue
    print("Sunucu hatası / server error:", code)
` },
    { t: "h", tr: "while: koşul doğru oldukça", en: "while: as long as the condition holds" },
    { t: "text",
      tr: `<p><code>while</code>, kaç kez döneceğini bilmediğin durumlar içindir. Test otomasyonundaki klasik örnek: <strong>“hazır olana kadar bekle, ama en fazla N kez dene”</strong> (polling). Playwright'ın auto-wait mekanizması da içeride benzer bir döngü çalıştırır. Bir üst sınır koymayı unutma; yoksa sonsuz döngü olur (bu sitede 10 saniye sonra kod durdurulur).</p>`,
      en: `<p><code>while</code> is for when you don't know how many times to loop. The classic test-automation example: <strong>“wait until ready, but try at most N times”</strong> (polling). Playwright's auto-wait runs a similar loop internally. Always add an upper limit, or you get an infinite loop (on this site code is stopped after 10 seconds).</p>` },
    { t: "code", id: "c4",
      title: { tr: "Bekle-ve-tekrar-dene (polling)", en: "Wait-and-retry (polling)" },
      code: String.raw`
statuses = ["starting", "starting", "starting", "ready"]   # sunucunun sırayla verdiği yanıtlar
attempt = 0
max_attempts = 10

while attempt < max_attempts:
    state = statuses[min(attempt, len(statuses) - 1)]
    attempt += 1
    print(f"deneme {attempt}: {state}")
    if state == "ready":
        break
else:
    # while'ın else'i: döngü break OLMADAN biterse çalışır
    print("Sunucu hiç hazır olmadı!")

print("Toplam deneme:", attempt)
` },
    { t: "project", file: "secureqa/security/sqli.py + headers.py",
      tr: `<p>SQL hata tespiti tek satırlık bir <code>any()</code>. Eksik header listesi ise bir list comprehension (aslında <code>for</code> + <code>if</code>). Kod kısa ama mantık tamamen bu derste öğrendiklerin.</p>`,
      en: `<p>SQL error detection is a one-line <code>any()</code>. The missing-headers list is a list comprehension (really a <code>for</code> + <code>if</code>). The code is short but the logic is exactly what you learned here.</p>`,
      code: String.raw`
def looks_like_sql_error(text: str) -> bool:
    """True when the text contains a tell-tale database error message."""
    lowered = text.lower()
    return any(sign.lower() in lowered for sign in SQL_ERROR_SIGNS)


def missing(self) -> list[str]:
    """Names of the expected security headers that are absent."""
    return [name for name in EXPECTED_HEADERS if name not in self.headers]


def banner_leaks_version(self) -> bool:
    banner = self.server_banner()
    return any(character.isdigit() for character in banner) and banner != ""
`,
      notes: [
        { line: 3, tr: "Büyük/küçük harf farkını ortadan kaldırmak için her şey küçük harfe çevriliyor.", en: "Everything is lower-cased so case differences don't matter." },
        { line: 4, tr: "<code>any(...)</code>: en az bir işaret metinde geçiyorsa <code>True</code>. İlk eşleşmede durur (tıpkı <code>break</code>).", en: "<code>any(...)</code>: <code>True</code> if at least one sign is in the text. Stops at the first match (just like <code>break</code>)." },
        { line: 9, tr: "Beklenen her header için: yanıtta <strong>yoksa</strong> listeye ekle.", en: "For every expected header: add it to the list if it is <strong>not</strong> in the response." },
        { line: 14, tr: "Server banner'ında bir rakam varsa (ör. <code>Werkzeug/3.1</code>) sürüm bilgisi sızıyor demektir.", en: "A digit in the Server banner (e.g. <code>Werkzeug/3.1</code>) means version info is leaking." }
      ] }
  ],
  exercises: [
    { id: "04-e1",
      title: { tr: "Durum kodlarını sınıflandır", en: "Classify status codes" },
      prompt: {
        tr: `<p><code>codes</code> listesindeki her kod için <code>labels</code> listesine bir etiket ekle:</p><ul><li>200–299 → <code>"ok"</code></li><li>300–399 → <code>"redirect"</code></li><li>400–499 → <code>"client_error"</code></li><li>500 ve üstü → <code>"server_error"</code></li></ul>`,
        en: `<p>For each code in <code>codes</code>, append a label to <code>labels</code>:</p><ul><li>200–299 → <code>"ok"</code></li><li>300–399 → <code>"redirect"</code></li><li>400–499 → <code>"client_error"</code></li><li>500 and above → <code>"server_error"</code></li></ul>`
      },
      starter: String.raw`
codes = [200, 302, 404, 500, 403, 201, 503]
labels = []

for code in codes:
    if code < 300:
        labels.append("ok")
    # elif ...

print(labels)
`,
      solution: String.raw`
codes = [200, 302, 404, 500, 403, 201, 503]
labels = []

for code in codes:
    if code < 300:
        labels.append("ok")
    elif code < 400:
        labels.append("redirect")
    elif code < 500:
        labels.append("client_error")
    else:
        labels.append("server_error")

print(labels)
`,
      check: String.raw`
_exp = ["ok", "redirect", "client_error", "server_error", "client_error", "ok", "server_error"]
assert isinstance(labels, list), _t("labels bir liste olmalı.", "labels must be a list.")
assert len(labels) == len(codes), _t(f"Her kod için bir etiket olmalı: {len(codes)} beklenirken {len(labels)} var.", f"One label per code: expected {len(codes)}, got {len(labels)}.")
for _c, _got, _want in zip(codes, labels, _exp):
    assert _got == _want, _t(f"{_c} için '{_want}' bekleniyordu, '{_got}' geldi.", f"Expected '{_want}' for {_c}, got '{_got}'.")
`,
      hints: [
        { tr: "<code>elif code &lt; 400:</code> yazdığında, buraya sadece 300 ve üzeri gelir çünkü 300'den küçükler ilk koşulda yakalandı.", en: "When you write <code>elif code &lt; 400:</code> only codes ≥ 300 get here, because smaller ones were caught by the first condition." },
        { tr: "Son durum için <code>else:</code> yeterli.", en: "An <code>else:</code> is enough for the last case." }
      ] },
    { id: "04-e2",
      title: { tr: "Bulguları önem derecesine göre say", en: "Count findings by severity" },
      prompt: {
        tr: `<p><code>severities</code> listesindeki değerleri say ve <code>counts</code> sözlüğünü doldur (ör. <code>counts["critical"] == 2</code>). Sonra <code>has_critical</code> değişkenine en az bir <code>"critical"</code> olup olmadığını yaz.</p>`,
        en: `<p>Count the values in <code>severities</code> and fill the <code>counts</code> dict (e.g. <code>counts["critical"] == 2</code>). Then set <code>has_critical</code> to whether there is at least one <code>"critical"</code>.</p>`
      },
      starter: String.raw`
severities = ["high", "critical", "medium", "high", "critical", "low", "high"]
counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}

# for ...

has_critical = False
print(counts, has_critical)
`,
      solution: String.raw`
severities = ["high", "critical", "medium", "high", "critical", "low", "high"]
counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}

for severity in severities:
    counts[severity] += 1

has_critical = counts["critical"] > 0
print(counts, has_critical)
`,
      check: String.raw`
assert counts == {"critical": 2, "high": 3, "medium": 1, "low": 1, "info": 0}, _t(f"counts yanlış: {counts}", f"counts is wrong: {counts}")
assert has_critical is True, _t("has_critical True olmalı.", "has_critical should be True.")
`,
      hints: [
        { tr: "Döngüde <code>counts[severity] += 1</code> — anahtar zaten 0 ile tanımlı.", en: "In the loop: <code>counts[severity] += 1</code> — every key already starts at 0." },
        { tr: "<code>has_critical = counts[\"critical\"] &gt; 0</code> veya <code>\"critical\" in severities</code>.", en: "<code>has_critical = counts[\"critical\"] &gt; 0</code> or <code>\"critical\" in severities</code>." }
      ] }
  ],
  quiz: [
    { q: { tr: "Hangisi <strong>falsy</strong> (if içinde yanlış sayılan) bir değerdir?", en: "Which value is <strong>falsy</strong>?" },
      options: [{ tr: "<code>\"0\"</code>", en: "<code>\"0\"</code>" }, { tr: "<code>[]</code>", en: "<code>[]</code>" }, { tr: "<code>-1</code>", en: "<code>-1</code>" }],
      answer: 1, explain: { tr: "Boş liste yanlıştır. <code>\"0\"</code> boş olmayan bir metin, <code>-1</code> sıfır olmayan bir sayı: ikisi de doğru.", en: "An empty list is falsy. <code>\"0\"</code> is a non-empty string and <code>-1</code> is non-zero: both truthy." } },
    { q: { tr: "<code>range(3)</code> hangi sayıları üretir?", en: "Which numbers does <code>range(3)</code> produce?" },
      options: [{ tr: "1, 2, 3", en: "1, 2, 3" }, { tr: "0, 1, 2, 3", en: "0, 1, 2, 3" }, { tr: "0, 1, 2", en: "0, 1, 2" }],
      answer: 2, explain: { tr: "0'dan başlar, 3 dahil değildir.", en: "Starts at 0, 3 is excluded." } },
    { q: { tr: "“Hazır olana kadar en fazla 10 kez dene” için en uygun yapı?", en: "Best construct for “try at most 10 times until ready”?" },
      options: [{ tr: "Üst sınırlı bir <code>while</code> + <code>break</code>", en: "A <code>while</code> with an upper limit + <code>break</code>" }, { tr: "Sınırsız <code>while True</code>", en: "An unlimited <code>while True</code>" }, { tr: "İç içe 10 tane <code>if</code>", en: "Ten nested <code>if</code>s" }],
      answer: 0, explain: { tr: "Sınır koymak sonsuz döngüyü ve asılı kalan testleri önler.", en: "A limit prevents infinite loops and hanging tests." } }
  ]
});
