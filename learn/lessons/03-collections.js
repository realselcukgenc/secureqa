SQ.addLesson({
  id: "03-collections",
  num: 3,
  icon: "[ ]",
  minutes: 25,
  title: { tr: "Listeler, sözlükler, tuple ve set", en: "Lists, dicts, tuples & sets" },
  summary: {
    tr: "Payload listeleri, HTTP header sözlükleri, JSON kullanıcıları: verileri gruplamanın dört yolu.",
    en: "Payload lists, HTTP header dicts, JSON users: four ways to group data."
  },
  goals: {
    tr: [
      "<code>list</code>: sıralı, değiştirilebilir koleksiyon — <code>append</code>, <code>len</code>, indeks",
      "<code>dict</code>: anahtar → değer — <code>get</code>, <code>items</code>, <code>pop</code>",
      "<code>tuple</code> (değişmez) ve <code>set</code> (tekrarsız) ne zaman kullanılır",
      "List comprehension ile tek satırda filtreleme"
    ],
    en: [
      "<code>list</code>: ordered, mutable collection — <code>append</code>, <code>len</code>, index",
      "<code>dict</code>: key → value — <code>get</code>, <code>items</code>, <code>pop</code>",
      "When to use <code>tuple</code> (immutable) and <code>set</code> (unique)",
      "Filtering in one line with a list comprehension"
    ]
  },
  blocks: [
    { t: "h", tr: "list — sıralı koleksiyon", en: "list — an ordered collection" },
    { t: "text",
      tr: `<p>Liste köşeli parantezle yazılır ve her tipte değeri tutabilir. Test otomasyonunda en sık kullanım: <strong>veri odaklı testler</strong> için girdi listeleri (payload'lar, kullanıcılar, URL'ler). String'lerdeki indeks ve dilimleme kuralları aynen geçerli.</p>`,
      en: `<p>A list is written with square brackets and can hold any type. The most common use in test automation: input lists for <strong>data-driven tests</strong> (payloads, users, URLs). Indexing and slicing rules from strings apply unchanged.</p>` },
    { t: "code", id: "c1",
      title: { tr: "Liste işlemleri", en: "List operations" },
      code: String.raw`
payloads = ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>"]
payloads.append("\"><svg onload=alert(1)>")   # sona ekle / add to end
print(len(payloads), "payload")
print(payloads[0])        # ilk / first
print(payloads[-1])       # son / last

payloads.insert(0, "'")   # başa ekle / insert at start
print(payloads[:2])

codes = [500, 200, 404, 302]
codes.sort()
print(codes, 404 in codes, codes.index(404))
codes.remove(500)
print(codes, sum(codes), max(codes))

# Liste değiştirilebilir (mutable) / lists are mutable
codes[0] = 201
print(codes)
` },
    { t: "h", tr: "dict — anahtar/değer eşlemesi", en: "dict — key/value mapping" },
    { t: "text",
      tr: `<p>Sözlük (<code>dict</code>), bir <strong>anahtardan</strong> bir <strong>değere</strong> eşleme yapar. JSON nesneleri, HTTP header'ları, form verileri… hepsi Python'da birer sözlüktür. Var olmayan anahtara <code>d["x"]</code> ile erişmek <code>KeyError</code> verir; emin değilsen <code>d.get("x", varsayılan)</code> kullan.</p>`,
      en: `<p>A dictionary (<code>dict</code>) maps a <strong>key</strong> to a <strong>value</strong>. JSON objects, HTTP headers, form data… are all dicts in Python. Accessing a missing key with <code>d["x"]</code> raises <code>KeyError</code>; when unsure use <code>d.get("x", default)</code>.</p>` },
    { t: "code", id: "c2",
      title: { tr: "Kötü yazılmış bir API yanıtı sözlük olsaydı", en: "If a badly written API response were a dict" },
      code: String.raw`
user = {
    "id": 2,
    "username": "selcuk",
    "email": "selcuk@example.com",
    "password_hash": "e10adc3949ba59abbe56e057f20f883e",
}
print(user["username"])
print(user.get("role", "user"))       # anahtar yoksa varsayılan / default if missing
user["role"] = "user"                 # ekle veya güncelle / add or update
print("password_hash" in user)        # anahtar var mı? / key exists?

for key, value in user.items():       # anahtar + değer birlikte / key + value together
    print(f"{key:>14}: {value}")

removed = user.pop("password_hash")   # sil ve değeri al / remove and return value
print(list(user.keys()))
` },
    { t: "callout", kind: "sec",
      tr: `<p>Yukarıdaki sözlük, kötü yazılmış bir API'nin klasik hatasını gösteriyor: yanıtta <code>password_hash</code> var (<strong>hassas veri ifşası</strong>). Projedeki SecureShop bu yüzden <code>/api/me</code> ucunda yalnızca izin verilen alanları döndürür (<code>id</code>, <code>username</code>, <code>email</code>, <code>role</code>) ve oturum yoksa 401 verir. <code>tests/security/test_access_control_defenses.py</code> bunu bir sözlük/metin kontrolüyle doğrular: yanıtta <code>"password_hash"</code> geçerse savunma kontrolü FAIL olur.</p>`,
      en: `<p>The dict above shows a classic mistake of a badly written API: the response contains <code>password_hash</code> (<strong>sensitive data exposure</strong>). That's why the project's SecureShop returns only an allow-list of fields from <code>/api/me</code> (<code>id</code>, <code>username</code>, <code>email</code>, <code>role</code>) and answers 401 without a session. <code>tests/security/test_access_control_defenses.py</code> verifies this with a simple membership check: if <code>"password_hash"</code> appears in the response, the defensive check FAILS.</p>` },
    { t: "h", tr: "tuple ve set", en: "tuple and set" },
    { t: "text",
      tr: `<ul><li><strong>tuple</strong> <code>( )</code>: liste gibi ama <strong>değiştirilemez</strong>. “Bu değerler sabit” demenin yolu: <code>SEVERITIES = ("critical", "high", ...)</code>. Fonksiyonlardan birden çok değer döndürmek için de kullanılır: <code>return True, "kanıt"</code>.</li>
<li><strong>set</strong> <code>{ }</code>: sırasız ve <strong>tekrarsız</strong>. Tekrarları atmak ve “hangi header'lar eksik?” gibi küme işlemleri için idealdir.</li></ul>`,
      en: `<ul><li><strong>tuple</strong> <code>( )</code>: like a list but <strong>immutable</strong>. The way to say “these values are fixed”: <code>SEVERITIES = ("critical", "high", ...)</code>. Also used to return several values from a function: <code>return True, "evidence"</code>.</li>
<li><strong>set</strong> <code>{ }</code>: unordered and <strong>unique</strong>. Ideal for removing duplicates and set operations like “which headers are missing?”.</li></ul>` },
    { t: "code", id: "c3",
      title: { tr: "Küme işlemleriyle eksik header'lar", en: "Missing headers with set operations" },
      code: String.raw`
SEVERITIES = ("critical", "high", "medium", "low", "info")
print(SEVERITIES[0], len(SEVERITIES), "high" in SEVERITIES)

is_vulnerable, evidence = True, "payload reflected"   # tuple açma / unpacking
print(is_vulnerable, evidence)

expected = {"Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options"}
received = {"Content-Type", "Server", "X-Frame-Options"}
print("Eksik / missing:", sorted(expected - received))
print("Ortak / common:", expected & received)

visited = ["/login", "/products", "/login", "/account", "/products"]
print(set(visited), len(set(visited)))
` },
    { t: "h", tr: "List comprehension", en: "List comprehension" },
    { t: "text",
      tr: `<p>Bir listeden yeni bir liste üretmenin kısa yolu: <code>[ifade for eleman in liste if koşul]</code>. Okuması: “listedeki her eleman için, koşul doğruysa, ifadeyi al”. 4. dersteki <code>for</code> döngüsünün tek satırlık halidir.</p>`,
      en: `<p>A short way to build a new list from another: <code>[expression for item in list if condition]</code>. Read it as: “for each item in the list, if the condition holds, take the expression”. It's the one-line version of the <code>for</code> loop in lesson 4.</p>` },
    { t: "code", id: "c4",
      title: { tr: "Filtrele ve dönüştür", en: "Filter and transform" },
      code: String.raw`
findings = [
    {"id": "XSS-REFLECTED", "severity": "high"},
    {"id": "SQLI-LOGIN", "severity": "critical"},
    {"id": "HEADERS-CSP", "severity": "medium"},
    {"id": "SQLI-SEARCH", "severity": "critical"},
]
critical_ids = [f["id"] for f in findings if f["severity"] == "critical"]
print(critical_ids)

lengths = [len(f["id"]) for f in findings]
print(lengths)

# dict comprehension
by_id = {f["id"]: f["severity"] for f in findings}
print(by_id["HEADERS-CSP"])
` },
    { t: "project", file: "secureqa/findings.py + security/payloads.py",
      tr: `<p>Projede dört koleksiyon tipinin hepsi var. Önem dereceleri değişmesin diye <strong>tuple</strong>; her derecenin puanı bir <strong>dict</strong>; payload'lar bir <strong>list</strong>; OWASP kategorileri ise iç içe sözlük (<code>dict[str, dict[str, str]]</code>).</p>`,
      en: `<p>The project uses all four collection types. Severities are a <strong>tuple</strong> so they can't change; each severity's points are a <strong>dict</strong>; payloads are a <strong>list</strong>; and OWASP categories are a nested dict (<code>dict[str, dict[str, str]]</code>).</p>`,
      code: String.raw`
SEVERITIES: tuple[str, ...] = ("critical", "high", "medium", "low", "info")

SEVERITY_WEIGHTS: dict[str, int] = {"critical": 10, "high": 7, "medium": 4, "low": 2, "info": 0}

OWASP_2021: dict[str, dict[str, str]] = {
    "A01:2021": {"en": "Broken Access Control", "tr": "Bozuk Erişim Kontrolü"},
    "A03:2021": {"en": "Injection", "tr": "Enjeksiyon"},
    # ...
}

XSS_MARKER = "sqa7x9"
XSS_PAYLOADS: list[str] = [
    f"<script>sqaMark('{XSS_MARKER}')</script>",
    f"<img src=x onerror=sqaMark('{XSS_MARKER}')>",
    f"\"><svg onload=sqaMark('{XSS_MARKER}')>",
]

# FindingsCollector.count_by_severity():
counts = {severity: 0 for severity in SEVERITIES}
`,
      notes: [
        { line: 1, tr: "<code>tuple[str, ...]</code>: “herhangi uzunlukta, string'lerden oluşan tuple”.", en: "<code>tuple[str, ...]</code>: “a tuple of strings, any length”." },
        { line: 3, tr: "Risk puanı hesaplanırken <code>SEVERITY_WEIGHTS[\"high\"]</code> → 7 okunur.", en: "The risk score reads <code>SEVERITY_WEIGHTS[\"high\"]</code> → 7." },
        { line: 6, tr: "İç içe erişim: <code>OWASP_2021[\"A01:2021\"][\"tr\"]</code> → “Bozuk Erişim Kontrolü”.", en: "Nested access: <code>OWASP_2021[\"A01:2021\"][\"en\"]</code> → “Broken Access Control”." },
        { line: 12, tr: "Liste elemanları f-string ile üretiliyor; marker tek yerde tanımlı.", en: "List items are built with f-strings; the marker is defined in one place." },
        { line: 19, tr: "Dict comprehension: her derece için 0 ile başlayan bir sayaç.", en: "Dict comprehension: a counter starting at 0 for every severity." }
      ] }
  ],
  exercises: [
    { id: "03-e1",
      title: { tr: "Payload listesini yönet", en: "Manage the payload list" },
      prompt: {
        tr: `<p><code>payloads</code> listesine <code>"' OR '1'='1' --"</code> ekle (<code>append</code>). Sonra:</p><ul><li><code>count</code>: listedeki eleman sayısı</li><li><code>first</code>: ilk eleman, <code>last</code>: son eleman</li><li><code>sql_payloads</code>: içinde tek tırnak (<code>'</code>) geçen payload'lar (list comprehension ile)</li></ul>`,
        en: `<p>Add <code>"' OR '1'='1' --"</code> to the <code>payloads</code> list (<code>append</code>). Then:</p><ul><li><code>count</code>: number of items in the list</li><li><code>first</code>: the first item, <code>last</code>: the last item</li><li><code>sql_payloads</code>: payloads containing a single quote (<code>'</code>) (with a list comprehension)</li></ul>`
      },
      starter: String.raw`
payloads = ["<script>alert(1)</script>", "'", "admin' --", "<img src=x onerror=alert(1)>"]

# payloads.append(...)
count = 0
first = None
last = None
sql_payloads = []

print(count, first, last, sql_payloads)
`,
      solution: String.raw`
payloads = ["<script>alert(1)</script>", "'", "admin' --", "<img src=x onerror=alert(1)>"]

payloads.append("' OR '1'='1' --")
count = len(payloads)
first = payloads[0]
last = payloads[-1]
sql_payloads = [p for p in payloads if "'" in p]

print(count, first, last, sql_payloads)
`,
      check: String.raw`
assert payloads[-1] == "' OR '1'='1' --", _t("Yeni payload listenin sonuna eklenmeli (append).", "The new payload must be added to the end (append).")
assert count == 5, _t(f"count 5 olmalı, şu an {count}. len() kullan.", f"count should be 5, it is {count}. Use len().")
assert first == "<script>alert(1)</script>", _t("first ilk eleman olmalı: payloads[0].", "first must be the first item: payloads[0].")
assert last == "' OR '1'='1' --", _t("last son eleman olmalı: payloads[-1].", "last must be the last item: payloads[-1].")
assert sql_payloads == ["'", "admin' --", "' OR '1'='1' --"], _t(f"sql_payloads yanlış: {sql_payloads}", f"sql_payloads is wrong: {sql_payloads}")
`,
      hints: [
        { tr: "<code>payloads.append(\"' OR '1'='1' --\")</code> — dış tırnak çift olduğu için içerideki tek tırnaklar sorun olmaz.", en: "<code>payloads.append(\"' OR '1'='1' --\")</code> — the outer quotes are double, so the single quotes inside are fine." },
        { tr: "<code>[p for p in payloads if \"'\" in p]</code>", en: "<code>[p for p in payloads if \"'\" in p]</code>" }
      ] },
    { id: "03-e2",
      title: { tr: "API yanıtını temizle", en: "Sanitize an API response" },
      prompt: {
        tr: `<p><code>user</code> sözlüğü API'den gelmiş. Şunları yap:</p><ul><li><code>username</code> değişkenine kullanıcı adını al</li><li><code>role</code>: <code>"role"</code> anahtarı yok; <code>get</code> ile varsayılan <code>"user"</code> al</li><li><code>leaked</code>: sözlükte <code>"password_hash"</code> anahtarı var mı? (bool)</li><li>Sonra <code>password_hash</code>'i sözlükten <strong>sil</strong> (<code>pop</code>) ve <code>user["is_admin"] = False</code> ekle</li></ul>`,
        en: `<p>The <code>user</code> dict came from the API. Do this:</p><ul><li>store the username in <code>username</code></li><li><code>role</code>: there is no <code>"role"</code> key; use <code>get</code> with the default <code>"user"</code></li><li><code>leaked</code>: does the dict contain the <code>"password_hash"</code> key? (bool)</li><li>Then <strong>remove</strong> <code>password_hash</code> from the dict (<code>pop</code>) and add <code>user["is_admin"] = False</code></li></ul>`
      },
      starter: String.raw`
user = {"id": 3, "username": "ayse", "email": "ayse@example.com", "password_hash": "25d55ad2..."}

username = ...
role = user["role"]
leaked = ...

print(username, role, leaked, user)
`,
      solution: String.raw`
user = {"id": 3, "username": "ayse", "email": "ayse@example.com", "password_hash": "25d55ad2..."}

username = user["username"]
role = user.get("role", "user")
leaked = "password_hash" in user
user.pop("password_hash")
user["is_admin"] = False

print(username, role, leaked, user)
`,
      check: String.raw`
assert username == "ayse", _t("username 'ayse' olmalı: user[\"username\"].", "username must be 'ayse': user[\"username\"].")
assert role == "user", _t("role için user.get(\"role\", \"user\") kullan.", "Use user.get(\"role\", \"user\") for role.")
assert leaked is True, _t("leaked True olmalı — sızıntı vardı! (\"password_hash\" in user, pop'tan ÖNCE)", "leaked must be True — there was a leak! (\"password_hash\" in user, BEFORE pop)")
assert "password_hash" not in user, _t("password_hash hâlâ sözlükte. user.pop(\"password_hash\") kullan.", "password_hash is still in the dict. Use user.pop(\"password_hash\").")
assert user.get("is_admin") is False, _t("user[\"is_admin\"] = False eklenmeli.", "Add user[\"is_admin\"] = False.")
assert user["email"] == "ayse@example.com", _t("Diğer anahtarlar silinmemeli.", "Other keys must stay.")
`,
      hints: [
        { tr: "<code>user[\"role\"]</code> <code>KeyError</code> verir. <code>user.get(\"role\", \"user\")</code> ise varsayılanı döndürür.", en: "<code>user[\"role\"]</code> raises <code>KeyError</code>. <code>user.get(\"role\", \"user\")</code> returns the default." },
        { tr: "Sıra önemli: önce <code>leaked = \"password_hash\" in user</code>, sonra <code>user.pop(\"password_hash\")</code>.", en: "Order matters: first <code>leaked = \"password_hash\" in user</code>, then <code>user.pop(\"password_hash\")</code>." }
      ] }
  ],
  quiz: [
    { q: { tr: "Var olmayan bir anahtar için <code>KeyError</code> almadan varsayılan değer döndüren yöntem hangisi?", en: "Which method returns a default instead of raising <code>KeyError</code> for a missing key?" },
      options: [{ tr: "<code>d[\"key\"]</code>", en: "<code>d[\"key\"]</code>" }, { tr: "<code>d.get(\"key\", default)</code>", en: "<code>d.get(\"key\", default)</code>" }, { tr: "<code>d.pop()</code>", en: "<code>d.pop()</code>" }],
      answer: 1, explain: { tr: "<code>get</code> anahtar yoksa ikinci argümanı (veya <code>None</code>) döndürür.", en: "<code>get</code> returns the second argument (or <code>None</code>) when the key is missing." } },
    { q: { tr: "Değerlerin <strong>hiç değişmemesi</strong> gereken bir önem dereceleri listesi için en uygun tip?", en: "Best type for a list of severities that must <strong>never change</strong>?" },
      options: [{ tr: "<code>list</code>", en: "<code>list</code>" }, { tr: "<code>set</code>", en: "<code>set</code>" }, { tr: "<code>tuple</code>", en: "<code>tuple</code>" }],
      answer: 2, explain: { tr: "<code>tuple</code> değiştirilemez ve sıralıdır (critical → info sırası korunur).", en: "A <code>tuple</code> is immutable and ordered (the critical → info order is kept)." } },
    { q: { tr: "<code>[c for c in [200, 404, 500] if c &gt;= 400]</code> sonucu?", en: "Result of <code>[c for c in [200, 404, 500] if c &gt;= 400]</code>?" },
      options: [{ tr: "<code>[404, 500]</code>", en: "<code>[404, 500]</code>" }, { tr: "<code>[200]</code>", en: "<code>[200]</code>" }, { tr: "<code>True</code>", en: "<code>True</code>" }],
      answer: 0, explain: { tr: "Koşulu sağlayan elemanlar yeni bir listede toplanır.", en: "Items matching the condition are collected into a new list." } }
  ]
});
