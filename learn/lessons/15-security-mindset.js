SQ.addLesson({
  id: "15-security-mindset",
  num: 15,
  icon: "sec",
  minutes: 35,
  title: { tr: "Güvenlik bakış açısı: XSS/SQLi/IDOR kontrolleri nasıl çalışır", en: "Security mindset: how the XSS/SQLi/IDOR checks work" },
  summary: {
    tr: "Tarayıcıda güvenli bir simülasyonla: string birleştirmeli SQL neden tehlikeli, parametreli sorgu neden güvenli; XSS kodlama ve IDOR sahiplik kontrolü.",
    en: "With a safe in-browser simulation: why string-built SQL is dangerous and parameterized queries are safe; XSS encoding and IDOR ownership checks."
  },
  goals: {
    tr: [
      "Kaynak → hedef (source → sink) düşüncesi: girdi nereden gelip nereye gidiyor?",
      "SQL injection: <code>f\"... '{username}'\"</code> vs <code>execute(sql, (username,))</code>",
      "XSS: <code>html.escape</code> ve SecureQA'nın <code>reflects_unescaped</code> kontrolü",
      "IDOR: “bu kaynak bu kullanıcıya mı ait?” sorusu ve tespitin bir <code>Finding</code>'e dönüşmesi"
    ],
    en: [
      "Source → sink thinking: where does input come from and where does it go?",
      "SQL injection: <code>f\"... '{username}'\"</code> vs <code>execute(sql, (username,))</code>",
      "XSS: <code>html.escape</code> and SecureQA's <code>reflects_unescaped</code> check",
      "IDOR: the “does this resource belong to this user?” question, and turning detection into a <code>Finding</code>"
    ]
  },
  blocks: [
    { t: "callout", kind: "sec", title: { tr: "Önce etik", en: "Ethics first" },
      tr: `<p>Bu dersteki teknikleri yalnızca <strong>sahibi olduğun veya yazılı izin aldığın</strong> sistemlerde kullan. Projede saldırılan tek hedef <strong>OWASP Juice Shop</strong>'tur: kendi bilgisayarında (<code>127.0.0.1:3000</code>) çalıştırdığın, kasıtlı olarak zafiyetli, açık kaynak bir eğitim uygulaması. <strong>SecureShop</strong> (<code>demo_app/</code>) ise güvenli yazılmış demo mağazadır; ona karşı yalnızca savunmaların yerinde olduğunu doğrulayan kontroller çalışır. Bu sayfadaki “veritabanı” da tamamen tarayıcında çalışan, ağa hiç çıkmayan küçük bir simülasyondur (<code>MiniDB</code>).</p>`,
      en: `<p>Use the techniques in this lesson only on systems <strong>you own or have written permission to test</strong>. The only target the project attacks is <strong>OWASP Juice Shop</strong>: an intentionally vulnerable, open-source training app you run on your own machine (<code>127.0.0.1:3000</code>). <strong>SecureShop</strong> (<code>demo_app/</code>) is the securely-built demo shop; against it only checks that verify the defenses are in place run. The “database” on this page is a tiny simulation (<code>MiniDB</code>) running entirely in your browser, never touching the network.</p>` },
    { t: "text",
      tr: `<p>Sertifikalarından bildiğin saldırgan bakışını test otomasyonuna taşımanın formülü basit: <strong>her girdi güvenilmezdir</strong>. Bir girdinin geldiği yer <em>kaynak</em> (form alanı, URL parametresi, header, çerez), vardığı tehlikeli yer <em>hedeftir</em> (SQL sorgusu, HTML sayfası, dosya yolu, kabuk komutu). Zafiyet, kaynaktan hedefe giden yolda <strong>veri ile kodun karışmasıdır</strong>. Bir güvenlik testi de üç soru sorar:</p>
<ol><li><strong>Payload:</strong> Hangi girdi, veri/kod sınırını bozar? (<code>'</code>, <code>&lt;script&gt;</code>, <code>../</code>, başka bir id)</li><li><strong>Oracle:</strong> Bozulduğunu neyle kanıtlarım? (SQL hata metni, fazladan satır, script'in çalışması, başkasının verisi)</li><li><strong>Kayıt:</strong> Kanıtı nasıl raporlarım? (<code>Finding</code>: URL, kanıt, önem, OWASP, çözüm)</li></ol>`,
      en: `<p>The formula for bringing the attacker's view from your certificates into test automation is simple: <strong>all input is untrusted</strong>. Where input comes from is the <em>source</em> (form field, URL parameter, header, cookie), the dangerous place it reaches is the <em>sink</em> (SQL query, HTML page, file path, shell command). A vulnerability is <strong>data getting mixed with code</strong> on the way from source to sink. A security test asks three questions:</p>
<ol><li><strong>Payload:</strong> which input breaks the data/code boundary? (<code>'</code>, <code>&lt;script&gt;</code>, <code>../</code>, someone else's id)</li><li><strong>Oracle:</strong> how do I prove it broke? (SQL error text, extra rows, the script running, someone else's data)</li><li><strong>Record:</strong> how do I report the proof? (<code>Finding</code>: URL, evidence, severity, OWASP, remediation)</li></ol>` },
    { t: "h", tr: "1) SQL injection: string birleştirme", en: "1) SQL injection: string concatenation" },
    { t: "text",
      tr: `<p>Aşağıdaki <code>login_vulnerable</code> fonksiyonu klasik bir zafiyetli giriş mantığını taklit ediyor (Juice Shop'un “Login Admin” challenge'ının istismar ettiği türden): kullanıcı girdisini f-string ile doğrudan SQL metnine yapıştırıyor. <code>db</code>, <code>users</code> tablosu olan sahte bir veritabanı (<code>MiniDB</code>); gerçek bir SQL motoru gibi metni ayrıştırıyor, <code>--</code> yorumlarını yok sayıyor ve bozuk tırnakta hata veriyor. Hücreyi çalıştır ve her denemede <strong>üretilen SQL'e</strong> bak.</p>`,
      en: `<p>The <code>login_vulnerable</code> function below imitates a classic vulnerable login (the kind Juice Shop's “Login Admin” challenge exploits): it pastes user input straight into the SQL text with an f-string. <code>db</code> is a fake database (<code>MiniDB</code>) with a <code>users</code> table; like a real SQL engine it parses the text, ignores <code>--</code> comments and errors on a broken quote. Run the cell and look at <strong>the generated SQL</strong> for each attempt.</p>` },
    { t: "code", id: "c1", simulated: true, setup: SQ.shared.miniDb,
      title: { tr: "Zafiyetli giriş (f-string ile SQL)", en: "Vulnerable login (SQL with an f-string)" },
      code: String.raw`
def login_vulnerable(username: str, password: str):
    sql = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    print("SQL ->", sql)
    rows = db.execute(sql)
    return rows[0]["username"] if rows else None


attempts = [
    ("selcuk", "Selcuk!2026"),        # normal giriş / normal login
    ("selcuk", "yanlis"),             # yanlış parola / wrong password
    ("admin' --", "x"),               # parolayı yorum satırına çevir / comment out the password
    ("' OR '1'='1' --", "x"),         # WHERE her zaman doğru / WHERE always true
]
for user, pw in attempts:
    print("  giriş yapan / logged in as:", login_vulnerable(user, pw))
    print()

try:
    login_vulnerable("'", "x")        # SecureQA'nın SQLI_PROBE'u: tek tırnak
except MiniDBError as e:
    print("  VERİTABANI HATASI / DB ERROR:", e, " <- error-based SQLi kanıtı")
` },
    { t: "compare",
      items: [
        { kind: "bad", title: { tr: "Tehlikeli: veri koda dönüşüyor", en: "Dangerous: data becomes code" },
          code: String.raw`
username = "admin' --"
sql = f"SELECT * FROM users WHERE username = '{username}' AND password = '{pw}'"
# SELECT * FROM users WHERE username = 'admin' --' AND password = 'x'
#                                              ^^ parola kontrolü yorum oldu!
db.execute(sql)
`,
          note: { tr: "Girdideki <code>'</code> string'i erken kapatıyor, <code>--</code> geri kalan her şeyi yorum yapıyor.", en: "The <code>'</code> in the input closes the string early, <code>--</code> comments out everything after." } },
        { kind: "good", title: { tr: "Güvenli: parametreli sorgu", en: "Safe: parameterized query" },
          code: String.raw`
username = "admin' --"
sql = "SELECT * FROM users WHERE username = ? AND password = ?"
db.execute(sql, (username, pw))
# Sorgu metni SABİT. Girdi sadece bir DEĞER olarak bağlanır;
# "admin' --" adında bir kullanıcı aranır -> 0 satır.
`,
          note: { tr: "Gerçek sqlite3'te de aynı: <code>cursor.execute(sql, (username, pw))</code>. Veri asla SQL olarak ayrıştırılmaz.", en: "Same in real sqlite3: <code>cursor.execute(sql, (username, pw))</code>. Data is never parsed as SQL." } }
      ] },
    { t: "code", id: "c2", simulated: true, setup: SQ.shared.miniDb,
      title: { tr: "Aynı payload'lar, parametreli sorguyla", en: "Same payloads, parameterized query" },
      code: String.raw`
def login_safe(username: str, password: str):
    sql = "SELECT * FROM users WHERE username = ? AND password = ?"
    rows = db.execute(sql, (username, password))
    return rows[0]["username"] if rows else None


for user, pw in [("selcuk", "Selcuk!2026"), ("admin' --", "x"), ("' OR '1'='1' --", "x"), ("'", "x")]:
    print(f"{user!r:>20} -> {login_safe(user, pw)}")

print()
print("Veritabanının gördüğü / what the DB saw:")
for entry in db.log:
    print("  ", entry)
` },
    { t: "callout", kind: "qa",
      tr: `<p>SecureQA bu testi tarayıcı açmadan, HTTP ile ve iki hedefe karşı yapar:</p><ul><li><strong>SecureShop</strong> (<code>tests/security/test_injection_defenses.py</code>): arama kutusuna ve giriş formuna <code>'</code> gönderir, yanıtta <code>looks_like_sql_error()</code> ile <code>OperationalError</code>, <code>unrecognized token</code> gibi izleri arar. SecureShop parametreli sorgu kullandığı için iz yoktur → savunma kontrolü yeşil.</li><li><strong>Juice Shop</strong> (<code>tests/juiceshop/test_challenges.py</code>): <code>/rest/user/login</code>'e e-posta olarak <code>' OR 1=1--</code> gönderir; token gelirse ve Juice Shop “Login Admin” challenge'ını çözüldü işaretlerse bu bir <code>Finding</code> olur (critical, CWE-89).</li></ul>`,
      en: `<p>SecureQA runs this test without a browser, over HTTP, against two targets:</p><ul><li><strong>SecureShop</strong> (<code>tests/security/test_injection_defenses.py</code>): it sends <code>'</code> to the search box and the login form and searches the response with <code>looks_like_sql_error()</code> for traces like <code>OperationalError</code> or <code>unrecognized token</code>. SecureShop uses parameterized queries, so there are none → the defensive check is green.</li><li><strong>Juice Shop</strong> (<code>tests/juiceshop/test_challenges.py</code>): it sends <code>' OR 1=1--</code> as the email to <code>/rest/user/login</code>; if a token comes back and Juice Shop marks the “Login Admin” challenge solved, that becomes a <code>Finding</code> (critical, CWE-89).</li></ul>` },
    { t: "h", tr: "2) XSS: HTML'e kaçan girdi", en: "2) XSS: input escaping into HTML" },
    { t: "text",
      tr: `<p>XSS'te hedef SQL değil, <strong>HTML</strong>dir. Arama terimi sayfaya kodlanmadan basılırsa, tarayıcı <code>&lt;script&gt;</code>'i metin değil <strong>kod</strong> olarak görür. Çözüm, çıktıyı bağlamına göre kodlamaktır: <code>html.escape()</code> <code>&lt;</code> → <code>&amp;lt;</code>, <code>&gt;</code> → <code>&amp;gt;</code>, <code>&amp;</code> → <code>&amp;amp;</code>, tırnaklar → <code>&amp;quot;</code> / <code>&amp;#x27;</code> yapar. (Jinja2 gibi şablon motorları bunu otomatik yapar; SecureShop buna ek olarak katı bir Content-Security-Policy gönderir, bkz. <code>demo_app/security.py</code>. Juice Shop'un “DOM XSS” challenge'ı ise ön yüz girdiyi DOM'a güvensiz yazınca ne olduğunu gösterir.)</p>`,
      en: `<p>In XSS the sink is not SQL but <strong>HTML</strong>. If the search term is printed into the page unencoded, the browser treats <code>&lt;script&gt;</code> as <strong>code</strong>, not text. The fix is encoding output for its context: <code>html.escape()</code> turns <code>&lt;</code> → <code>&amp;lt;</code>, <code>&gt;</code> → <code>&amp;gt;</code>, <code>&amp;</code> → <code>&amp;amp;</code>, quotes → <code>&amp;quot;</code> / <code>&amp;#x27;</code>. (Template engines like Jinja2 do this automatically; on top of that SecureShop sends a strict Content-Security-Policy, see <code>demo_app/security.py</code>. Juice Shop's “DOM XSS” challenge shows what happens when the front-end writes input into the DOM unsafely.)</p>` },
    { t: "code", id: "c3",
      title: { tr: "Yansıyan XSS ve tespiti", en: "Reflected XSS and its detection" },
      code: String.raw`
import html

XSS_MARKER = "sqa7x9"
XSS_PAYLOADS = [
    f"<script>sqaMark('{XSS_MARKER}')</script>",
    f"<img src=x onerror=sqaMark('{XSS_MARKER}')>",
    f"\"><svg onload=sqaMark('{XSS_MARKER}')>",
]


def render_search_vulnerable(q: str) -> str:
    return f'<p>Sonuçlar: <span id="search-term">{q}</span></p>'


def render_search_secure(q: str) -> str:
    return f'<p>Sonuçlar: <span id="search-term">{html.escape(q)}</span></p>'


def reflects_unescaped(page_html: str, payload: str) -> bool:     # secureqa/security/xss.py
    return payload in page_html


for payload in XSS_PAYLOADS:
    bad = render_search_vulnerable(payload)
    good = render_search_secure(payload)
    print("payload :", payload)
    print("  vuln  :", reflects_unescaped(bad, payload), "|", bad)
    print("  secure:", reflects_unescaped(good, payload), "|", good)
` },
    { t: "callout", kind: "tip",
      tr: `<p>Metin kontrolü (<code>payload in html</code>) hızlıdır ama bir <em>belirtidir</em>. SecureQA bunu, 12. derste gördüğün tarayıcı kanıtıyla birleştirir: payload'lar <code>sqaMark('sqa7x9')</code> çağırır; script gerçekten çalışırsa <code>window.__sqa_fired == "sqa7x9"</code> olur. Benzersiz bir marker kullanmak, yanlış pozitifleri (sayfada zaten var olan bir <code>alert</code>) önler.</p>`,
      en: `<p>The text check (<code>payload in html</code>) is fast but it's a <em>symptom</em>. SecureQA combines it with the browser proof from lesson 12: payloads call <code>sqaMark('sqa7x9')</code>; if the script really runs, <code>window.__sqa_fired == "sqa7x9"</code>. A unique marker avoids false positives (an <code>alert</code> already on the page).</p>` },
    { t: "h", tr: "3) IDOR: kimin verisi?", en: "3) IDOR: whose data?" },
    { t: "text",
      tr: `<p>IDOR'da (Insecure Direct Object Reference) hiçbir “tuhaf” karakter yoktur — payload sadece <strong>başka bir id</strong>'dir. Uygulama “giriş yapmış mı?” diye bakar ama “bu sipariş <em>bu</em> kullanıcının mı?” diye sormaz. Test oracle'ı: kullanıcı A olarak giriş yap, kullanıcı B'nin kaynağını iste; 200 ve B'nin verisi geliyorsa zafiyet var.</p>`,
      en: `<p>In IDOR (Insecure Direct Object Reference) there are no “weird” characters — the payload is just <strong>another id</strong>. The app checks “is someone logged in?” but never asks “does this order belong to <em>this</em> user?”. The test oracle: log in as user A, request user B's resource; if you get 200 and B's data, it's vulnerable.</p>` },
    { t: "code", id: "c4",
      title: { tr: "Sahiplik kontrolü olmayan uç nokta", en: "An endpoint without an ownership check" },
      code: String.raw`
ORDERS = {
    101: {"id": 101, "user_id": 2, "items": ["Türk Kahvesi"], "total": 249.90},
    102: {"id": 102, "user_id": 3, "items": ["Lokum"], "total": 89.50},
}


def get_order_vulnerable(current_user_id: int, order_id: int) -> tuple[int, dict]:
    if current_user_id is None:
        return 401, {"error": "login required"}
    return 200, ORDERS[order_id]                 # sahiplik kontrolü YOK / NO ownership check


def test_idor(get_order) -> bool:
    """selcuk (id 2) olarak ayse'nin (id 3) siparişini iste."""
    status, body = get_order(current_user_id=2, order_id=102)
    exposed = status == 200 and body.get("user_id") == 3
    print(f"  status={status} body={body}")
    return exposed


print("IDOR var mı / vulnerable?", test_idor(get_order_vulnerable))
` },
    { t: "h", tr: "Tespitten rapora: Finding", en: "From detection to report: Finding" },
    { t: "code", id: "c5",
      title: { tr: "Bir kontrolün tam yaşam döngüsü", en: "The full life cycle of a check" },
      code: String.raw`
from dataclasses import dataclass, asdict
import json


@dataclass
class Finding:
    id: str
    title_en: str
    severity: str
    owasp: str
    cwe: str
    url: str
    evidence: str
    remediation_en: str


def check_reflected_xss(url: str, page_html: str, payload: str) -> Finding | None:
    if payload not in page_html:                 # oracle
        return None
    return Finding(
        id="XSS-REFLECTED", title_en="Reflected XSS", severity="high",
        owasp="A03:2021-Injection", cwe="CWE-79", url=url,
        evidence=f"payload reflected unescaped: {payload}",
        remediation_en="HTML-encode user input on output; add a Content-Security-Policy.",
    )


payload = "<script>sqaMark('sqa7x9')</script>"
page_html = f'<span id="search-term">{payload}</span>'          # vulnerable yanıt
finding = check_reflected_xss("http://127.0.0.1:5000/products?q=...", page_html, payload)
print(json.dumps(asdict(finding), indent=2) if finding else "temiz / clean")
` },
    { t: "project", file: "secureqa/security/payloads.py + sqli.py + juiceshop.py",
      tr: `<p>Bu dersin “payload → oracle → kayıt” fikri projede iki yönde kullanılıyor. SecureShop'a karşı <code>looks_like_sql_error()</code> bir <strong>savunma</strong> oracle'ı: tek tırnak gönderilir, hata izi <em>yoksa</em> kontrol geçer. Juice Shop'a karşı <code>login_sqli()</code> bir <strong>saldırı</strong>: <code>' OR 1=1--</code> ile parola kontrolü yorum satırına çevrilir; token gelirse ve challenge çözüldüyse bulgu kaydedilir.</p>`,
      en: `<p>This lesson's “payload → oracle → record” idea is used in two directions in the project. Against SecureShop, <code>looks_like_sql_error()</code> is a <strong>defensive</strong> oracle: a single quote is sent and the check passes when there is <em>no</em> error trace. Against Juice Shop, <code>login_sqli()</code> is an <strong>attack</strong>: <code>' OR 1=1--</code> comments out the password check; if a token comes back and the challenge is solved, a finding is recorded.</p>`,
      code: String.raw`
# payloads.py
SQLI_PROBE = "'"
SQLI_TRUE = "' OR '1'='1"
SQLI_COMMENT = "' OR '1'='1' --"

# sqli.py (SecureShop savunma kontrolü / defensive check)
def looks_like_sql_error(text: str) -> bool:
    """True when the text contains a tell-tale database error message."""
    lowered = text.lower()
    return any(sign.lower() in lowered for sign in SQL_ERROR_SIGNS)


# juiceshop.py (Juice Shop saldırısı / attack)
def login_sqli(self, email_payload: str = "' OR 1=1--") -> tuple[bool, str]:
    """SQL-injection login bypass via POST /rest/user/login."""
    response = self.session.post(
        self.base_url + "/rest/user/login",
        json={"email": email_payload, "password": "whatever"},
        timeout=10,
    )
    ok = response.status_code == 200 and "authentication" in response.text
`,
      notes: [
        { line: 2, tr: "Probe: veri/kod sınırını bozan en küçük girdi.", en: "Probe: the smallest input that breaks the data/code boundary." },
        { line: 10, tr: "Oracle: <code>SQL_ERROR_SIGNS</code> listesinde MiniDB'nin verdiği <code>unrecognized token</code> hatası da var!", en: "Oracle: <code>SQL_ERROR_SIGNS</code> includes the <code>unrecognized token</code> error MiniDB gave you!" },
        { line: 14, tr: "Juice Shop payload'ı: bu dersin ilk hücresindeki <code>' OR '1'='1' --</code> ile aynı fikir — <code>--</code> geri kalan SQL'i yorum yapar.", en: "Juice Shop's payload: the same idea as <code>' OR '1'='1' --</code> in this lesson's first cell — <code>--</code> comments out the rest of the SQL." },
        { line: 21, tr: "Saldırının oracle'ı: yanıtta bir oturum token'ı varsa giriş atlatıldı. Test ardından <code>/api/Challenges</code> ile doğrular ve <code>Finding</code> kaydeder.", en: "The attack's oracle: a session token in the response means the login was bypassed. The test then confirms via <code>/api/Challenges</code> and records a <code>Finding</code>." }
      ] }
  ],
  exercises: [
    { id: "15-e1",
      title: { tr: "SQLi'yi düzelt: parametreli sorgu", en: "Fix the SQLi: parameterized query" },
      setup: SQ.shared.miniDb,
      prompt: {
        tr: `<p><code>login_safe(username, password)</code> fonksiyonunu <strong>parametreli</strong> sorguyla yaz: SQL metni sabit olsun ve <code>?</code> yer tutucuları kullansın; değerleri <code>db.execute(sql, (username, password))</code> ile ver. Kullanıcı bulunursa kullanıcı adını, bulunmazsa <code>None</code> döndür. Kontrol, giriş atlatma payload'larının artık çalışmadığını ve tek tırnağın hata vermediğini doğrulayacak.</p>`,
        en: `<p>Write <code>login_safe(username, password)</code> with a <strong>parameterized</strong> query: the SQL text must be constant and use <code>?</code> placeholders; pass the values with <code>db.execute(sql, (username, password))</code>. Return the username if found, else <code>None</code>. The check verifies that login-bypass payloads no longer work and that a single quote causes no error.</p>`
      },
      starter: String.raw`
def login_safe(username, password):
    sql = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    rows = db.execute(sql)
    return rows[0]["username"] if rows else None


print(login_safe("selcuk", "Selcuk!2026"))
print(login_safe("admin' --", "x"))
`,
      solution: String.raw`
def login_safe(username, password):
    sql = "SELECT * FROM users WHERE username = ? AND password = ?"
    rows = db.execute(sql, (username, password))
    return rows[0]["username"] if rows else None


print(login_safe("selcuk", "Selcuk!2026"))
print(login_safe("admin' --", "x"))
`,
      check: String.raw`
assert login_safe("selcuk", "Selcuk!2026") == "selcuk", _t("Doğru bilgilerle 'selcuk' dönmeli.", "Valid credentials must return 'selcuk'.")
assert login_safe("ayse", "yanlis") is None, _t("Yanlış parolayla None dönmeli.", "A wrong password must return None.")
for _p in ["admin' --", "' OR '1'='1' --", "admin' OR '1'='1' --"]:
    try:
        _r = login_safe(_p, "x")
    except MiniDBError as _e:
        raise AssertionError(_t(f"{_p!r} payload'ı veritabanı hatası verdi: {_e}. Parametre kullan.", f"Payload {_p!r} caused a DB error: {_e}. Use parameters."))
    assert _r is None, _t(f"{_p!r} ile giriş yapılabildi ({_r}) — sorgu hâlâ string birleştirme ile kuruluyor.", f"Logged in with {_p!r} ({_r}) — the query is still built by string concatenation.")
try:
    assert login_safe("'", "x") is None
except MiniDBError as _e:
    raise AssertionError(_t(f"Tek tırnak hata verdi: {_e}", f"A single quote caused an error: {_e}"))
db.log.clear()
login_safe("x' OR 'a'='a", "y")
assert "x' OR" not in db.log[-1].split("params=")[0], _t("SQL metni kullanıcı girdisini içermemeli; ? yer tutucularını kullan.", "The SQL text must not contain user input; use ? placeholders.")
`,
      hints: [
        { tr: "SQL metni: <code>\"SELECT * FROM users WHERE username = ? AND password = ?\"</code> — başında <code>f</code> yok!", en: "SQL text: <code>\"SELECT * FROM users WHERE username = ? AND password = ?\"</code> — no <code>f</code> prefix!" },
        { tr: "<code>rows = db.execute(sql, (username, password))</code> — değerler ikinci argümanda bir tuple olarak.", en: "<code>rows = db.execute(sql, (username, password))</code> — the values go in the second argument as a tuple." }
      ] },
    { id: "15-e2",
      title: { tr: "XSS'i düzelt: çıktıyı kodla", en: "Fix the XSS: encode output" },
      prompt: {
        tr: `<p><code>render_search_safe(q: str) -&gt; str</code> yaz: <code>'&lt;p&gt;Sonuçlar: &lt;span id="search-term"&gt;' + ... + '&lt;/span&gt;&lt;/p&gt;'</code> şeklinde HTML döndürsün ama <code>q</code>'yu <code>html.escape()</code> ile kodlasın. Normal bir arama terimi (<code>"çay"</code>) aynen görünmeli, payload'lar ise asla ham halde görünmemeli.</p>`,
        en: `<p>Write <code>render_search_safe(q: str) -&gt; str</code> returning HTML like <code>'&lt;p&gt;Sonuçlar: &lt;span id="search-term"&gt;' + ... + '&lt;/span&gt;&lt;/p&gt;'</code> but encode <code>q</code> with <code>html.escape()</code>. A normal search term (<code>"çay"</code>) must appear unchanged, while payloads must never appear raw.</p>`
      },
      starter: String.raw`
import html


def render_search_safe(q: str) -> str:
    return f'<p>Sonuçlar: <span id="search-term">{q}</span></p>'


print(render_search_safe("çay"))
print(render_search_safe("<script>sqaMark('sqa7x9')</script>"))
`,
      solution: String.raw`
import html


def render_search_safe(q: str) -> str:
    return f'<p>Sonuçlar: <span id="search-term">{html.escape(q)}</span></p>'


print(render_search_safe("çay"))
print(render_search_safe("<script>sqaMark('sqa7x9')</script>"))
`,
      check: String.raw`
_ok = render_search_safe("çay")
assert _ok == '<p>Sonuçlar: <span id="search-term">çay</span></p>', _t(f"Normal terim aynen görünmeli; gelen {_ok!r}", f"A normal term must appear unchanged; got {_ok!r}")
_payloads = ["<script>sqaMark('sqa7x9')</script>", "<img src=x onerror=sqaMark('sqa7x9')>", "\"><svg onload=sqaMark('sqa7x9')>"]
for _p in _payloads:
    _h = render_search_safe(_p)
    assert _p not in _h, _t(f"Payload ham olarak yansıdı: {_p}", f"Payload reflected raw: {_p}")
    assert "<script" not in _h and "<img" not in _h and "<svg" not in _h, _t("Hiçbir etiket kodlanmadan kalmamalı.", "No tag may remain unencoded.")
assert "&lt;script&gt;" in render_search_safe(_payloads[0]), _t("< ve > karakterleri &lt; ve &gt; olmalı (html.escape).", "< and > must become &lt; and &gt; (html.escape).")
assert "&quot;" in render_search_safe(_payloads[2]), _t("Çift tırnak da kodlanmalı (html.escape varsayılan olarak yapar).", "Double quotes must be encoded too (html.escape does it by default).")
`,
      hints: [
        { tr: "f-string içinde <code>{html.escape(q)}</code> kullan.", en: "Use <code>{html.escape(q)}</code> inside the f-string." },
        { tr: "<code>html.escape</code> varsayılan olarak <code>quote=True</code> ile tırnakları da kodlar; nitelik (attribute) bağlamları için önemlidir.", en: "<code>html.escape</code> defaults to <code>quote=True</code> and encodes quotes too; important in attribute contexts." }
      ] },
    { id: "15-e3",
      title: { tr: "IDOR'u düzelt: sahiplik kontrolü", en: "Fix the IDOR: ownership check" },
      setup: String.raw`
ORDERS = {
    101: {"id": 101, "user_id": 2, "items": ["Türk Kahvesi"], "total": 249.90},
    102: {"id": 102, "user_id": 3, "items": ["Lokum"], "total": 89.50},
}
`,
      prompt: {
        tr: `<p><code>get_order_safe(current_user_id, order_id)</code> yaz ve <code>(status, body)</code> tuple'ı döndür:</p><ul><li>Oturum yoksa (<code>current_user_id is None</code>) → <code>(401, {"error": "login required"})</code></li><li>Sipariş yoksa → <code>(404, {"error": "not found"})</code></li><li>Sipariş başka kullanıcınınsa → <code>(403, {"error": "forbidden"})</code></li><li>Aksi halde → <code>(200, sipariş)</code></li></ul><p>İpucu: güvenli bir API'de 403 yerine 404 döndürmek de yaygındır (siparişin varlığını bile sızdırmamak için) — SecureShop'un <code>/orders/&lt;id&gt;</code> ucu tam olarak bunu yapar (<code>demo_app/routes/account.py</code>). Burada ayrımı görebilmek için 403 kullan.</p>`,
        en: `<p>Write <code>get_order_safe(current_user_id, order_id)</code> returning a <code>(status, body)</code> tuple:</p><ul><li>no session (<code>current_user_id is None</code>) → <code>(401, {"error": "login required"})</code></li><li>order missing → <code>(404, {"error": "not found"})</code></li><li>order belongs to another user → <code>(403, {"error": "forbidden"})</code></li><li>otherwise → <code>(200, order)</code></li></ul><p>Tip: secure APIs often answer 404 instead of 403 (so the order's existence doesn't leak either) — SecureShop's <code>/orders/&lt;id&gt;</code> endpoint does exactly that (<code>demo_app/routes/account.py</code>). Use 403 here so the difference is visible.</p>`
      },
      starter: String.raw`
def get_order_safe(current_user_id, order_id):
    if current_user_id is None:
        return 401, {"error": "login required"}
    return 200, ORDERS[order_id]


print(get_order_safe(2, 101))
print(get_order_safe(2, 102))
`,
      solution: String.raw`
def get_order_safe(current_user_id, order_id):
    if current_user_id is None:
        return 401, {"error": "login required"}
    order = ORDERS.get(order_id)
    if order is None:
        return 404, {"error": "not found"}
    if order["user_id"] != current_user_id:
        return 403, {"error": "forbidden"}
    return 200, order


print(get_order_safe(2, 101))
print(get_order_safe(2, 102))
`,
      check: String.raw`
assert get_order_safe(None, 101) == (401, {"error": "login required"}), _t("Oturum yoksa 401 dönmeli.", "Without a session return 401.")
_s, _b = get_order_safe(2, 101)
assert _s == 200 and _b["id"] == 101, _t("Kullanıcı kendi siparişini (2 → 101) görebilmeli.", "A user must see their own order (2 → 101).")
_s, _b = get_order_safe(2, 102)
assert _s == 403, _t(f"selcuk (2), ayse'nin siparişini (102) görmemeli: 403 bekleniyordu, gelen {_s} — IDOR hâlâ var!", f"selcuk (2) must not see ayse's order (102): expected 403, got {_s} — IDOR is still there!")
assert "user_id" not in _b and "total" not in _b, _t("403 yanıtında siparişin verisi olmamalı.", "The 403 response must not contain order data.")
try:
    _r = get_order_safe(2, 999)
except KeyError:
    raise AssertionError(_t("Olmayan sipariş KeyError verdi; ORDERS.get() kullanıp 404 dön.", "A missing order raised KeyError; use ORDERS.get() and return 404."))
assert _r == (404, {"error": "not found"}), _t("Olmayan sipariş için (404, {'error': 'not found'}) dönmeli.", "A missing order must return (404, {'error': 'not found'}).")
assert get_order_safe(3, 102)[0] == 200, _t("ayse (3) kendi siparişini (102) görebilmeli.", "ayse (3) must see her own order (102).")
`,
      hints: [
        { tr: "<code>order = ORDERS.get(order_id)</code> → <code>None</code> ise 404.", en: "<code>order = ORDERS.get(order_id)</code> → if <code>None</code>, 404." },
        { tr: "Sahiplik: <code>if order[\"user_id\"] != current_user_id: return 403, {\"error\": \"forbidden\"}</code>", en: "Ownership: <code>if order[\"user_id\"] != current_user_id: return 403, {\"error\": \"forbidden\"}</code>" }
      ] }
  ],
  quiz: [
    { q: { tr: "SQL injection'ı kökten önleyen yöntem hangisi?", en: "Which technique prevents SQL injection at the root?" },
      options: [{ tr: "Girdideki tek tırnakları silmek", en: "Removing single quotes from input" }, { tr: "Parametreli sorgular (prepared statements)", en: "Parameterized queries (prepared statements)" }, { tr: "Hata mesajlarını gizlemek", en: "Hiding error messages" }],
      answer: 1, explain: { tr: "Kara liste filtreleri atlatılabilir; hata gizlemek sadece kanıtı saklar (blind SQLi yine çalışır). Parametreler veriyi koddan ayırır.", en: "Blacklist filters can be bypassed; hiding errors only hides the evidence (blind SQLi still works). Parameters separate data from code." } },
    { q: { tr: "<code>admin' --</code> payload'ındaki <code>--</code> ne işe yarar?", en: "What does the <code>--</code> in <code>admin' --</code> do?" },
      options: [{ tr: "Sorgunun geri kalanını (parola kontrolünü) yorum satırı yapar", en: "Comments out the rest of the query (the password check)" }, { tr: "Kullanıcıyı siler", en: "Deletes the user" }, { tr: "Hiçbir şey; sadece süs", en: "Nothing; decoration only" }],
      answer: 0, explain: { tr: "SQL'de <code>--</code> satırın sonuna kadar yorumdur; <code>AND password = ...</code> hiç çalışmaz.", en: "In SQL <code>--</code> starts a comment until end of line; <code>AND password = ...</code> never runs." } },
    { q: { tr: "Bir IDOR testinin “oracle”ı (kanıtı) nedir?", en: "What is the oracle (proof) of an IDOR test?" },
      options: [{ tr: "Yanıtta <code>&lt;script&gt;</code> görünmesi", en: "Seeing <code>&lt;script&gt;</code> in the response" }, { tr: "SQL hata mesajı", en: "An SQL error message" }, { tr: "Kullanıcı A olarak, kullanıcı B'nin verisinin 200 ile gelmesi", en: "As user A, getting user B's data with a 200" }],
      answer: 2, explain: { tr: "IDOR'da payload sadece başka bir id'dir; kanıt başkasının verisidir.", en: "In IDOR the payload is just another id; the proof is someone else's data." } },
    { q: { tr: "XSS'e karşı doğru savunma hangisi?", en: "Which is the right defence against XSS?" },
      options: [{ tr: "Girdiyi veritabanına kaydetmemek", en: "Not storing input in the database" }, { tr: "Çıktıyı bağlamına göre kodlamak (+ CSP ek katman olarak)", en: "Encoding output for its context (+ CSP as an extra layer)" }, { tr: "Sadece HTTPS kullanmak", en: "Using HTTPS only" }],
      answer: 1, explain: { tr: "Kodlama veriyi koddan ayırır; CSP, bir şey kaçarsa script çalıştırmayı zorlaştırır.", en: "Encoding separates data from code; CSP makes running scripts harder if something slips through." } }
  ]
});
