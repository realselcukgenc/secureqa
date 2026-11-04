SQ.addLesson({
  id: "12-playwright",
  num: 12,
  icon: "pw",
  minutes: 30,
  title: { tr: "Playwright sync API", en: "The Playwright sync API" },
  summary: {
    tr: "sync_playwright, browser → context → page, locator'lar, auto-wait, expect ve XSS'i tarayıcıda kanıtlamak.",
    en: "sync_playwright, browser → context → page, locators, auto-wait, expect and proving XSS in the browser."
  },
  goals: {
    tr: [
      "Hiyerarşi: <code>playwright</code> → <code>browser</code> → <code>context</code> → <code>page</code>",
      "<code>page.goto</code>, <code>page.locator(...)</code>, <code>fill</code>, <code>click</code>, <code>inner_text</code>",
      "Auto-wait ve web-first assertion'lar: <code>expect(locator).to_have_text(...)</code>",
      "Güvenlik için: <code>page.on(\"dialog\")</code>, <code>add_init_script</code>, <code>evaluate</code>"
    ],
    en: [
      "The hierarchy: <code>playwright</code> → <code>browser</code> → <code>context</code> → <code>page</code>",
      "<code>page.goto</code>, <code>page.locator(...)</code>, <code>fill</code>, <code>click</code>, <code>inner_text</code>",
      "Auto-wait and web-first assertions: <code>expect(locator).to_have_text(...)</code>",
      "For security: <code>page.on(\"dialog\")</code>, <code>add_init_script</code>, <code>evaluate</code>"
    ]
  },
  blocks: [
    { t: "callout", kind: "info", title: { tr: "Simülasyon hakkında", en: "About the simulation" },
      tr: `<p>Gerçek Playwright bir tarayıcı süreci başlattığı için bu sayfanın içinde çalışamaz. Bu dersteki düzenlenebilir hücreler, <code>playwright.sync_api</code> modülünü taklit eden küçük bir <strong>FakePage / mini VulnShop</strong> kullanır: API isimleri gerçeğiyle aynıdır. Gerçek kod örnekleri “Gerçek kod” etiketiyle salt okunur gösterilir — onları kendi bilgisayarında çalıştırabilirsin.</p>`,
      en: `<p>Real Playwright launches a browser process, so it can't run inside this page. The editable cells in this lesson use a small <strong>FakePage / mini VulnShop</strong> that imitates the <code>playwright.sync_api</code> module: API names match the real thing. Real code examples are shown read-only with a “Real code” label — run them on your own machine.</p>` },
    { t: "code", id: "c0", readonly: true, real: true, file: "examples/first_playwright.py",
      title: { tr: "Gerçek Playwright: en küçük script", en: "Real Playwright: the smallest script" },
      code: String.raw`
import os

from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=os.environ.get("PW_CHROMIUM_PATH"),  # SecureQA: özel Chromium yolu
    )
    context = browser.new_context(locale="tr-TR")
    page = context.new_page()
    page.goto("http://127.0.0.1:5000/login")
    page.locator("#username").fill("selcuk")
    page.locator("#password").fill("Selcuk!2026")
    page.locator("#login-btn").click()
    expect(page.locator("#account-username")).to_have_text("selcuk")
    page.screenshot(path="reports/login.png", full_page=True)
    browser.close()
` },
    { t: "text",
      tr: `<p><strong>browser</strong> bir tarayıcı sürecidir (pahalı, bir kez açılır). <strong>context</strong> gizli pencere gibi izole bir oturumdur: kendi çerezleri ve localStorage'ı vardır (ucuz, her teste bir tane). <strong>page</strong> o context içindeki bir sekmedir. Selenium'daki tek <code>driver</code> nesnesinin yerini bu üçlü alır.</p>
<p><strong>Auto-wait:</strong> <code>click()</code> ve <code>fill()</code>, eleman görünür, etkin ve sabit olana kadar kendiliğinden bekler. Selenium'daki <code>WebDriverWait</code> + <code>expected_conditions</code> yazmana ve <code>time.sleep</code> kullanmana gerek kalmaz.</p>`,
      en: `<p>A <strong>browser</strong> is a browser process (expensive, opened once). A <strong>context</strong> is an isolated session like an incognito window: its own cookies and localStorage (cheap, one per test). A <strong>page</strong> is a tab in that context. This trio replaces Selenium's single <code>driver</code> object.</p>
<p><strong>Auto-wait:</strong> <code>click()</code> and <code>fill()</code> wait by themselves until the element is visible, enabled and stable. No need for Selenium's <code>WebDriverWait</code> + <code>expected_conditions</code>, and no <code>time.sleep</code>.</p>` },
    { t: "code", id: "c1", simulated: true, setup: SQ.shared.fakeWeb,
      title: { tr: "Aynı akış, simülasyonda", en: "The same flow, simulated" },
      code: String.raw`
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://127.0.0.1:5000/login")
    print("Başlık / title:", page.title())

    page.locator("#username").fill("selcuk")
    page.locator("#password").fill("Selcuk!2026")
    page.locator("#login-btn").click()

    expect(page.locator("#account-username")).to_have_text("selcuk")
    print("URL:", page.url)
    print("E-posta:", page.locator("#account-email").inner_text())
    browser.close()
` },
    { t: "h", tr: "Locator stratejileri", en: "Locator strategies" },
    { t: "text",
      tr: `<table><thead><tr><th>Yöntem</th><th>Örnek</th><th>Not</th></tr></thead><tbody>
<tr><td>CSS / id</td><td><code>page.locator("#login-btn")</code></td><td>VulnShop'un sabit id'leri (spec sözleşmesi)</td></tr>
<tr><td>test id</td><td><code>page.get_by_test_id("product-card")</code></td><td><code>data-testid</code> — en dayanıklısı</td></tr>
<tr><td>rol</td><td><code>page.get_by_role("button", name="Giriş yap")</code></td><td>Erişilebilirlik ağacına göre, kullanıcı gibi</td></tr>
<tr><td>metin</td><td><code>page.get_by_text("Sonuçlar")</code></td><td>Çok dilli sitelerde dikkat: TR/EN değişir!</td></tr>
</tbody></table>`,
      en: `<table><thead><tr><th>Method</th><th>Example</th><th>Note</th></tr></thead><tbody>
<tr><td>CSS / id</td><td><code>page.locator("#login-btn")</code></td><td>VulnShop's stable ids (spec contract)</td></tr>
<tr><td>test id</td><td><code>page.get_by_test_id("product-card")</code></td><td><code>data-testid</code> — the most robust</td></tr>
<tr><td>role</td><td><code>page.get_by_role("button", name="Giriş yap")</code></td><td>By accessibility tree, like a user</td></tr>
<tr><td>text</td><td><code>page.get_by_text("Sonuçlar")</code></td><td>Careful on multilingual sites: TR/EN changes!</td></tr>
</tbody></table>` },
    { t: "code", id: "c2", simulated: true, setup: SQ.shared.fakeWeb,
      title: { tr: "Arama, liste ve sayım", en: "Search, lists and counting" },
      code: String.raw`
from urllib.parse import quote
from playwright.sync_api import expect

page = FakePage()
page.goto("http://127.0.0.1:5000/products?q=" + quote("çay"))

expect(page.locator("#search-term")).to_have_text("çay")
names = page.locator("[data-testid='product-card'] [data-testid='product-name']").all_inner_texts()
print("Bulunan ürünler:", names)
print("Kart sayısı:", page.get_by_test_id("product-card").count())

# Kullanıcı enumerasyonu: hata mesajları farklı mı?
for user in ["olmayan_kullanici", "selcuk"]:
    page.goto("http://127.0.0.1:5000/login")
    page.fill("#username", user)
    page.fill("#password", "yanlis")
    page.click("#login-btn")
    print(f"{user:>18} -> {page.locator('#login-error').inner_text()}")
` },
    { t: "callout", kind: "sec",
      tr: `<p>Son döngü bir güvenlik testidir: “kullanıcı bulunamadı” ile “parola hatalı” mesajları farklıysa, saldırgan hangi kullanıcı adlarının <strong>var olduğunu</strong> öğrenebilir (user enumeration, OWASP A07). Güvenli uygulama her iki durumda da aynı genel mesajı verir.</p>`,
      en: `<p>The last loop is a security test: if “user not found” and “wrong password” differ, an attacker learns which usernames <strong>exist</strong> (user enumeration, OWASP A07). A secure app shows the same generic message in both cases.</p>` },
    { t: "h", tr: "XSS'i tarayıcıda kanıtlamak", en: "Proving XSS in the browser" },
    { t: "text",
      tr: `<p>HTML'de payload'ı görmek bir <em>belirti</em>dir; asıl <strong>kanıt</strong>, script'in tarayıcıda gerçekten çalışmasıdır. İki yol var: (1) <code>alert()</code> açılırsa <code>page.on("dialog", ...)</code> olayı tetiklenir; (2) SecureQA'nın yöntemi: sayfa yüklenmeden <code>add_init_script</code> ile <code>window.sqaMark</code> fonksiyonunu tanımla, payload'lar bu fonksiyonu çağırsın, sonra <code>page.evaluate("window.__sqa_fired")</code> ile oku.</p>`,
      en: `<p>Seeing the payload in the HTML is a <em>symptom</em>; the real <strong>proof</strong> is the script actually running in the browser. Two ways: (1) if an <code>alert()</code> opens, the <code>page.on("dialog", ...)</code> event fires; (2) SecureQA's way: before the page loads, define <code>window.sqaMark</code> with <code>add_init_script</code>, let payloads call it, then read <code>page.evaluate("window.__sqa_fired")</code>.</p>` },
    { t: "code", id: "c3", simulated: true, setup: SQ.shared.fakeWeb,
      title: { tr: "dialog olayıyla XSS tespiti", en: "Detecting XSS with the dialog event" },
      code: String.raw`
from urllib.parse import quote

payload = "<script>alert('xss-sqa7x9')</script>"

for secure in (False, True):
    page = FakePage(secure=secure)
    fired = []
    page.on("dialog", lambda dialog: (fired.append(dialog.message), dialog.dismiss()))
    page.goto("http://127.0.0.1:5000/products?q=" + quote(payload))
    mode = "secure" if secure else "vulnerable"
    raw_in_html = payload in page.content()
    print(f"{mode:>10}: dialog={fired}  raw_in_html={raw_in_html}")
` },
    { t: "project", file: "secureqa/security/xss.py + tests/security/test_injection_xss.py",
      tr: `<p>Gerçek SecureQA kodu: kanıt mekanizması <code>xss.py</code>'de, onu kullanan test ise POM (<code>ProductsPage</code>) ile yazılmış. Test iki sinyale bakıyor: script çalıştı mı (güçlü kanıt) <strong>veya</strong> payload kodlanmadan HTML'e mi yansıdı.</p>`,
      en: `<p>Real SecureQA code: the proof mechanism lives in <code>xss.py</code>, and the test using it is written with the POM (<code>ProductsPage</code>). The test looks at two signals: did the script run (strong proof) <strong>or</strong> was the payload reflected into the HTML unencoded.</p>`,
      code: String.raw`
def install_xss_probe(page: Page) -> None:
    """Expose a JS function sqaMark(id) that records when a payload executes."""
    page.add_init_script(
        "window.__sqa_fired = null;"
        "window.sqaMark = function(id){ window.__sqa_fired = id; };"
    )


def payload_executed(page: Page) -> bool:
    """True if a payload actually ran sqaMark in the real browser."""
    fired = page.evaluate("window.__sqa_fired")
    return fired == XSS_MARKER


def test_reflected_xss_in_search(page, base_url, record_finding) -> None:
    products = ProductsPage(page, base_url)
    payload = XSS_PAYLOADS[0]          # "<script>sqaMark('sqa7x9')</script>"
    products.search(payload)

    executed = xss.payload_executed(page)
    reflected = xss.reflects_unescaped(products.content(), payload)
    vulnerable = executed or reflected

    if vulnerable:
        how = "script executed in browser" if executed else "payload reflected unescaped in HTML"
        record_finding(catalog.XSS_REFLECTED.finding(url=page.url, evidence=f"{how}: {payload}"))
    assert not vulnerable, "Reflected XSS: the search term is not safely encoded."
`,
      notes: [
        { line: 3, tr: "<code>add_init_script</code>: her sayfa yüklemesinden <strong>önce</strong> çalışan JS. <code>page</code> fixture'ı bunu her teste kurar.", en: "<code>add_init_script</code>: JS that runs <strong>before</strong> every page load. The <code>page</code> fixture installs it for every test." },
        { line: 11, tr: "<code>evaluate</code>: tarayıcıda JS çalıştırıp sonucu Python'a getirir.", en: "<code>evaluate</code>: runs JS in the browser and brings the result back to Python." },
        { line: 18, tr: "POM: arama URL'sini (ve <code>quote</code>'u) test değil, page object biliyor.", en: "POM: the page object, not the test, knows the search URL (and the <code>quote</code>)." },
        { line: 22, tr: "İki sinyalden biri yeterli: çalıştı <em>veya</em> ham yansıdı.", en: "Either signal is enough: it ran <em>or</em> it reflected raw." },
        { line: 26, tr: "Önce bulgu kaydı (rapor için), sonra kırmızı assert (pytest için).", en: "First record the finding (for the report), then the red assert (for pytest)." }
      ] }
  ],
  exercises: [
    { id: "12-e1",
      title: { tr: "login() yardımcı fonksiyonu", en: "A login() helper" },
      setup: SQ.shared.fakeWeb,
      prompt: {
        tr: `<p><code>login(page, base_url, username, password)</code> fonksiyonunu yaz:</p><ol><li><code>base_url + "/login"</code> adresine git</li><li><code>#username</code> ve <code>#password</code> alanlarını doldur</li><li><code>#login-btn</code>'a tıkla</li><li>Giriş başarılıysa (<code>a[href='/logout']</code> linki varsa, yani <code>count() &gt; 0</code>) <code>True</code>, değilse <code>False</code> döndür</li></ol><p><code>page</code> olarak <code>FakePage()</code> kullan.</p>`,
        en: `<p>Write <code>login(page, base_url, username, password)</code>:</p><ol><li>go to <code>base_url + "/login"</code></li><li>fill the <code>#username</code> and <code>#password</code> fields</li><li>click <code>#login-btn</code></li><li>return <code>True</code> if the login worked (the <code>a[href='/logout']</code> link exists, i.e. <code>count() &gt; 0</code>), otherwise <code>False</code></li></ol><p>Use <code>FakePage()</code> as the <code>page</code>.</p>`
      },
      starter: String.raw`
def login(page, base_url, username, password):
    page.goto(base_url + "/login")
    # ...
    return False


page = FakePage()
print(login(page, "http://127.0.0.1:5000", "selcuk", "Selcuk!2026"))
print(page.log)
`,
      solution: String.raw`
def login(page, base_url, username, password):
    page.goto(base_url + "/login")
    page.locator("#username").fill(username)
    page.locator("#password").fill(password)
    page.locator("#login-btn").click()
    return page.locator("a[href='/logout']").count() > 0


page = FakePage()
print(login(page, "http://127.0.0.1:5000", "selcuk", "Selcuk!2026"))
print(page.log)
`,
      check: String.raw`
_p = FakePage()
assert login(_p, "http://127.0.0.1:5000", "ayse", "ayse2026") is True, _t("Doğru bilgilerle True dönmeli.", "Must return True with valid credentials.")
_acts = [a[:2] for a in _p.log]
assert ("goto", "http://127.0.0.1:5000/login") in _acts, _t("Önce /login sayfasına gitmelisin.", "You must go to /login first.")
assert ("fill", "#username") in _acts and ("fill", "#password") in _acts, _t("#username ve #password doldurulmalı.", "#username and #password must be filled.")
assert ("click", "#login-btn") in _acts, _t("#login-btn tıklanmalı.", "#login-btn must be clicked.")
_q = FakePage()
assert login(_q, "http://127.0.0.1:5000", "ayse", "yanlis") is False, _t("Yanlış parolayla False dönmeli (logout linki yok).", "Must return False with a wrong password (no logout link).")
`,
      hints: [
        { tr: "<code>page.locator(\"#username\").fill(username)</code> — aynısını parola için yap.", en: "<code>page.locator(\"#username\").fill(username)</code> — do the same for the password." },
        { tr: "Dönüş: <code>return page.locator(\"a[href='/logout']\").count() &gt; 0</code>", en: "Return: <code>return page.locator(\"a[href='/logout']\").count() &gt; 0</code>" }
      ] },
    { id: "12-e2",
      title: { tr: "SQLi ile giriş atlatma testi", en: "SQLi login bypass test" },
      setup: SQ.shared.fakeWeb + "\n" + String.raw`
def login(page, base_url, username, password):
    page.goto(base_url + "/login")
    page.locator("#username").fill(username)
    page.locator("#password").fill(password)
    page.locator("#login-btn").click()
    return page.locator("a[href='/logout']").count() > 0
`,
      prompt: {
        tr: `<p>Hazır bir <code>login()</code> var. <code>is_sqli_bypass_possible(page, base_url, payloads)</code> fonksiyonunu yaz: listedeki her kullanıcı adı payload'ı ve parola olarak <code>"x"</code> ile giriş dene; <strong>herhangi biri</strong> giriş yaptırırsa <code>True</code> döndür. Sonra şunu kontrol et: <code>FakePage()</code> (vulnerable) için <code>True</code>, <code>FakePage(secure=True)</code> için <code>False</code> olmalı.</p>`,
        en: `<p>A <code>login()</code> helper is ready. Write <code>is_sqli_bypass_possible(page, base_url, payloads)</code>: try logging in with each username payload and the password <code>"x"</code>; return <code>True</code> if <strong>any</strong> of them logs in. Then verify: <code>True</code> for <code>FakePage()</code> (vulnerable) and <code>False</code> for <code>FakePage(secure=True)</code>.</p>`
      },
      starter: String.raw`
SQLI_LOGIN_PAYLOADS = ["admin' --", "admin' OR '1'='1' --", "admin'/*"]


def is_sqli_bypass_possible(page, base_url, payloads):
    return False


print("vulnerable:", is_sqli_bypass_possible(FakePage(), "http://127.0.0.1:5000", SQLI_LOGIN_PAYLOADS))
print("secure:    ", is_sqli_bypass_possible(FakePage(secure=True), "http://127.0.0.1:5000", SQLI_LOGIN_PAYLOADS))
`,
      solution: String.raw`
SQLI_LOGIN_PAYLOADS = ["admin' --", "admin' OR '1'='1' --", "admin'/*"]


def is_sqli_bypass_possible(page, base_url, payloads):
    for payload in payloads:
        if login(page, base_url, payload, "x"):
            return True
    return False


print("vulnerable:", is_sqli_bypass_possible(FakePage(), "http://127.0.0.1:5000", SQLI_LOGIN_PAYLOADS))
print("secure:    ", is_sqli_bypass_possible(FakePage(secure=True), "http://127.0.0.1:5000", SQLI_LOGIN_PAYLOADS))
`,
      check: String.raw`
_P = ["admin' --", "admin' OR '1'='1' --"]
assert is_sqli_bypass_possible(FakePage(), "http://127.0.0.1:5000", _P) is True, _t("Vulnerable sayfada SQLi payload'ı giriş yaptırmalı → True.", "On the vulnerable page an SQLi payload logs in → True.")
assert is_sqli_bypass_possible(FakePage(secure=True), "http://127.0.0.1:5000", _P) is False, _t("Secure sayfada hiçbir payload çalışmamalı → False.", "On the secure page no payload works → False.")
assert is_sqli_bypass_possible(FakePage(), "http://127.0.0.1:5000", ["normal_user"]) is False, _t("SQLi olmayan kullanıcı adıyla False dönmeli.", "A non-SQLi username must give False.")
_pg = FakePage()
is_sqli_bypass_possible(_pg, "http://127.0.0.1:5000", ["x", "y", "admin' --"])
assert sum(1 for a in _pg.log if a[0] == "click") == 3, _t("Listedeki her payload denenmeli (ilk başarıda durabilirsin).", "Every payload in the list must be tried (you may stop at the first success).")
`,
      hints: [
        { tr: "<code>for payload in payloads:</code> içinde <code>if login(page, base_url, payload, \"x\"): return True</code>", en: "Inside <code>for payload in payloads:</code> do <code>if login(page, base_url, payload, \"x\"): return True</code>" },
        { tr: "Döngü bitince (hiçbiri çalışmadıysa) <code>return False</code>.", en: "After the loop (none worked) <code>return False</code>." }
      ] }
  ],
  quiz: [
    { q: { tr: "Testler arasında çerezlerin sızmaması için her teste yeni ne verilmeli?", en: "What should each test get fresh so cookies don't leak between tests?" },
      options: [{ tr: "Yeni bir browser süreci", en: "A new browser process" }, { tr: "Yeni bir browser context (ve page)", en: "A new browser context (and page)" }, { tr: "Yeni bir Python süreci", en: "A new Python process" }],
      answer: 1, explain: { tr: "Context izoledir ve ucuzdur; browser'ı her test için açmak gereksiz yavaştır.", en: "A context is isolated and cheap; launching a browser per test is needlessly slow." } },
    { q: { tr: "Playwright'ta <code>click()</code> öncesi <code>time.sleep(2)</code> yazmak neden gereksizdir?", en: "Why is <code>time.sleep(2)</code> before <code>click()</code> unnecessary in Playwright?" },
      options: [{ tr: "Auto-wait: eleman tıklanabilir olana kadar kendisi bekler", en: "Auto-wait: it waits by itself until the element is clickable" }, { tr: "Playwright sleep'i desteklemez", en: "Playwright doesn't support sleep" }, { tr: "click() asenkron çalışır", en: "click() is asynchronous" }],
      answer: 0, explain: { tr: "Sabit beklemeler testleri hem yavaş hem flaky yapar.", en: "Fixed sleeps make tests both slow and flaky." } },
    { q: { tr: "XSS'in en güçlü kanıtı hangisi?", en: "What is the strongest proof of XSS?" },
      options: [{ tr: "Yanıtın 200 dönmesi", en: "The response being 200" }, { tr: "Payload'ın URL'de görünmesi", en: "The payload appearing in the URL" }, { tr: "Payload'ın tarayıcıda gerçekten çalışması (dialog / sqaMark)", en: "The payload actually running in the browser (dialog / sqaMark)" }],
      answer: 2, explain: { tr: "HTML'de görünmek bir belirti; çalışması kanıttır.", en: "Appearing in HTML is a symptom; running is proof." } }
  ]
});
