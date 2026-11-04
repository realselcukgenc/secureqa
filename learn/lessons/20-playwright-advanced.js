SQ.addLesson({
  id: "20-playwright-advanced",
  num: 20,
  icon: "loc",
  minutes: 30,
  title: { tr: "Playwright ileri: locator & POM", en: "Playwright advanced: locators & POM" },
  summary: {
    tr: "Locator stratejileri, auto-wait, web-first assertion'lar (expect), sayım ve Page Object Model'i derinlemesine kurmak.",
    en: "Locator strategies, auto-wait, web-first assertions (expect), counting, and building the Page Object Model in depth."
  },
  goals: {
    tr: [
      "Locator seçimi: CSS/id, <code>get_by_test_id</code>, rol ve metin — hangisi ne zaman",
      "Auto-wait ve web-first assertion'lar: <code>expect(locator).to_have_text/to_be_visible/to_have_count</code>",
      "Birden çok elemanı saymak ve metinlerini toplamak (<code>count</code>, <code>all_inner_texts</code>)",
      "Page Object Model'i sınıf olarak kurmak: <code>PATH</code>, locator property'leri, eylem metotları"
    ],
    en: [
      "Choosing locators: CSS/id, <code>get_by_test_id</code>, role and text — which one when",
      "Auto-wait and web-first assertions: <code>expect(locator).to_have_text/to_be_visible/to_have_count</code>",
      "Counting multiple elements and collecting their texts (<code>count</code>, <code>all_inner_texts</code>)",
      "Building the Page Object Model as a class: <code>PATH</code>, locator properties, action methods"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>12. derste Playwright'ın temel akışını (browser → context → page) ve XSS kanıtını gördük. Bu derste <strong>sürdürülebilir</strong> tarayıcı testlerinin iki temelini derinleştiriyoruz: doğru <strong>locator</strong>'ı seçmek (kırılgan testlerin bir numaralı sebebi yanlış seçicidir) ve mantığı <strong>Page Object</strong> sınıflarında toplamak. SecureQA'nın <code>secureqa/pages/</code> klasörü tam olarak böyle kuruludur: <code>BasePage</code> ortak davranışı, her sayfa kendi sınıfını taşır.</p>`,
      en: `<p>In lesson 12 we saw Playwright's basic flow (browser → context → page) and proving XSS. This lesson deepens the two foundations of <strong>maintainable</strong> browser tests: choosing the right <strong>locator</strong> (the wrong selector is the #1 cause of brittle tests) and gathering logic in <strong>Page Object</strong> classes. SecureQA's <code>secureqa/pages/</code> folder is built exactly this way: <code>BasePage</code> holds the common behaviour and every page has its own class.</p>` },
    { t: "callout", kind: "info", title: { tr: "Simülasyon hakkında", en: "About the simulation" },
      tr: `<p>Gerçek Playwright bir tarayıcı süreci başlattığı için burada çalışamaz. Düzenlenebilir hücreler, <code>playwright.sync_api</code>'yi taklit eden <strong>FakePage</strong> ve <strong>MiniShop (simülasyon)</strong>'u kullanır: <code>locator</code>, <code>get_by_test_id</code>, <code>fill</code>, <code>click</code>, <code>expect(...)</code>, <code>count</code>, <code>all_inner_texts</code> gerçeğiyle aynı isimdedir. Gerçek kod örnekleri "Gerçek kod" etiketiyle salt okunur gösterilir.</p>`,
      en: `<p>Real Playwright launches a browser process, so it can't run here. The editable cells use <strong>FakePage</strong> and <strong>MiniShop (simulation)</strong> imitating <code>playwright.sync_api</code>: <code>locator</code>, <code>get_by_test_id</code>, <code>fill</code>, <code>click</code>, <code>expect(...)</code>, <code>count</code>, <code>all_inner_texts</code> match the real names. Real code examples are shown read-only with a "Real code" label.</p>` },
    { t: "h", tr: "Locator seçimi ve web-first assertion", en: "Choosing locators and web-first assertions" },
    { t: "text",
      tr: `<p><code>expect(locator)</code> web-first bir assertion'dır: koşul sağlanana kadar <strong>kendiliğinden bekler</strong> (auto-wait), <code>time.sleep</code> gerekmez. Metin için <code>to_have_text</code>/<code>to_contain_text</code>, görünürlük için <code>to_be_visible</code>, sayım için <code>to_have_count</code>, sayfa için <code>to_have_title</code>/<code>to_have_url</code> kullanılır.</p>`,
      en: `<p><code>expect(locator)</code> is a web-first assertion: it <strong>waits by itself</strong> until the condition holds (auto-wait), no <code>time.sleep</code> needed. Use <code>to_have_text</code>/<code>to_contain_text</code> for text, <code>to_be_visible</code> for visibility, <code>to_have_count</code> for counting, and <code>to_have_title</code>/<code>to_have_url</code> for the page.</p>` },
    { t: "code", id: "c1", simulated: true, setup: SQ.shared.fakeWeb,
      title: { tr: "expect ile giriş akışını doğrula", en: "Verify the login flow with expect" },
      code: String.raw`
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://127.0.0.1:5000/login")
    expect(page).to_have_title("Giriş · MiniShop")        # sayfa assertion'ı

    page.locator("#username").fill("selcuk")              # CSS/id locator
    page.fill("#password", "Selcuk!2026")                 # kısayol
    page.click("#login-btn")

    expect(page.locator("#account-username")).to_have_text("selcuk")   # auto-wait
    expect(page.locator("a[href='/logout']")).to_be_visible()
    print("giriş sonrası URL / URL after login:", page.url)
    browser.close()
` },
    { t: "code", id: "c2", simulated: true, setup: SQ.shared.fakeWeb,
      title: { tr: "Birden çok elemanı saymak", en: "Counting multiple elements" },
      code: String.raw`
from urllib.parse import quote
from playwright.sync_api import expect

page = FakePage()

page.goto("http://127.0.0.1:5000/products")              # arama yok -> tüm ürünler
cards = page.get_by_test_id("product-card")               # en dayanıklı: data-testid
print("toplam ürün / total products:", cards.count())
expect(cards).to_have_count(5)

page.goto("http://127.0.0.1:5000/products?q=" + quote("çay"))
names = page.locator("[data-testid='product-card'] [data-testid='product-name']").all_inner_texts()
print("arama sonuçları / search results:", names)
expect(page.locator("#search-term")).to_have_text("çay")
` },
    { t: "callout", kind: "tip",
      tr: `<p>Locator önceliği (en dayanıklıdan en kırılgana): <strong>1)</strong> <code>get_by_test_id("...")</code> — <code>data-testid</code> tasarımla eklenir, stil/metin değişse de kalır. <strong>2)</strong> <code>get_by_role("button", name=...)</code> — kullanıcı gibi, erişilebilirlik ağacına göre. <strong>3)</strong> kararlı <code>#id</code>. <strong>4)</strong> <code>get_by_text(...)</code> — çok dilli sitelerde TR/EN değişince kırılır! SecureShop sabit id'ler ve <code>data-testid</code> sağlar (SPEC sözleşmesi), bu yüzden testler dayanıklıdır.</p>`,
      en: `<p>Locator priority (most robust to most brittle): <strong>1)</strong> <code>get_by_test_id("...")</code> — <code>data-testid</code> is added deliberately and survives style/text changes. <strong>2)</strong> <code>get_by_role("button", name=...)</code> — like a user, by the accessibility tree. <strong>3)</strong> a stable <code>#id</code>. <strong>4)</strong> <code>get_by_text(...)</code> — breaks on multilingual sites when TR/EN changes! SecureShop provides stable ids and <code>data-testid</code> (the SPEC contract), so the tests are robust.</p>` },
    { t: "h", tr: "Page Object Model, derinlemesine", en: "Page Object Model, in depth" },
    { t: "text",
      tr: `<p>POM'da her sayfa bir sınıftır: <strong>nerede</strong> olduğunu (<code>PATH</code>), <strong>hangi elemanlar</strong> olduğunu (locator property'leri) ve <strong>ne yapabildiğini</strong> (eylem metotları) bilir. Testler artık seçici değil, niyet okur: <code>login.login("selcuk", "...")</code>. Sayfa değişirse yalnızca sınıfı güncellersin, onlarca testi değil.</p>`,
      en: `<p>In POM each page is a class: it knows <strong>where</strong> it is (<code>PATH</code>), <strong>which elements</strong> it has (locator properties) and <strong>what it can do</strong> (action methods). Tests now read intent, not selectors: <code>login.login("selcuk", "...")</code>. If the page changes you update only the class, not dozens of tests.</p>` },
    { t: "code", id: "c3", simulated: true, setup: SQ.shared.fakeWeb,
      title: { tr: "Kendi LoginPage'in", en: "Your own LoginPage" },
      code: String.raw`
class LoginPage:
    PATH = "/login"

    def __init__(self, page, base_url):
        self.page = page
        self.base_url = base_url.rstrip("/")

    def open(self):
        self.page.goto(self.base_url + self.PATH)

    @property
    def error(self):
        return self.page.locator("#login-error")

    def login(self, username, password):
        self.open()
        self.page.locator("#username").fill(username)
        self.page.locator("#password").fill(password)
        self.page.locator("#login-btn").click()

    def is_logged_in(self):
        return self.page.locator("a[href='/logout']").count() > 0


login = LoginPage(FakePage(), "http://127.0.0.1:5000")
login.login("selcuk", "Selcuk!2026")
print("giriş yapıldı mı / logged in?", login.is_logged_in())

login.login("selcuk", "yanlis-parola")
print("hata mesajı / error:", login.error.inner_text())
` },
    { t: "project", file: "secureqa/pages/base_page.py + login_page.py + products_page.py",
      tr: `<p>Gerçek POM üç parça. <code>BasePage</code> tüm sayfaların ortak davranışını taşır (<code>open</code>, <code>is_logged_in</code>, <code>by_test_id</code>). <code>LoginPage</code> ondan türer, locator'ları <code>@property</code> olarak verir ve <code>login()</code> içinde <code>expect_navigation()</code> ile sayfa geçişini bekler. <code>ProductsPage</code> aramayı ve sonuç sayımını bilir; <code>search()</code> içindeki <code>quote()</code> testte değil, page object'te durur.</p>`,
      en: `<p>The real POM has three parts. <code>BasePage</code> holds behaviour common to all pages (<code>open</code>, <code>is_logged_in</code>, <code>by_test_id</code>). <code>LoginPage</code> inherits it, exposes locators as <code>@property</code>, and in <code>login()</code> waits for the navigation with <code>expect_navigation()</code>. <code>ProductsPage</code> knows search and result counting; the <code>quote()</code> in <code>search()</code> lives in the page object, not the test.</p>`,
      code: String.raw`
class BasePage:
    PATH: str = "/"

    def __init__(self, page: Page, base_url: str) -> None:
        self.page = page
        self.base_url = base_url.rstrip("/")

    def open(self, path: str | None = None) -> Response | None:
        return self.page.goto(self.url_for(path if path is not None else self.PATH))

    def by_test_id(self, test_id: str) -> Locator:
        return self.page.get_by_test_id(test_id)

    def is_logged_in(self) -> bool:
        return self.logout_link().count() > 0


class LoginPage(BasePage):
    PATH = "/login"

    @property
    def username_input(self) -> Locator:
        return self.page.locator("#username")

    def login(self, username: str, password: str) -> None:
        self.open()
        self.username_input.fill(username)
        self.password_input.fill(password)
        with self.page.expect_navigation():
            self.login_button.click()


class ProductsPage(BasePage):
    PATH = "/products"

    @property
    def product_cards(self) -> Locator:
        return self.page.locator("[data-testid='product-card']")

    def search(self, query: str) -> Response | None:
        return self.open(f"{self.PATH}?q={quote(query)}")

    def result_count(self) -> int:
        return self.product_cards.count()
`,
      notes: [
        { line: 9, tr: "<code>open()</code> tek yerde navigasyonu yapar; alt sınıflar <code>PATH</code> vererek yeniden kullanır.", en: "<code>open()</code> does navigation in one place; subclasses reuse it by setting <code>PATH</code>." },
        { line: 12, tr: "<code>by_test_id</code>: en dayanıklı locator'ı ortak bir yardımcıya sarar.", en: "<code>by_test_id</code>: wraps the most robust locator in a shared helper." },
        { line: 22, tr: "Locator'lar <code>@property</code> — her çağrıda taze alınır, bayat referans olmaz.", en: "Locators are <code>@property</code> — fetched fresh each call, no stale references." },
        { line: 29, tr: "<code>expect_navigation()</code>: tıklamadan sonra sayfanın gerçekten değiştiğini bekler.", en: "<code>expect_navigation()</code>: waits for the page to actually change after the click." },
        { line: 40, tr: "<code>quote()</code> page object'te: aramanın URL kodlaması test koduna sızmaz.", en: "<code>quote()</code> lives in the page object: URL-encoding of the search doesn't leak into test code." }
      ] }
  ],
  exercises: [
    { id: "20-e1",
      title: { tr: "Kendi ProductsPage POM'un", en: "Your own ProductsPage POM" },
      setup: SQ.shared.fakeWeb,
      prompt: {
        tr: `<p><code>ProductsPage</code> adında bir sınıf yaz:</p><ul><li><code>__init__(self, page, base_url)</code>: ikisini sakla</li><li><code>search(self, query)</code>: <code>page.goto(base_url + "/products?q=" + quote(query))</code></li><li><code>result_count(self)</code>: <code>page.get_by_test_id("product-card").count()</code> döndür</li></ul><p><code>quote</code>'u <code>urllib.parse</code>'tan al. Boş aramada tüm ürünler (5), <code>"çay"</code> aramasında 1 sonuç dönmeli.</p>`,
        en: `<p>Write a class called <code>ProductsPage</code>:</p><ul><li><code>__init__(self, page, base_url)</code>: store both</li><li><code>search(self, query)</code>: <code>page.goto(base_url + "/products?q=" + quote(query))</code></li><li><code>result_count(self)</code>: return <code>page.get_by_test_id("product-card").count()</code></li></ul><p>Import <code>quote</code> from <code>urllib.parse</code>. An empty search returns all products (5), a <code>"çay"</code> search returns 1.</p>`
      },
      starter: String.raw`
from urllib.parse import quote


class ProductsPage:
    def __init__(self, page, base_url):
        ...

    def search(self, query):
        ...

    def result_count(self):
        ...


products = ProductsPage(FakePage(), "http://127.0.0.1:5000")
products.search("çay")
print("çay ->", products.result_count())
`,
      solution: String.raw`
from urllib.parse import quote


class ProductsPage:
    def __init__(self, page, base_url):
        self.page = page
        self.base_url = base_url.rstrip("/")

    def search(self, query):
        self.page.goto(self.base_url + "/products?q=" + quote(query))

    def result_count(self):
        return self.page.get_by_test_id("product-card").count()


products = ProductsPage(FakePage(), "http://127.0.0.1:5000")
products.search("çay")
print("çay ->", products.result_count())
`,
      check: String.raw`
_p = ProductsPage(FakePage(), "http://127.0.0.1:5000")
_p.search("çay")
assert _p.result_count() == 1, _t(f"'çay' araması 1 sonuç vermeli; gelen {_p.result_count()}.", f"The 'çay' search must give 1 result; got {_p.result_count()}.")
_p.search("")
assert _p.result_count() == 5, _t(f"Boş arama 5 ürün döndürmeli; gelen {_p.result_count()}.", f"An empty search must return 5 products; got {_p.result_count()}.")
_q = ProductsPage(FakePage(), "http://127.0.0.1:5000")
_q.search("olmayan-urun")
assert _q.result_count() == 0, _t("Eşleşme yoksa 0 dönmeli.", "With no match it must return 0.")
`,
      hints: [
        { tr: "search: <code>self.page.goto(self.base_url + \"/products?q=\" + quote(query))</code>.", en: "search: <code>self.page.goto(self.base_url + \"/products?q=\" + quote(query))</code>." },
        { tr: "result_count: <code>return self.page.get_by_test_id(\"product-card\").count()</code>.", en: "result_count: <code>return self.page.get_by_test_id(\"product-card\").count()</code>." }
      ] },
    { id: "20-e2",
      title: { tr: "web-first assertion'larla doğrula", en: "Verify with web-first assertions" },
      setup: SQ.shared.fakeWeb,
      prompt: {
        tr: `<p><code>verify_search(page, base_url, query, expected_count)</code> fonksiyonunu yaz:</p><ol><li><code>page.goto(base_url + "/products?q=" + quote(query))</code></li><li><code>expect(page.locator("#search-term")).to_have_text(query)</code> ile yansıyan terimi doğrula</li><li><code>expect(page.get_by_test_id("product-card")).to_have_count(expected_count)</code> ile sonuç sayısını doğrula</li><li>sonunda <code>print("ok")</code></li></ol><p>Doğru beklentiyle hata vermemeli; yanlış sayıda <code>AssertionError</code> fırlatmalı (web-first assertion'ın işi budur).</p>`,
        en: `<p>Write <code>verify_search(page, base_url, query, expected_count)</code>:</p><ol><li><code>page.goto(base_url + "/products?q=" + quote(query))</code></li><li>assert the reflected term with <code>expect(page.locator("#search-term")).to_have_text(query)</code></li><li>assert the result count with <code>expect(page.get_by_test_id("product-card")).to_have_count(expected_count)</code></li><li>finally <code>print("ok")</code></li></ol><p>It must not error with the right expectation; it must raise <code>AssertionError</code> with a wrong count (that is a web-first assertion's job).</p>`
      },
      starter: String.raw`
from urllib.parse import quote
from playwright.sync_api import expect


def verify_search(page, base_url, query, expected_count):
    ...


verify_search(FakePage(), "http://127.0.0.1:5000", "çay", 1)
`,
      solution: String.raw`
from urllib.parse import quote
from playwright.sync_api import expect


def verify_search(page, base_url, query, expected_count):
    page.goto(base_url + "/products?q=" + quote(query))
    expect(page.locator("#search-term")).to_have_text(query)
    expect(page.get_by_test_id("product-card")).to_have_count(expected_count)
    print("ok")


verify_search(FakePage(), "http://127.0.0.1:5000", "çay", 1)
`,
      check: String.raw`
verify_search(FakePage(), "http://127.0.0.1:5000", "çay", 1)    # doğru -> hata yok
assert "ok" in __output__, _t("Doğru beklentide fonksiyon 'ok' yazmalı.", "With the right expectation the function must print 'ok'.")
_raised = False
try:
    verify_search(FakePage(), "http://127.0.0.1:5000", "çay", 4)  # yanlış sayı
except AssertionError:
    _raised = True
assert _raised, _t("Yanlış expected_count ile expect(...).to_have_count AssertionError fırlatmalı.", "With a wrong expected_count, expect(...).to_have_count must raise AssertionError.")
_raised2 = False
try:
    verify_search(FakePage(), "http://127.0.0.1:5000", "lokum", 0)   # #search-term 'lokum' ama count 1
except AssertionError:
    _raised2 = True
assert _raised2, _t("'lokum' 1 sonuç verir; expected_count=0 ile assertion patlamalı.", "'lokum' gives 1 result; with expected_count=0 the assertion must fail.")
`,
      hints: [
        { tr: "Önce <code>page.goto(...)</code>, sonra iki <code>expect(...)</code> satırı, en sonda <code>print(\"ok\")</code>.", en: "First <code>page.goto(...)</code>, then two <code>expect(...)</code> lines, finally <code>print(\"ok\")</code>." },
        { tr: "<code>expect(page.get_by_test_id(\"product-card\")).to_have_count(expected_count)</code> sonuç sayısını doğrular.", en: "<code>expect(page.get_by_test_id(\"product-card\")).to_have_count(expected_count)</code> asserts the result count." }
      ] }
  ],
  quiz: [
    { q: { tr: "Çok dilli (TR/EN) bir sitede en kırılgan locator hangisidir?", en: "On a multilingual (TR/EN) site, which locator is the most brittle?" },
      options: [{ tr: "<code>get_by_test_id(\"product-card\")</code>", en: "<code>get_by_test_id(\"product-card\")</code>" }, { tr: "<code>get_by_text(\"Sonuçlar\")</code>", en: "<code>get_by_text(\"Results\")</code>" }, { tr: "<code>locator(\"#login-btn\")</code>", en: "<code>locator(\"#login-btn\")</code>" }],
      answer: 1, explain: { tr: "Metin dile göre değişir; <code>data-testid</code> ve kararlı id'ler değişmez.", en: "Text changes with the language; <code>data-testid</code> and stable ids don't." } },
    { q: { tr: "<code>expect(locator).to_have_text(...)</code> neden <code>time.sleep</code> gerektirmez?", en: "Why does <code>expect(locator).to_have_text(...)</code> not need <code>time.sleep</code>?" },
      options: [{ tr: "Çünkü koşul sağlanana kadar kendiliğinden bekler (auto-wait)", en: "Because it waits by itself until the condition holds (auto-wait)" }, { tr: "Çünkü testi atlar", en: "Because it skips the test" }, { tr: "Çünkü asenkron değildir", en: "Because it is not asynchronous" }],
      answer: 0, explain: { tr: "Web-first assertion'lar sabit beklemeleri gereksiz kılar — testler hızlı ve kararlı olur.", en: "Web-first assertions make fixed sleeps unnecessary — tests stay fast and stable." } },
    { q: { tr: "Page Object Model'in temel faydası nedir?", en: "What is the core benefit of the Page Object Model?" },
      options: [{ tr: "Testleri daha hızlı çalıştırır", en: "It runs tests faster" }, { tr: "Locator'lar tek yerde durur; sayfa değişince sadece sınıfı güncellersin, testleri değil", en: "Locators live in one place; when the page changes you update only the class, not the tests" }, { tr: "Tarayıcı gerektirmez", en: "It needs no browser" }],
      answer: 1, explain: { tr: "Testler niyet okur (<code>login.login(...)</code>), seçici ayrıntısı page object'te saklıdır.", en: "Tests read intent (<code>login.login(...)</code>); selector detail is hidden in the page object." } }
  ]
});
