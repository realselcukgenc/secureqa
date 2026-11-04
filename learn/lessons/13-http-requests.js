SQ.addLesson({
  id: "13-http-requests",
  num: 13,
  icon: "HTTP",
  minutes: 30,
  title: { tr: "HTTP ve requests", en: "HTTP & requests" },
  summary: {
    tr: "Metot, durum kodu, header, çerez ve JSON; requests.Session ile API testleri, güvenlik header'ları ve IDOR kontrolü.",
    en: "Methods, status codes, headers, cookies and JSON; API tests with requests.Session, security headers and an IDOR check."
  },
  goals: {
    tr: [
      "HTTP isteğinin ve yanıtının parçaları: metot, URL, durum kodu, header'lar, gövde",
      "<code>requests.get/post</code>, <code>params=</code>, <code>data=</code>, <code>json=</code>, <code>timeout=</code>",
      "<code>Session</code> ile çerezleri korumak, <code>allow_redirects=False</code> ile yönlendirmeyi görmek",
      "API seviyesinde güvenlik kontrolleri: eksik header, hassas veri ifşası, IDOR"
    ],
    en: [
      "Parts of an HTTP request and response: method, URL, status code, headers, body",
      "<code>requests.get/post</code>, <code>params=</code>, <code>data=</code>, <code>json=</code>, <code>timeout=</code>",
      "Keeping cookies with a <code>Session</code>, seeing redirects with <code>allow_redirects=False</code>",
      "API-level security checks: missing headers, sensitive data exposure, IDOR"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>Tarayıcı testleri yavaştır; birçok güvenlik kontrolü tarayıcısız, doğrudan HTTP ile çok daha hızlı yapılır. <code>requests</code> kütüphanesi Python'un en popüler HTTP istemcisidir. Network güvenliği sertifikalarından tanıdığın kavramlar burada kod olur: <strong>istek satırı</strong> (<code>GET /api/me HTTP/1.1</code>), <strong>header'lar</strong>, <strong>gövde</strong> ve yanıttaki <strong>durum kodu</strong>.</p>`,
      en: `<p>Browser tests are slow; many security checks are much faster without a browser, directly over HTTP. The <code>requests</code> library is Python's most popular HTTP client. Concepts you know from your network-security certificates become code here: the <strong>request line</strong> (<code>GET /api/me HTTP/1.1</code>), <strong>headers</strong>, <strong>body</strong> and the response <strong>status code</strong>.</p>` },
    { t: "callout", kind: "info", title: { tr: "Simülasyon hakkında", en: "About the simulation" },
      tr: `<p>Bu sayfadaki Python internete çıkamaz; düzenlenebilir hücrelerde <code>import requests</code>, tarayıcıda çalışan küçük bir sahte sunucuya, <strong>MiniShop (simülasyon)</strong>'a bağlanan taklit bir modül getirir. API'si gerçeğiyle aynı: <code>Session</code>, <code>get</code>, <code>post</code>, <code>status_code</code>, <code>headers</code>, <code>json()</code>. MiniShop varsayılan olarak bilerek zafiyetlidir; <code>FakeServer(secure=True)</code> savunmaları açar. Gerçek projede <code>requests</code> iki hedefe gider: SecureShop'a savunma kontrolleri için (<code>tests/security/</code>) ve OWASP Juice Shop'a bulgular için (<code>secureqa/juiceshop.py</code> içindeki <code>JuiceShopClient</code>).</p>`,
      en: `<p>The Python on this page can't reach the internet; in the editable cells <code>import requests</code> gives you an imitation that talks to a small fake server running in the browser, <strong>MiniShop (simulation)</strong>. Its API matches the real one: <code>Session</code>, <code>get</code>, <code>post</code>, <code>status_code</code>, <code>headers</code>, <code>json()</code>. MiniShop is deliberately vulnerable by default; <code>FakeServer(secure=True)</code> turns the defenses on. In the real project <code>requests</code> talks to two targets: SecureShop for defensive checks (<code>tests/security/</code>) and OWASP Juice Shop for findings (<code>JuiceShopClient</code> in <code>secureqa/juiceshop.py</code>).</p>` },
    { t: "code", id: "c1", simulated: true, setup: SQ.shared.fakeHttp,
      title: { tr: "İlk istek", en: "First request" },
      code: String.raw`
import requests

BASE = "http://127.0.0.1:5000"

response = requests.get(f"{BASE}/api/users/2", timeout=5)
print(response, response.status_code, response.ok)
print("Content-Type:", response.headers["content-type"])   # büyük/küçük harf duyarsız
data = response.json()                                     # JSON -> dict
print(data["username"], data["email"])
print("Hassas alan var mı / sensitive field?", "password_hash" in data)

search = requests.get(f"{BASE}/products", params={"q": "çay"}, timeout=5)
print(search.url)                                          # params URL'ye kodlanarak eklenir
` },
    { t: "h", tr: "Durum kodları: hızlı tablo", en: "Status codes: quick table" },
    { t: "text",
      tr: `<table><thead><tr><th>Kod</th><th>Anlamı</th><th>Güvenlik testinde</th></tr></thead><tbody>
<tr><td><code>200</code></td><td>OK</td><td>Korumalı bir kaynak için 200 + gizli veri = erişim kontrolü sorunu</td></tr>
<tr><td><code>302</code></td><td>Yönlendirme (<code>Location</code> header'ı)</td><td>Dış bir siteye yönleniyorsa: açık yönlendirme</td></tr>
<tr><td><code>401</code> / <code>403</code></td><td>Kimlik yok / yetki yok</td><td>Güvenli uygulamanın vermesi gereken yanıt</td></tr>
<tr><td><code>404</code></td><td>Bulunamadı</td><td>SecureShop'ta <code>/debug</code> yok; başkasının siparişi de 403 değil 404 döner (var olduğu bile sızmasın)</td></tr>
<tr><td><code>429</code></td><td>Çok fazla istek</td><td>Rate limit var demek: SecureShop dakikada 5 hatalı girişten sonra 429 verir</td></tr>
<tr><td><code>500</code></td><td>Sunucu hatası</td><td>Gövdede traceback/SQL hatası varsa: bilgi ifşası, SQLi belirtisi</td></tr>
</tbody></table>`,
      en: `<table><thead><tr><th>Code</th><th>Meaning</th><th>In a security test</th></tr></thead><tbody>
<tr><td><code>200</code></td><td>OK</td><td>200 + secret data for a protected resource = access-control issue</td></tr>
<tr><td><code>302</code></td><td>Redirect (<code>Location</code> header)</td><td>Redirecting to an external site: open redirect</td></tr>
<tr><td><code>401</code> / <code>403</code></td><td>Not authenticated / not authorized</td><td>What a secure app should answer</td></tr>
<tr><td><code>404</code></td><td>Not found</td><td>SecureShop has no <code>/debug</code>; someone else's order also returns 404, not 403 (so even its existence doesn't leak)</td></tr>
<tr><td><code>429</code></td><td>Too many requests</td><td>Rate limiting exists: SecureShop answers 429 after 5 failed logins per minute</td></tr>
<tr><td><code>500</code></td><td>Server error</td><td>Traceback/SQL error in the body: information disclosure, SQLi sign</td></tr>
</tbody></table>` },
    { t: "code", id: "c2", simulated: true, setup: SQ.shared.fakeHttp,
      title: { tr: "Session, POST, çerezler ve yönlendirme", en: "Session, POST, cookies and redirects" },
      code: String.raw`
import requests

BASE = "http://127.0.0.1:5000"

with requests.Session() as api:
    r = api.post(f"{BASE}/login", data={"username": "selcuk", "password": "Selcuk!2026"},
                 timeout=5, allow_redirects=False)
    print("login:", r.status_code, "->", r.headers.get("Location"))
    print("Set-Cookie:", r.headers.get("Set-Cookie"))      # HttpOnly / SameSite var mı?
    print("session cookie:", api.cookies.get("session"))

    order = api.get(f"{BASE}/orders/102", timeout=5)       # 102 = ayse'nin siparişi!
    print("order 102:", order.status_code, order.text)

    redirect = api.get(f"{BASE}/redirect?next=https://evil.example.com", timeout=5, allow_redirects=False)
    print("redirect:", redirect.status_code, redirect.headers["Location"])
` },
    { t: "callout", kind: "sec",
      tr: `<p>Zafiyetli MiniShop simülasyonunun çıktısında üç zafiyet var: (1) <code>Set-Cookie</code> içinde <code>HttpOnly</code> ve <code>SameSite</code> yok; (2) selcuk olarak giriş yapmışken ayse'nin 102 numaralı siparişi görüntülenebiliyor (<strong>IDOR</strong>, OWASP A01); (3) <code>/redirect</code> kullanıcıyı dış bir siteye yolluyor (<strong>açık yönlendirme</strong>). Gerçek SecureShop üçüne de karşı korunur ve SecureQA bunu savunma kontrolleriyle doğrular: <code>test_session_cookie_is_hardened</code> (HttpOnly + SameSite), <code>test_orders_are_owner_only</code> (IDOR yok); açık yönlendirmeyi ise <code>demo_app/auth.py</code> içindeki <code>safe_next_url()</code> engeller.</p>`,
      en: `<p>The output of the vulnerable MiniShop simulation shows three vulnerabilities: (1) <code>Set-Cookie</code> lacks <code>HttpOnly</code> and <code>SameSite</code>; (2) logged in as selcuk you can view ayse's order 102 (<strong>IDOR</strong>, OWASP A01); (3) <code>/redirect</code> sends the user to an external site (<strong>open redirect</strong>). The real SecureShop defends against all three and SecureQA verifies it with defensive checks: <code>test_session_cookie_is_hardened</code> (HttpOnly + SameSite), <code>test_orders_are_owner_only</code> (no IDOR); the open redirect is blocked by <code>safe_next_url()</code> in <code>demo_app/auth.py</code>.</p>` },
    { t: "callout", kind: "warn",
      tr: `<p>Her istekte <code>timeout=</code> ver! Vermezsen <code>requests</code> sonsuza kadar bekleyebilir ve CI'daki test koşun asılı kalır. SecureQA'daki tüm çağrılar <code>timeout=5</code> kullanıyor. (Simülasyon da unuttuğunda uyarı basıyor.)</p>`,
      en: `<p>Always pass <code>timeout=</code>! Without it <code>requests</code> may wait forever and your CI run hangs. Every call in SecureQA uses <code>timeout=5</code>. (The simulation prints a warning when you forget.)</p>` },
    { t: "code", id: "c3", simulated: true, setup: SQ.shared.fakeHttp,
      title: { tr: "Zafiyetli ve savunmalı simülasyonu karşılaştır", en: "Compare the vulnerable and defended simulation" },
      code: String.raw`
import requests

BASE = "http://127.0.0.1:5000"
EXPECTED = ["Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options"]

for secure in (False, True):
    api = requests.Session(server=FakeServer(secure=secure))   # simülasyona özel parametre
    r = api.get(BASE + "/", timeout=5)
    missing = [h for h in EXPECTED if h not in r.headers]
    user = api.get(BASE + "/api/users/1", timeout=5)
    mode = "secure" if secure else "vulnerable"
    print(f"[{mode}] Server={r.headers.get('Server')!r} missing={missing}")
    print(f"[{mode}] /api/users/1 -> {user.status_code} {user.text[:70]}")
` },
    { t: "project", file: "headers.py + test_access_control_defenses.py + demo_app/routes/account.py",
      tr: `<p>Gerçek kod, üç parça. <code>inspect()</code> bir URL'yi isteyip header'ları bir dataclass'a (14. ders) koyuyor. SecureShop savunma kontrolü, selcuk olarak giriş yapıp sipariş numaralarını tek tek deniyor; yönlendirmeleri takip etmiyor ki 302/403/404 açıkça görülsün. Son parça ise kontrolün doğruladığı <strong>savunma</strong>: SecureShop sunucu tarafında sahipliği kontrol ediyor.</p>`,
      en: `<p>Real code, in three parts. <code>inspect()</code> requests a URL and stores the headers in a dataclass (lesson 14). The SecureShop defensive check logs in as selcuk and tries order numbers one by one, without following redirects so 302/403/404 stay visible. The last part is the <strong>defense</strong> the check verifies: SecureShop checks ownership on the server.</p>`,
      code: String.raw`
def inspect(session: requests.Session, url: str) -> HeaderReport:
    """Fetch url and return a HeaderReport of its response headers."""
    response = session.get(url, timeout=5)
    # requests gives a case-insensitive mapping; copy to a normal dict for the report.
    return HeaderReport(url=url, headers=dict(response.headers))


# tests/security/test_access_control_defenses.py (test_orders_are_owner_only)
for order_id in range(1, 8):
    url = f"{base_url}/orders/{order_id}"
    response = session.get(url, timeout=5, allow_redirects=False)
    statuses.append(f"{order_id}:{response.status_code}")
    if response.status_code == 200 and AYSE.username in response.text.lower():
        leaked_url = url
        break


# demo_app/routes/account.py (SecureShop)
@bp.get("/orders/<int:order_id>")
@login_required
def order(order_id: int) -> Any:
    row = query("SELECT * FROM orders WHERE id = ?", (order_id,), one=True)
    if row is None or (row["user_id"] != g.user["id"] and not is_admin()):
        abort(404)
`,
      notes: [
        { line: 1, tr: "Session parametre olarak geliyor: testte bu, <code>api</code> fixture'ı.", en: "The session is passed in: in tests it's the <code>api</code> fixture." },
        { line: 5, tr: "<code>dict(...)</code>: büyük/küçük harf duyarsız header nesnesi sıradan bir sözlüğe kopyalanıyor (rapor JSON'u için).", en: "<code>dict(...)</code>: the case-insensitive header object is copied into a plain dict (for the report JSON)." },
        { line: 11, tr: "<code>allow_redirects=False</code>: login'e yönlendirme “korumalı” demektir; takip edersek bunu kaçırırız.", en: "<code>allow_redirects=False</code>: a redirect to login means “protected”; following it would hide that." },
        { line: 13, tr: "200 <em>ve</em> başka bir kullanıcının verisi = IDOR. Bulunursa döngü durur ve kontrol FAIL olur.", en: "200 <em>and</em> another user's data = IDOR. If found, the loop stops and the check FAILS." },
        { line: 23, tr: "Savunma: sahiplik her istekte veritabanından kontrol ediliyor (OWASP A01).", en: "The defense: ownership is checked against the database on every request (OWASP A01)." },
        { line: 24, tr: "403 yerine 404: saldırgan hangi sipariş numaralarının var olduğunu bile öğrenemez.", en: "404 instead of 403: an attacker can't even learn which order numbers exist." }
      ] }
  ],
  exercises: [
    { id: "13-e1",
      title: { tr: "Hassas veri ifşasını tespit et", en: "Detect sensitive data exposure" },
      setup: SQ.shared.fakeHttp,
      prompt: {
        tr: `<p>MiniShop simülasyonunun (varsayılan, zafiyetli) API'sine <code>requests</code> ile <strong>oturum açmadan</strong> <code>http://127.0.0.1:5000/api/users/3</code> adresine <code>timeout=5</code> ile GET isteği at. Sonra:</p><ul><li><code>status</code>: yanıtın durum kodu</li><li><code>data</code>: <code>response.json()</code></li><li><code>leaked</code>: yanıtta <code>"password_hash"</code> anahtarı var mı (bool)</li><li><code>leaked_email</code>: <code>data</code> içindeki e-posta</li></ul>`,
        en: `<p>Against the (default, vulnerable) MiniShop simulation API, use <code>requests</code> to send a GET to <code>http://127.0.0.1:5000/api/users/3</code> <strong>without logging in</strong>, with <code>timeout=5</code>. Then:</p><ul><li><code>status</code>: the response status code</li><li><code>data</code>: <code>response.json()</code></li><li><code>leaked</code>: does the response contain the <code>"password_hash"</code> key (bool)</li><li><code>leaked_email</code>: the email in <code>data</code></li></ul>`
      },
      starter: String.raw`
import requests

BASE = "http://127.0.0.1:5000"

response = ...
status = None
data = {}
leaked = False
leaked_email = None

print(status, leaked, leaked_email)
`,
      solution: String.raw`
import requests

BASE = "http://127.0.0.1:5000"

response = requests.get(f"{BASE}/api/users/3", timeout=5)
status = response.status_code
data = response.json()
leaked = "password_hash" in data
leaked_email = data["email"]

print(status, leaked, leaked_email)
`,
      check: String.raw`
assert status == 200, _t(f"status 200 olmalı (simülasyondaki zafiyetli API korumasız), şu an {status!r}.", f"status should be 200 (the simulated vulnerable API is unprotected), it is {status!r}.")
assert isinstance(data, dict) and data.get("id") == 3, _t("data, /api/users/3 yanıtının json() sonucu olmalı.", "data must be the json() of the /api/users/3 response.")
assert leaked is True, _t("leaked True olmalı: \"password_hash\" in data", "leaked must be True: \"password_hash\" in data")
assert leaked_email == "ayse@minishop.test", _t("leaked_email = data[\"email\"]", "leaked_email = data[\"email\"]")
assert "timeout= verilmedi" not in __output__, _t("İsteğe timeout=5 ekle.", "Add timeout=5 to the request.")
`,
      hints: [
        { tr: "<code>response = requests.get(f\"{BASE}/api/users/3\", timeout=5)</code>", en: "<code>response = requests.get(f\"{BASE}/api/users/3\", timeout=5)</code>" },
        { tr: "<code>status = response.status_code</code>, <code>data = response.json()</code>, <code>leaked = \"password_hash\" in data</code>", en: "<code>status = response.status_code</code>, <code>data = response.json()</code>, <code>leaked = \"password_hash\" in data</code>" }
      ] },
    { id: "13-e2",
      title: { tr: "Eksik güvenlik header'ları", en: "Missing security headers" },
      setup: SQ.shared.fakeHttp,
      prompt: {
        tr: `<p><code>missing_security_headers(headers: dict) -&gt; list[str]</code> fonksiyonunu yaz. <code>EXPECTED</code> listesindeki header'lardan <code>headers</code> içinde <strong>olmayanları</strong>, <code>EXPECTED</code>'daki sırayla döndürsün. Header adları <strong>büyük/küçük harf duyarsız</strong> karşılaştırılmalı (<code>"x-frame-options"</code> = <code>"X-Frame-Options"</code>). Parametre sıradan bir <code>dict</code> olabilir.</p>`,
        en: `<p>Write <code>missing_security_headers(headers: dict) -&gt; list[str]</code>. Return the headers from <code>EXPECTED</code> that are <strong>not</strong> in <code>headers</code>, in <code>EXPECTED</code>'s order. Header names must be compared <strong>case-insensitively</strong> (<code>"x-frame-options"</code> = <code>"X-Frame-Options"</code>). The argument may be a plain <code>dict</code>.</p>`
      },
      starter: String.raw`
EXPECTED = ["Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options"]


def missing_security_headers(headers):
    return [name for name in EXPECTED if name not in headers]


print(missing_security_headers({"Server": "MiniShop/0.9", "x-frame-options": "DENY"}))
`,
      solution: String.raw`
EXPECTED = ["Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options"]


def missing_security_headers(headers):
    present = {name.lower() for name in headers}
    return [name for name in EXPECTED if name.lower() not in present]


print(missing_security_headers({"Server": "MiniShop/0.9", "x-frame-options": "DENY"}))
`,
      check: String.raw`
_E = ["Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options"]
assert missing_security_headers({}) == _E, _t("Boş header'larda üçü de eksik olmalı (EXPECTED sırasıyla).", "With no headers all three are missing (in EXPECTED order).")
_got = missing_security_headers({"Server": "MiniShop/0.9", "x-frame-options": "DENY"})
assert _got == ["Content-Security-Policy", "X-Content-Type-Options"], _t(f"Küçük harfli 'x-frame-options' mevcut sayılmalı. Gelen: {_got}", f"Lower-case 'x-frame-options' must count as present. Got: {_got}")
_all = {"content-security-policy": "default-src 'self'", "X-FRAME-OPTIONS": "DENY", "X-Content-Type-Options": "nosniff"}
assert missing_security_headers(_all) == [], _t("Hepsi varsa boş liste dönmeli.", "If all are present return an empty list.")
import requests as _rq
_r = _rq.Session(server=FakeServer(secure=True)).get("http://127.0.0.1:5000/", timeout=5)
assert missing_security_headers(dict(_r.headers)) == [], _t("Savunmalı (secure=True) sunucunun yanıtında eksik header olmamalı.", "The defended (secure=True) server's response has no missing headers.")
`,
      hints: [
        { tr: "Önce mevcut header adlarını küçük harfe çevirip bir set yap: <code>present = {n.lower() for n in headers}</code>.", en: "First build a lower-cased set of present names: <code>present = {n.lower() for n in headers}</code>." },
        { tr: "Sonra <code>[name for name in EXPECTED if name.lower() not in present]</code>.", en: "Then <code>[name for name in EXPECTED if name.lower() not in present]</code>." }
      ] }
  ],
  quiz: [
    { q: { tr: "Korumalı bir sayfanın login'e yönlendirip yönlendirmediğini görmek için hangi parametre gerekir?", en: "Which parameter lets you see whether a protected page redirects to login?" },
      options: [{ tr: "<code>allow_redirects=False</code>", en: "<code>allow_redirects=False</code>" }, { tr: "<code>verify=False</code>", en: "<code>verify=False</code>" }, { tr: "<code>stream=True</code>", en: "<code>stream=True</code>" }],
      answer: 0, explain: { tr: "Yoksa requests 302'yi takip eder ve sen sadece son sayfayı (200) görürsün.", en: "Otherwise requests follows the 302 and you only see the final page (200)." } },
    { q: { tr: "Kullanıcı 2 olarak giriş yapmışken <code>/orders/102</code> (kullanıcı 3'ün siparişi) 200 ile dönüyor. Bu hangi zafiyet?", en: "Logged in as user 2, <code>/orders/102</code> (user 3's order) returns 200. Which vulnerability is this?" },
      options: [{ tr: "XSS", en: "XSS" }, { tr: "IDOR (bozuk erişim kontrolü)", en: "IDOR (broken access control)" }, { tr: "CSRF", en: "CSRF" }],
      answer: 1, explain: { tr: "Nesneye doğrudan referansla yetkisiz erişim: OWASP A01:2021.", en: "Unauthorized access via a direct object reference: OWASP A01:2021." } },
    { q: { tr: "<code>requests</code> çağrılarında <code>timeout</code> vermemenin riski?", en: "Risk of not passing <code>timeout</code> to <code>requests</code> calls?" },
      options: [{ tr: "SSL doğrulaması kapanır", en: "SSL verification is disabled" }, { tr: "Çerezler kaybolur", en: "Cookies are lost" }, { tr: "İstek sonsuza kadar bekleyip test koşusunu asabilir", en: "The request may wait forever and hang the test run" }],
      answer: 2, explain: { tr: "requests'in varsayılan timeout'u yoktur.", en: "requests has no default timeout." } }
  ]
});
