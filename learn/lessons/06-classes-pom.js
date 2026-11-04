SQ.addLesson({
  id: "06-classes-pom",
  num: 6,
  icon: "class",
  minutes: 30,
  title: { tr: "Sınıflar ve Page Object Model", en: "Classes & the Page Object Model" },
  summary: {
    tr: "class, __init__, self, kalıtım ve @property — ve bunların SecureQA'daki BasePage/LoginPage'e dönüşmesi.",
    en: "class, __init__, self, inheritance and @property — and how they become SecureQA's BasePage/LoginPage."
  },
  goals: {
    tr: [
      "Sınıf = şablon, nesne = o şablondan üretilmiş örnek",
      "<code>__init__</code> ve <code>self</code>: nesnenin kendi verisi",
      "Kalıtım: <code>class LoginPage(BasePage)</code> ve <code>super()</code>",
      "<code>@property</code> ile locator'ları metot çağırmadan okumak"
    ],
    en: [
      "Class = template, object = an instance made from that template",
      "<code>__init__</code> and <code>self</code>: the object's own data",
      "Inheritance: <code>class LoginPage(BasePage)</code> and <code>super()</code>",
      "<code>@property</code> to read locators without calling a method"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p><strong>Sınıf</strong> (class), veri ve o veriyle çalışan fonksiyonları (bunlara <strong>metot</strong> denir) bir arada tutan bir şablondur. Sınıftan ürettiğin her şeye <strong>nesne</strong> (object / instance) denir. Selenium'dan bildiğin <code>driver</code> da, Playwright'taki <code>page</code> da birer nesnedir.</p>
<p><code>__init__</code> nesne oluşturulurken otomatik çalışan “kurulum” metodudur. <code>self</code> ise “bu nesnenin kendisi” demektir: <code>self.username = username</code> değeri nesnenin içine kaydeder.</p>`,
      en: `<p>A <strong>class</strong> is a template that keeps data together with the functions working on it (called <strong>methods</strong>). Everything you create from a class is an <strong>object</strong> (instance). Selenium's <code>driver</code> and Playwright's <code>page</code> are objects too.</p>
<p><code>__init__</code> is the “setup” method that runs automatically when an object is created. <code>self</code> means “this very object”: <code>self.username = username</code> stores the value inside the object.</p>` },
    { t: "code", id: "c1",
      title: { tr: "Bir test kullanıcısı sınıfı", en: "A test user class" },
      code: String.raw`
class TestUser:
    """Test verisi olarak bir kullanıcı. / A user as test data."""

    def __init__(self, username: str, password: str, role: str = "user") -> None:
        self.username = username
        self.password = password
        self.role = role

    def is_admin(self) -> bool:
        return self.role == "admin"

    def __repr__(self) -> str:          # print() ve hata mesajlarında görünen hali
        return f"TestUser({self.username!r}, role={self.role!r})"


admin = TestUser("admin", "admin123", role="admin")
selcuk = TestUser("selcuk", "Selcuk!2026")

print(admin, admin.is_admin())
print(selcuk, selcuk.is_admin())
print(selcuk.username)           # nesnenin verisine erişim / attribute access
` },
    { t: "callout", kind: "qa",
      tr: `<p><strong>Page Object Model</strong> tek cümlede: <em>web sitesinin her sayfası için bir sınıf yaz; locator'lar ve sayfa aksiyonları o sınıfta dursun.</em> Testler <code>login_page.login("selcuk", "...")</code> gibi okunur. HTML değişirse <strong>sadece sınıfı</strong> güncellersin, yüzlerce testi değil.</p>`,
      en: `<p>The <strong>Page Object Model</strong> in one sentence: <em>write one class per page of the site; locators and page actions live in that class.</em> Tests read like <code>login_page.login("selcuk", "...")</code>. When the HTML changes you update <strong>only the class</strong>, not hundreds of tests.</p>` },
    { t: "h", tr: "Kalıtım: BasePage → LoginPage", en: "Inheritance: BasePage → LoginPage" },
    { t: "text",
      tr: `<p><code>class LoginPage(BasePage):</code> “LoginPage, BasePage'in her şeyini <strong>miras alır</strong> ve üstüne kendi özelliklerini ekler” demektir. Ortak işler (sayfayı açmak, URL üretmek, giriş yapılmış mı kontrol etmek) bir kez <code>BasePage</code>'de yazılır. Alt sınıf bir sınıf değişkenini (<code>PATH</code>) <strong>ezerek</strong> (override) davranışı değiştirebilir.</p>
<p>Aşağıdaki hücre gerçek Playwright yerine tarayıcıda çalışan bir <strong>FakePage</strong> kullanıyor. FakePage, <strong>MiniShop (simülasyon)</strong> adlı küçük bir sahte mağaza üzerinde çalışır; her aksiyonu <code>page.log</code> listesine kaydeder. Gerçek projede aynı Page Object'ler SecureShop'a (<code>demo_app/</code>) karşı çalışır.</p>`,
      en: `<p><code>class LoginPage(BasePage):</code> means “LoginPage <strong>inherits</strong> everything from BasePage and adds its own features”. Common work (opening the page, building URLs, checking login state) is written once in <code>BasePage</code>. A child class can <strong>override</strong> a class variable (<code>PATH</code>) to change behaviour.</p>
<p>The cell below uses a <strong>FakePage</strong> that runs in the browser instead of real Playwright. FakePage runs on <strong>MiniShop (simulation)</strong>, a tiny fake shop; it records every action in the <code>page.log</code> list. In the real project the same Page Objects run against SecureShop (<code>demo_app/</code>).</p>` },
    { t: "code", id: "c2", simulated: true,
      setup: SQ.shared.fakeWeb,
      title: { tr: "Kendi BasePage ve LoginPage'in", en: "Your own BasePage and LoginPage" },
      code: String.raw`
class BasePage:
    PATH = "/"

    def __init__(self, page, base_url: str) -> None:
        self.page = page
        self.base_url = base_url.rstrip("/")

    def open(self) -> None:
        self.page.goto(self.base_url + self.PATH)

    def is_logged_in(self) -> bool:
        return self.page.locator("a[href='/logout']").count() > 0


class LoginPage(BasePage):
    PATH = "/login"                       # override

    @property
    def username_input(self):
        return self.page.locator("#username")

    @property
    def password_input(self):
        return self.page.locator("#password")

    def login(self, username: str, password: str) -> None:
        self.open()                       # BasePage'den miras / inherited
        self.username_input.fill(username)
        self.password_input.fill(password)
        self.page.locator("#login-btn").click()

    def error_text(self) -> str:
        return self.page.locator("#login-error").inner_text()


page = FakePage()                         # simülasyon / simulation
login = LoginPage(page, "http://127.0.0.1:5000/")
login.login("selcuk", "yanlis-parola")
print("Hata:", login.error_text(), "| giriş?", login.is_logged_in())

login.login("selcuk", "Selcuk!2026")
print("URL:", page.url, "| giriş?", login.is_logged_in())

for action in page.log:
    print("  ", action)
` },
    { t: "callout", kind: "tip",
      tr: `<p><code>@property</code> bir metodu <strong>özellik gibi</strong> okunur hale getirir: <code>login.username_input</code> (parantezsiz). Locator'lar için idealdir çünkü her erişimde güncel locator üretilir ama kullanımı bir değişken kadar basittir.</p>`,
      en: `<p><code>@property</code> makes a method readable <strong>like an attribute</strong>: <code>login.username_input</code> (no parentheses). Perfect for locators: a fresh locator is created on every access but using it is as simple as a variable.</p>` },
    { t: "code", id: "c3", simulated: true,
      setup: SQ.shared.fakeWeb,
      title: { tr: "super() ve isinstance()", en: "super() and isinstance()" },
      code: String.raw`
class BasePage:
    PATH = "/"

    def __init__(self, page, base_url: str) -> None:
        self.page = page
        self.base_url = base_url.rstrip("/")

    def open(self) -> None:
        self.page.goto(self.base_url + self.PATH)


class AdminPage(BasePage):
    PATH = "/admin"

    def __init__(self, page, base_url: str, strict: bool = True) -> None:
        super().__init__(page, base_url)    # önce ebeveynin kurulumu / parent's setup first
        self.strict = strict


admin = AdminPage(FakePage(), "http://127.0.0.1:5000")
admin.open()
print(admin.page.url, admin.strict)
print(isinstance(admin, AdminPage), isinstance(admin, BasePage))
print(AdminPage.__mro__)     # metot arama sırası / method resolution order
` },
    { t: "project", file: "secureqa/pages/login_page.py",
      tr: `<p>SecureQA'nın gerçek <code>LoginPage</code>'i. Kendi yazdığına çok benziyor; farklar: gerçek Playwright tipleri (<code>Locator</code>), <code>expect_navigation()</code> ile sayfanın yüklenmesini bekleme ve hata kutusu yoksa boş string döndürme.</p>`,
      en: `<p>SecureQA's real <code>LoginPage</code>. It's very close to what you wrote; differences: real Playwright types (<code>Locator</code>), waiting for the page load with <code>expect_navigation()</code> and returning an empty string when there is no error box.</p>`,
      code: String.raw`
from playwright.sync_api import Locator

from secureqa.pages.base_page import BasePage


class LoginPage(BasePage):
    """Login form with #username, #password, #login-btn and error #login-error."""

    PATH = "/login"

    @property
    def username_input(self) -> Locator:
        return self.page.locator("#username")

    @property
    def password_input(self) -> Locator:
        return self.page.locator("#password")

    @property
    def login_button(self) -> Locator:
        return self.page.locator("#login-btn")

    @property
    def error_message(self) -> Locator:
        return self.page.locator("#login-error")

    def login(self, username: str, password: str) -> None:
        """Fill the form and submit it, then wait for the next page to load."""
        self.open()
        self.username_input.fill(username)
        self.password_input.fill(password)
        with self.page.expect_navigation():
            self.login_button.click()

    def error_text(self) -> str:
        """Text of the error box, or "" if there is no error on the page."""
        if self.error_message.count() == 0:
            return ""
        return self.error_message.inner_text().strip()
`,
      notes: [
        { line: 3, tr: "Ebeveyn sınıf kendi modülünden import ediliyor (7. ders).", en: "The parent class is imported from its own module (lesson 7)." },
        { line: 6, tr: "Kalıtım: <code>open()</code>, <code>is_logged_in()</code>, <code>url_for()</code> BasePage'den gelir.", en: "Inheritance: <code>open()</code>, <code>is_logged_in()</code>, <code>url_for()</code> come from BasePage." },
        { line: 9, tr: "<code>PATH</code> override: <code>BasePage.open()</code> bu değeri kullanır.", en: "<code>PATH</code> override: <code>BasePage.open()</code> uses this value." },
        { line: 11, tr: "Locator'lar <code>@property</code>; spec'teki sabit id'ler (<code>#username</code> …) burada tek yerde.", en: "Locators are <code>@property</code>s; the stable ids from the spec (<code>#username</code> …) live here only." },
        { line: 32, tr: "<code>with</code> bloğu: tıklamadan doğan sayfa geçişi bitene kadar bekler (12. ders).", en: "The <code>with</code> block waits until the navigation caused by the click finishes (lesson 12)." },
        { line: 37, tr: "Önce eleman var mı diye bak; yoksa beklemeden <code>\"\"</code> dön.", en: "First check the element exists; if not, return <code>\"\"</code> without waiting." }
      ] }
  ],
  exercises: [
    { id: "06-e1",
      title: { tr: "TestUser sınıfını genişlet", en: "Extend the TestUser class" },
      prompt: {
        tr: `<p>Bir <code>TestUser</code> sınıfı yaz:</p><ul><li><code>__init__(self, username, password, role="user")</code> üç değeri de saklasın</li><li><code>is_admin()</code> → rol <code>"admin"</code> ise <code>True</code></li><li><code>credentials()</code> → <code>(username, password)</code> tuple'ı döndürsün</li></ul><p>Sonra <code>ayse = TestUser("ayse", "ayse2026")</code> nesnesini oluştur.</p>`,
        en: `<p>Write a <code>TestUser</code> class:</p><ul><li><code>__init__(self, username, password, role="user")</code> stores all three values</li><li><code>is_admin()</code> → <code>True</code> when the role is <code>"admin"</code></li><li><code>credentials()</code> → returns a <code>(username, password)</code> tuple</li></ul><p>Then create the object <code>ayse = TestUser("ayse", "ayse2026")</code>.</p>`
      },
      starter: String.raw`
class TestUser:
    def __init__(self, username, password, role="user"):
        self.username = username
        # ...

    def is_admin(self):
        ...

    def credentials(self):
        ...


ayse = ...
`,
      solution: String.raw`
class TestUser:
    def __init__(self, username, password, role="user"):
        self.username = username
        self.password = password
        self.role = role

    def is_admin(self):
        return self.role == "admin"

    def credentials(self):
        return (self.username, self.password)


ayse = TestUser("ayse", "ayse2026")
print(ayse.credentials(), ayse.is_admin())
`,
      check: String.raw`
assert isinstance(globals().get("TestUser"), type), _t("TestUser bir sınıf olmalı.", "TestUser must be a class.")
_a = TestUser("admin", "admin123", role="admin")
_u = TestUser("u", "p")
assert getattr(_u, "role", None) == "user", _t("role varsayılanı 'user' olmalı ve self.role'e kaydedilmeli.", "role must default to 'user' and be stored in self.role.")
assert getattr(_u, "password", None) == "p", _t("password self.password'e kaydedilmeli.", "password must be stored in self.password.")
assert _a.is_admin() is True and _u.is_admin() is False, _t("is_admin() admin için True, diğerleri için False dönmeli.", "is_admin() must be True for admin and False otherwise.")
assert _u.credentials() == ("u", "p"), _t("credentials() (username, password) tuple'ı döndürmeli.", "credentials() must return a (username, password) tuple.")
assert isinstance(ayse, TestUser) and ayse.username == "ayse" and ayse.password == "ayse2026", _t("ayse = TestUser(\"ayse\", \"ayse2026\") oluştur.", "Create ayse = TestUser(\"ayse\", \"ayse2026\").")
`,
      hints: [
        { tr: "<code>__init__</code> içinde her parametre için bir satır: <code>self.password = password</code>, <code>self.role = role</code>.", en: "One line per parameter in <code>__init__</code>: <code>self.password = password</code>, <code>self.role = role</code>." },
        { tr: "Metotlar nesnenin verisine <code>self.</code> ile ulaşır: <code>return self.role == \"admin\"</code>.", en: "Methods reach the object's data via <code>self.</code>: <code>return self.role == \"admin\"</code>." }
      ] },
    { id: "06-e2",
      title: { tr: "ProductsPage page object'i", en: "A ProductsPage page object" },
      setup: SQ.shared.fakeWeb + "\n" + String.raw`
class BasePage:
    PATH = "/"

    def __init__(self, page, base_url: str) -> None:
        self.page = page
        self.base_url = base_url.rstrip("/")

    def open(self, path=None) -> None:
        self.page.goto(self.base_url + (path if path is not None else self.PATH))

    def content(self) -> str:
        return self.page.content()
`,
      prompt: {
        tr: `<p>Hazır bir <code>BasePage</code> var (<code>open(path=None)</code> ve <code>content()</code> metotlarıyla; FakePage de hazır). <code>BasePage</code>'den türeyen <code>ProductsPage</code> yaz:</p><ul><li><code>PATH = "/products"</code></li><li><code>search(self, query)</code> → <code>self.open(f"{self.PATH}?q={query}")</code> ile arama sayfasını açsın</li><li><code>search_term</code> bir <code>@property</code> olsun ve <code>#search-term</code> locator'ını döndürsün</li></ul>`,
        en: `<p>A <code>BasePage</code> is ready (with <code>open(path=None)</code> and <code>content()</code>; FakePage is ready too). Write <code>ProductsPage</code> inheriting from <code>BasePage</code>:</p><ul><li><code>PATH = "/products"</code></li><li><code>search(self, query)</code> → opens the search page with <code>self.open(f"{self.PATH}?q={query}")</code></li><li><code>search_term</code> is a <code>@property</code> returning the <code>#search-term</code> locator</li></ul>`
      },
      starter: String.raw`
class ProductsPage(BasePage):
    PATH = "/"

    def search(self, query):
        pass


products = ProductsPage(FakePage(), "http://127.0.0.1:5000")
products.search("çay")
print(products.page.url)
`,
      solution: String.raw`
class ProductsPage(BasePage):
    PATH = "/products"

    def search(self, query):
        self.open(f"{self.PATH}?q={query}")

    @property
    def search_term(self):
        return self.page.locator("#search-term")


products = ProductsPage(FakePage(), "http://127.0.0.1:5000")
products.search("çay")
print(products.page.url)
print(products.search_term.inner_text())
`,
      check: String.raw`
assert issubclass(ProductsPage, BasePage), _t("ProductsPage, BasePage'den türemeli: class ProductsPage(BasePage).", "ProductsPage must inherit from BasePage: class ProductsPage(BasePage).")
assert ProductsPage.PATH == "/products", _t("PATH '/products' olmalı.", "PATH must be '/products'.")
_p = ProductsPage(FakePage(), "http://127.0.0.1:5000/")
_p.search("lokum")
assert _p.page.url == "http://127.0.0.1:5000/products?q=lokum", _t(f"search('lokum') sonrası URL yanlış: {_p.page.url}", f"Wrong URL after search('lokum'): {_p.page.url}")
assert isinstance(ProductsPage.__dict__.get("search_term"), property), _t("search_term bir @property olmalı.", "search_term must be a @property.")
assert _p.search_term.inner_text() == "lokum", _t("search_term, #search-term locator'ını döndürmeli.", "search_term must return the #search-term locator.")
`,
      hints: [
        { tr: "<code>self.open(...)</code> BasePage'den miras geliyor; tam URL'yi o üretir.", en: "<code>self.open(...)</code> is inherited from BasePage; it builds the full URL." },
        { tr: "<code>@property</code> satırını <code>def search_term(self):</code> satırının hemen üstüne yaz ve <code>return self.page.locator(\"#search-term\")</code>.", en: "Put <code>@property</code> right above <code>def search_term(self):</code> and <code>return self.page.locator(\"#search-term\")</code>." }
      ] }
  ],
  quiz: [
    { q: { tr: "<code>self</code> neyi temsil eder?", en: "What does <code>self</code> represent?" },
      options: [{ tr: "Sınıfın kendisini", en: "The class itself" }, { tr: "Metodu çağıran nesnenin kendisini", en: "The object the method is called on" }, { tr: "Global değişkenleri", en: "Global variables" }],
      answer: 1, explain: { tr: "<code>login.login(...)</code> çağrısında <code>self</code> = <code>login</code> nesnesi.", en: "In <code>login.login(...)</code>, <code>self</code> is the <code>login</code> object." } },
    { q: { tr: "Page Object Model'in en büyük faydası?", en: "The biggest benefit of the Page Object Model?" },
      options: [{ tr: "Testleri daha hızlı çalıştırır", en: "Tests run faster" }, { tr: "Tarayıcı gerektirmez", en: "No browser needed" }, { tr: "UI değişince sadece sayfa sınıfı güncellenir", en: "When the UI changes, only the page class is updated" }],
      answer: 2, explain: { tr: "Locator'lar ve aksiyonlar tek yerde olduğu için bakım kolaylaşır.", en: "Locators and actions live in one place, so maintenance is easy." } },
    { q: { tr: "<code>class LoginPage(BasePage)</code> içinde <code>PATH = \"/login\"</code> yazmak ne yapar?", en: "What does <code>PATH = \"/login\"</code> inside <code>class LoginPage(BasePage)</code> do?" },
      options: [{ tr: "BasePage'in PATH değerini LoginPage için ezer (override)", en: "Overrides BasePage's PATH for LoginPage" }, { tr: "BasePage'in PATH değerini her yerde değiştirir", en: "Changes BasePage's PATH everywhere" }, { tr: "Hata verir", en: "Raises an error" }],
      answer: 0, explain: { tr: "Alt sınıftaki tanım sadece alt sınıf için geçerlidir; <code>BasePage.PATH</code> hâlâ <code>\"/\"</code>.", en: "The child's definition applies to the child only; <code>BasePage.PATH</code> is still <code>\"/\"</code>." } }
  ]
});
