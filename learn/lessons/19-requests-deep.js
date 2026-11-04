SQ.addLesson({
  id: "19-requests-deep",
  num: 19,
  icon: "Bearer",
  minutes: 30,
  title: { tr: "HTTP & requests derinlemesine", en: "HTTP & requests in depth" },
  summary: {
    tr: "Session ile çerez/başlık taşımak, Authorization: Bearer token, JSON gövde, raise_for_status ve JuiceShopClient kalıbı.",
    en: "Carrying cookies/headers with a Session, Authorization: Bearer tokens, JSON bodies, raise_for_status, and the JuiceShopClient pattern."
  },
  goals: {
    tr: [
      "<code>requests.Session</code>: çerezleri ve ortak header'ları istekler arasında taşımak",
      "<code>Authorization: Bearer &lt;token&gt;</code> ile kimlikli API çağrıları",
      "<code>json=</code> gövde gönderme, <code>response.json()</code> ile okuma, <code>headers</code> (harf duyarsız)",
      "<code>raise_for_status()</code> ve <code>HTTPError</code> ile hata yönetimi"
    ],
    en: [
      "<code>requests.Session</code>: carrying cookies and common headers across requests",
      "Authenticated API calls with <code>Authorization: Bearer &lt;token&gt;</code>",
      "Sending a <code>json=</code> body, reading with <code>response.json()</code>, <code>headers</code> (case-insensitive)",
      "Error handling with <code>raise_for_status()</code> and <code>HTTPError</code>"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>13. derste <code>requests</code>'in temelini gördük. Modern uygulamaların çoğu durumu <strong>çerez</strong> (oturum) veya <strong>token</strong> (JWT) ile taşır; API'ler JSON konuşur. SecureQA'nın <code>JuiceShopClient</code>'ı tam olarak bunu yapar: SQLi ile giriş yapıp bir <code>authentication.token</code> alır, sonra o token'ı <code>Authorization: Bearer</code> header'ıyla her isteğe ekleyerek korumalı uçlara (sepet, kullanıcılar) erişir. Bu derste aynı kalıpları öğreniyoruz.</p>`,
      en: `<p>In lesson 13 we saw the basics of <code>requests</code>. Most modern apps carry state with a <strong>cookie</strong> (session) or a <strong>token</strong> (JWT); APIs speak JSON. SecureQA's <code>JuiceShopClient</code> does exactly this: it logs in via SQLi to get an <code>authentication.token</code>, then adds that token with an <code>Authorization: Bearer</code> header on every request to reach protected endpoints (basket, users). This lesson teaches the same patterns.</p>` },
    { t: "callout", kind: "info", title: { tr: "Simülasyon hakkında", en: "About the simulation" },
      tr: `<p>Bu sayfadaki <code>import requests</code>, tarayıcıda çalışan <strong>MiniShop (simülasyon)</strong>'a bağlanan taklit bir moduldür — gerçek ağ yok. API gerçeğiyle aynı: <code>Session</code>, <code>get/post</code>, <code>status_code</code>, <code>headers</code>, <code>json()</code>, <code>raise_for_status()</code>. MiniShop varsayılan olarak bilerek zafiyetlidir; <code>FakeServer(secure=True)</code> savunmaları açar. Gerçek projede aynı kod OWASP Juice Shop'a (<code>JuiceShopClient</code>) gider.</p>`,
      en: `<p>On this page <code>import requests</code> gives an imitation that talks to <strong>MiniShop (simulation)</strong> running in the browser — no real network. The API matches the real one: <code>Session</code>, <code>get/post</code>, <code>status_code</code>, <code>headers</code>, <code>json()</code>, <code>raise_for_status()</code>. MiniShop is deliberately vulnerable by default; <code>FakeServer(secure=True)</code> turns on the defenses. In the real project the same code talks to OWASP Juice Shop (<code>JuiceShopClient</code>).</p>` },
    { t: "h", tr: "Session: çerezler istekler arasında kalır", en: "Session: cookies persist across requests" },
    { t: "text",
      tr: `<p>Tek tek <code>requests.get()</code> çağrıları durumsuzdur: her biri çerezleri unutur. Bir <code>Session</code> ise giriş sırasında gelen <code>Set-Cookie</code>'yi hatırlar ve sonraki tüm isteklere ekler — tıpkı bir tarayıcı gibi. Güvenlik testinde bu şarttır: önce giriş yap, sonra korumalı kaynağı <strong>aynı</strong> oturumla iste.</p>`,
      en: `<p>Individual <code>requests.get()</code> calls are stateless: each forgets cookies. A <code>Session</code> remembers the <code>Set-Cookie</code> from login and adds it to every later request — like a browser. In a security test this is essential: log in first, then request the protected resource with the <strong>same</strong> session.</p>` },
    { t: "code", id: "c1", simulated: true, setup: SQ.shared.fakeHttp,
      title: { tr: "Giriş yap, çerezi taşı, siparişi gör", en: "Log in, carry the cookie, read the order" },
      code: String.raw`
import requests

BASE = "http://127.0.0.1:5000"

with requests.Session() as s:
    print("girişten önce çerezler / cookies before:", dict(s.cookies))
    s.post(f"{BASE}/login", data={"username": "selcuk", "password": "Selcuk!2026"}, timeout=5)
    print("girişten sonra çerezler / cookies after:", dict(s.cookies))   # session hatırlanır

    order = s.get(f"{BASE}/orders/101", timeout=5)                 # aynı oturum
    print("sipariş 101:", order.status_code, order.text[:40])

# Oturumsuz tek istek: çerez yok -> login'e yönlenir
anon = requests.get(f"{BASE}/orders/101", timeout=5, allow_redirects=False)
print("oturumsuz / anonymous:", anon.status_code, "->", anon.headers.get("Location"))
` },
    { t: "h", tr: "Bearer token ve JSON", en: "Bearer tokens and JSON" },
    { t: "text",
      tr: `<p>Token tabanlı API'lerde oturuma bir kez <code>Authorization: Bearer &lt;token&gt;</code> header'ı kurarsın; <code>session.headers.update(...)</code> ile eklenen header <strong>tüm</strong> isteklere gider. Yanıtı <code>response.json()</code> ile sözlüğe çevirirsin; <code>response.headers</code> büyük/küçük harf duyarsızdır (<code>headers["content-type"]</code> = <code>headers["Content-Type"]</code>).</p>`,
      en: `<p>In token-based APIs you set up an <code>Authorization: Bearer &lt;token&gt;</code> header once on the session; a header added with <code>session.headers.update(...)</code> goes on <strong>every</strong> request. You turn the response into a dict with <code>response.json()</code>; <code>response.headers</code> is case-insensitive (<code>headers["content-type"]</code> = <code>headers["Content-Type"]</code>).</p>` },
    { t: "code", id: "c2", simulated: true, setup: SQ.shared.fakeHttp,
      title: { tr: "Header kur, JSON oku", en: "Set headers, read JSON" },
      code: String.raw`
import requests

BASE = "http://127.0.0.1:5000"

s = requests.Session()
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo.token"
s.headers.update({"Authorization": f"Bearer {token}", "Accept": "application/json"})
print("oturum header'ları / session headers:", s.headers)

resp = s.get(f"{BASE}/api/users/2", timeout=5)
print("durum / status:", resp.status_code, "| content-type:", resp.headers["content-type"])
data = resp.json()                                 # JSON gövde -> dict
print("kullanıcı / user:", data["username"], data["email"])
print("hassas alan sızdı mı / sensitive leaked?", "password_hash" in data)
` },
    { t: "callout", kind: "sec",
      tr: `<p>Zafiyetli MiniShop'ta <code>/api/users/2</code> hem <strong>oturum istemez</strong> hem de <code>password_hash</code>'i sızdırır (OWASP A01 + A02). Savunmalı sürümde (<code>FakeServer(secure=True)</code>) oturumsuz istek <code>401</code> döner ve <code>password_hash</code> yanıttan çıkarılır. Gerçek SecureShop'ta <code>test_api_me_requires_auth</code> tam olarak bunu doğrular: <code>/api/me</code> kimlik ister ve parola alanı sızdırmaz.</p>`,
      en: `<p>On the vulnerable MiniShop, <code>/api/users/2</code> both <strong>requires no session</strong> and leaks <code>password_hash</code> (OWASP A01 + A02). In the defended version (<code>FakeServer(secure=True)</code>) the unauthenticated request returns <code>401</code> and <code>password_hash</code> is stripped. In the real SecureShop, <code>test_api_me_requires_auth</code> verifies exactly this: <code>/api/me</code> requires auth and leaks no password field.</p>` },
    { t: "h", tr: "raise_for_status ve HTTPError", en: "raise_for_status and HTTPError" },
    { t: "code", id: "c3", simulated: true, setup: SQ.shared.fakeHttp,
      title: { tr: "Hatayı yükselt ve yakala", en: "Raise and catch the error" },
      code: String.raw`
import requests

BASE = "http://127.0.0.1:5000"

for uid in (2, 999):
    resp = requests.get(f"{BASE}/api/users/{uid}", timeout=5)
    try:
        resp.raise_for_status()                    # 4xx/5xx ise HTTPError fırlatır
        print(uid, "-> OK:", resp.json().get("username"))
    except requests.HTTPError as e:
        print(uid, "-> hata / error:", resp.status_code, "|", e)
` },
    { t: "project", file: "secureqa/juiceshop.py (JuiceShopClient, kısaltılmış / shortened)",
      tr: `<p>Gerçek <code>JuiceShopClient</code> bu dersin tüm kalıplarını kullanır. <code>login()</code> JSON gövde gönderir (<code>json={...}</code>) ve dönen <code>authentication</code> sözlüğünden token'ı okur. <code>_auth_headers()</code> o token'ı <code>Bearer</code> olarak paketler ve IDOR saldırısında (<code>access_basket_idor</code>) korumalı sepet ucuna eklenir. <code>challenges()</code> ise <code>raise_for_status()</code> + <code>response.json()</code> ile challenge listesini çeker. Her istekte <code>timeout</code> var.</p>`,
      en: `<p>The real <code>JuiceShopClient</code> uses every pattern in this lesson. <code>login()</code> sends a JSON body (<code>json={...}</code>) and reads the token from the returned <code>authentication</code> dict. <code>_auth_headers()</code> wraps that token as <code>Bearer</code> and is added to the protected basket endpoint in the IDOR attack (<code>access_basket_idor</code>). <code>challenges()</code> pulls the challenge list with <code>raise_for_status()</code> + <code>response.json()</code>. Every request has a <code>timeout</code>.</p>`,
      code: String.raw`
def challenges(self) -> list[dict]:
    """Return the list of challenges from GET /api/Challenges (data field)."""
    response = self.session.get(self.base_url + "/api/Challenges", timeout=10)
    response.raise_for_status()
    return response.json().get("data", [])


def login(self, email: str, password: str = "password") -> dict | None:
    """POST /rest/user/login and return the authentication dict, or None."""
    response = self.session.post(
        self.base_url + "/rest/user/login",
        json={"email": email, "password": password},
        timeout=10,
    )
    if response.status_code == 200 and "authentication" in response.text:
        return response.json().get("authentication")
    return None


def _auth_headers(self, token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def access_basket_idor(self) -> tuple[bool, str]:
    """Read a basket that is not ours by changing the id (IDOR)."""
    auth = self.admin_auth()                       # token via SQLi login
    target = int(auth.get("bid") or 1) + 1
    response = self.session.get(
        self.base_url + f"/rest/basket/{target}",
        headers=self._auth_headers(auth["token"]),
        timeout=10,
    )
    return response.status_code == 200, f"GET /rest/basket/{target} -> HTTP {response.status_code}"
`,
      notes: [
        { line: 4, tr: "<code>raise_for_status()</code>: API beklenmedik 4xx/5xx dönerse testi erken ve net durdurur.", en: "<code>raise_for_status()</code>: stops the test early and clearly if the API returns an unexpected 4xx/5xx." },
        { line: 5, tr: "<code>.json().get(\"data\", [])</code>: JSON gövdeyi sözlüğe çevirip güvenle alan okur.", en: "<code>.json().get(\"data\", [])</code>: parse the JSON body and read a field safely." },
        { line: 12, tr: "<code>json={...}</code>: gövde JSON olarak gönderilir, <code>Content-Type: application/json</code> otomatik eklenir.", en: "<code>json={...}</code>: the body is sent as JSON, <code>Content-Type: application/json</code> is set automatically." },
        { line: 22, tr: "Token <code>Bearer</code> olarak paketlenir — kimlikli her istek bu header'ı taşır.", en: "The token is wrapped as <code>Bearer</code> — every authenticated request carries this header." },
        { line: 31, tr: "IDOR: başkasının sepet id'siyle token'lı istek 200 dönerse erişim kontrolü kırık demektir.", en: "IDOR: if a token'd request for someone else's basket id returns 200, access control is broken." }
      ] }
  ],
  exercises: [
    { id: "19-e1",
      title: { tr: "Bearer header + JSON okuma", en: "Bearer header + reading JSON" },
      setup: SQ.shared.fakeHttp,
      prompt: {
        tr: `<p>İki fonksiyon yaz:</p><ul><li><code>bearer_headers(token) -&gt; dict</code>: <code>{"Authorization": "Bearer &lt;token&gt;"}</code> döndürür</li><li><code>get_json(session, url) -&gt; dict</code>: <code>session.get(url, timeout=5)</code> yapar, <code>raise_for_status()</code> çağırır ve <code>response.json()</code> döndürür</li></ul><p>Sonra MiniShop'tan kullanıcı 2'yi çekip yazdır. (Zafiyetli API oturum istemez.)</p>`,
        en: `<p>Write two functions:</p><ul><li><code>bearer_headers(token) -&gt; dict</code>: returns <code>{"Authorization": "Bearer &lt;token&gt;"}</code></li><li><code>get_json(session, url) -&gt; dict</code>: does <code>session.get(url, timeout=5)</code>, calls <code>raise_for_status()</code> and returns <code>response.json()</code></li></ul><p>Then fetch user 2 from MiniShop and print it. (The vulnerable API needs no session.)</p>`
      },
      starter: String.raw`
import requests

BASE = "http://127.0.0.1:5000"


def bearer_headers(token):
    ...


def get_json(session, url):
    ...


s = requests.Session()
print(bearer_headers("abc123"))
print(get_json(s, f"{BASE}/api/users/2"))
`,
      solution: String.raw`
import requests

BASE = "http://127.0.0.1:5000"


def bearer_headers(token):
    return {"Authorization": f"Bearer {token}"}


def get_json(session, url):
    response = session.get(url, timeout=5)
    response.raise_for_status()
    return response.json()


s = requests.Session()
print(bearer_headers("abc123"))
print(get_json(s, f"{BASE}/api/users/2"))
`,
      check: String.raw`
assert bearer_headers("abc123") == {"Authorization": "Bearer abc123"}, _t("bearer_headers {'Authorization': 'Bearer <token>'} döndürmeli.", "bearer_headers must return {'Authorization': 'Bearer <token>'}.")
import requests as _rq
_s = _rq.Session()
_d = get_json(_s, "http://127.0.0.1:5000/api/users/2")
assert isinstance(_d, dict) and _d.get("id") == 2 and _d.get("username") == "selcuk", _t(f"get_json, /api/users/2'nin json()'ını döndürmeli; gelen {_d!r}.", f"get_json must return the json() of /api/users/2; got {_d!r}.")
assert "timeout= verilmedi" not in __output__, _t("session.get çağrısına timeout=5 ekle.", "Add timeout=5 to the session.get call.")
try:
    get_json(_s, "http://127.0.0.1:5000/api/users/999")
    raise AssertionError(_t("404'te raise_for_status() HTTPError fırlatmalı.", "On 404, raise_for_status() must raise HTTPError."))
except _rq.HTTPError:
    pass
`,
      hints: [
        { tr: "<code>return {\"Authorization\": f\"Bearer {token}\"}</code>", en: "<code>return {\"Authorization\": f\"Bearer {token}\"}</code>" },
        { tr: "get_json: <code>r = session.get(url, timeout=5)</code>, <code>r.raise_for_status()</code>, <code>return r.json()</code>.", en: "get_json: <code>r = session.get(url, timeout=5)</code>, <code>r.raise_for_status()</code>, <code>return r.json()</code>." }
      ] },
    { id: "19-e2",
      title: { tr: "Oturum çerezinin kalıcılığı", en: "Session cookie persistence" },
      setup: SQ.shared.fakeHttp,
      prompt: {
        tr: `<p>İki fonksiyon yaz:</p><ul><li><code>login(session, base)</code>: <code>base + "/login"</code>'e <code>data={"username": "selcuk", "password": "Selcuk!2026"}</code> ile <code>timeout=5</code> POST yapar</li><li><code>read_order(session, base, oid) -&gt; int</code>: <code>base + "/orders/{oid}"</code>'yi <code>allow_redirects=False, timeout=5</code> ile GET yapıp <strong>durum kodunu</strong> döndürür</li></ul><p>Korumalı <code>/orders/101</code> oturumsuzken <code>302</code> (login'e yönlendirir), giriş yaptıktan sonra aynı oturumla <code>200</code> dönmeli.</p>`,
        en: `<p>Write two functions:</p><ul><li><code>login(session, base)</code>: POSTs to <code>base + "/login"</code> with <code>data={"username": "selcuk", "password": "Selcuk!2026"}</code> and <code>timeout=5</code></li><li><code>read_order(session, base, oid) -&gt; int</code>: GETs <code>base + "/orders/{oid}"</code> with <code>allow_redirects=False, timeout=5</code> and returns the <strong>status code</strong></li></ul><p>The protected <code>/orders/101</code> returns <code>302</code> (redirect to login) when anonymous, and <code>200</code> with the same session after logging in.</p>`
      },
      starter: String.raw`
import requests

BASE = "http://127.0.0.1:5000"


def login(session, base):
    ...


def read_order(session, base, oid):
    ...


s = requests.Session()
print("önce / before:", read_order(s, BASE, 101))
login(s, BASE)
print("sonra / after:", read_order(s, BASE, 101))
`,
      solution: String.raw`
import requests

BASE = "http://127.0.0.1:5000"


def login(session, base):
    session.post(base + "/login", data={"username": "selcuk", "password": "Selcuk!2026"}, timeout=5)


def read_order(session, base, oid):
    response = session.get(base + f"/orders/{oid}", allow_redirects=False, timeout=5)
    return response.status_code


s = requests.Session()
print("önce / before:", read_order(s, BASE, 101))
login(s, BASE)
print("sonra / after:", read_order(s, BASE, 101))
`,
      check: String.raw`
import requests as _rq
_s = _rq.Session()
_before = read_order(_s, "http://127.0.0.1:5000", 101)
assert _before == 302, _t(f"Oturumsuzken /orders/101 login'e yönlenmeli (302); gelen {_before}.", f"Anonymous, /orders/101 must redirect to login (302); got {_before}.")
login(_s, "http://127.0.0.1:5000")
assert _s.cookies.get("session"), _t("login sonrası oturumda bir 'session' çerezi olmalı.", "After login the session must hold a 'session' cookie.")
_after = read_order(_s, "http://127.0.0.1:5000", 101)
assert _after == 200, _t(f"Giriş yapılmış aynı oturumla /orders/101 200 dönmeli; gelen {_after}.", f"With the same logged-in session, /orders/101 must return 200; got {_after}.")
assert "timeout= verilmedi" not in __output__, _t("İsteklere timeout=5 ekle.", "Add timeout=5 to the requests.")
`,
      hints: [
        { tr: "login: <code>session.post(base + \"/login\", data={...}, timeout=5)</code> — çerez oturuma yazılır.", en: "login: <code>session.post(base + \"/login\", data={...}, timeout=5)</code> — the cookie is saved to the session." },
        { tr: "read_order: <code>session.get(base + f\"/orders/{oid}\", allow_redirects=False, timeout=5).status_code</code>.", en: "read_order: <code>session.get(base + f\"/orders/{oid}\", allow_redirects=False, timeout=5).status_code</code>." }
      ] }
  ],
  quiz: [
    { q: { tr: "Giriş yaptıktan sonra korumalı bir sayfayı okuyabilmek için ne gerekir?", en: "What is needed to read a protected page after logging in?" },
      options: [{ tr: "Her istekte yeni bir <code>requests.get()</code>", en: "A new <code>requests.get()</code> for each request" }, { tr: "Aynı <code>Session</code>'ı kullanmak (çerezi taşır)", en: "Using the same <code>Session</code> (it carries the cookie)" }, { tr: "<code>verify=False</code> eklemek", en: "Adding <code>verify=False</code>" }],
      answer: 1, explain: { tr: "Tek tek çağrılar çerezi unutur; Session onu hatırlar.", en: "Individual calls forget the cookie; a Session remembers it." } },
    { q: { tr: "Token tabanlı bir API'de kimlik nasıl taşınır?", en: "How is identity carried in a token-based API?" },
      options: [{ tr: "<code>Authorization: Bearer &lt;token&gt;</code> header'ıyla", en: "With an <code>Authorization: Bearer &lt;token&gt;</code> header" }, { tr: "URL'ye parola ekleyerek", en: "By adding the password to the URL" }, { tr: "<code>User-Agent</code> ile", en: "With the <code>User-Agent</code>" }],
      answer: 0, explain: { tr: "JWT gibi token'lar Authorization header'ında Bearer olarak gönderilir.", en: "Tokens like JWTs are sent as Bearer in the Authorization header." } },
    { q: { tr: "<code>response.raise_for_status()</code> ne işe yarar?", en: "What does <code>response.raise_for_status()</code> do?" },
      options: [{ tr: "Yanıtı JSON'a çevirir", en: "Converts the response to JSON" }, { tr: "Durum kodu 4xx/5xx ise <code>HTTPError</code> fırlatır", en: "Raises <code>HTTPError</code> if the status is 4xx/5xx" }, { tr: "Çerezleri temizler", en: "Clears cookies" }],
      answer: 1, explain: { tr: "Beklenmedik hata durumlarını erken ve net yakalamak için kullanılır.", en: "Used to catch unexpected error statuses early and clearly." } }
  ]
});
