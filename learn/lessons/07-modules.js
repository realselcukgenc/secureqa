SQ.addLesson({
  id: "07-modules",
  num: 7,
  icon: "import",
  minutes: 20,
  title: { tr: "Modüller, import ve paketler", en: "Modules, imports & packages" },
  summary: {
    tr: "Kodu dosyalara ve klasörlere bölmek: import çeşitleri, standart kütüphane, paketler, venv ve pip.",
    en: "Splitting code into files and folders: kinds of import, the standard library, packages, venv and pip."
  },
  goals: {
    tr: [
      "Modül = bir <code>.py</code> dosyası; paket = <code>__init__.py</code> içeren klasör",
      "<code>import x</code>, <code>from x import y</code>, <code>import x as z</code> farkları",
      "Standart kütüphaneden işe yarayanlar: <code>os</code>, <code>pathlib</code>, <code>json</code>, <code>datetime</code>, <code>urllib.parse</code>",
      "<code>if __name__ == \"__main__\":</code>, sanal ortam (venv) ve <code>requirements.txt</code>"
    ],
    en: [
      "Module = a <code>.py</code> file; package = a folder with <code>__init__.py</code>",
      "Difference between <code>import x</code>, <code>from x import y</code>, <code>import x as z</code>",
      "Useful standard-library modules: <code>os</code>, <code>pathlib</code>, <code>json</code>, <code>datetime</code>, <code>urllib.parse</code>",
      "<code>if __name__ == \"__main__\":</code>, virtual environments (venv) and <code>requirements.txt</code>"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>Projen büyüdükçe her şeyi tek dosyaya yazamazsın. Python'da her <code>.py</code> dosyası bir <strong>modüldür</strong>; içindeki fonksiyon, sınıf ve değişkenleri başka bir dosyadan <code>import</code> ile kullanırsın. İçinde <code>__init__.py</code> bulunan klasör bir <strong>pakettir</strong> — <code>secureqa/</code> klasörü gibi.</p>`,
      en: `<p>As your project grows you can't keep everything in one file. In Python every <code>.py</code> file is a <strong>module</strong>; you use its functions, classes and variables from another file with <code>import</code>. A folder containing <code>__init__.py</code> is a <strong>package</strong> — like the <code>secureqa/</code> folder.</p>` },
    { t: "code", id: "c1",
      title: { tr: "Üç import şekli", en: "Three ways to import" },
      code: String.raw`
import json                          # modülün tamamı: json.dumps(...)
from pathlib import Path             # sadece bir isim: Path(...)
from urllib.parse import quote as url_quote   # yeni isimle / renamed
import datetime as dt

print(json.dumps({"lang": "tr", "ok": True}))
print(Path("reports") / "security-report.html")
print(url_quote("<script>"))
print(dt.date(2026, 11, 4).isoformat())

import math
print(math.ceil(2.1), math.floor(2.9))
` },
    { t: "callout", kind: "tip",
      tr: `<p><code>from x import *</code> kullanma: hangi ismin nereden geldiği belirsizleşir ve isimler çakışabilir. Açıkça yazmak (<code>from secureqa.pages import LoginPage, ProductsPage</code>) kodu okuyana yol gösterir.</p>`,
      en: `<p>Avoid <code>from x import *</code>: it hides where names come from and names can clash. Being explicit (<code>from secureqa.pages import LoginPage, ProductsPage</code>) guides the reader.</p>` },
    { t: "h", tr: "Kendi modülünü yazmak", en: "Writing your own module" },
    { t: "text",
      tr: `<p>Tarayıcıdaki Python'un da küçük bir sanal dosya sistemi var. Aşağıdaki hücre, yardımcı <code>make_module()</code> fonksiyonuyla gerçek <code>.py</code> dosyaları oluşturup onları import ediyor — tıpkı SecureQA'nın klasör yapısı gibi.</p>`,
      en: `<p>The Python in your browser has a small virtual file system. The cell below uses a helper <code>make_module()</code> to create real <code>.py</code> files and import them — just like SecureQA's folder layout.</p>` },
    { t: "code", id: "c2", setup: SQ.shared.moduleMaker,
      title: { tr: "Mini bir paket oluştur ve import et", en: "Create and import a mini package" },
      code: String.raw`
make_module("minisqa/__init__.py", '"""Mini SecureQA paketi."""\n')
make_module("minisqa/config.py", '''
DEFAULT_BASE_URL = "http://127.0.0.1:5000"

def url(path: str) -> str:
    return DEFAULT_BASE_URL + "/" + path.lstrip("/")

print("[config] modül yüklendi:", __name__)
''')

from minisqa.config import url, DEFAULT_BASE_URL
import minisqa.config as cfg

print(url("login"))
print(cfg.DEFAULT_BASE_URL is DEFAULT_BASE_URL)   # aynı nesne / same object
print(cfg.__file__)
` },
    { t: "callout", kind: "info",
      tr: `<p>Dikkat et: modülün içindeki <code>print</code> sadece <strong>bir kez</strong>, ilk import'ta çalıştı. Python yüklenen modülleri <code>sys.modules</code>'te önbelleğe alır; ikinci import aynı nesneyi verir. Bu yüzden modül seviyesinde “yan etkisi olan” kod (sunucu başlatmak, tarayıcı açmak) yazılmaz; o işler fonksiyonlara veya fixture'lara konur.</p>`,
      en: `<p>Notice: the <code>print</code> inside the module ran only <strong>once</strong>, on the first import. Python caches loaded modules in <code>sys.modules</code>; a second import returns the same object. That's why you don't put code with side effects (starting servers, opening browsers) at module level; it goes into functions or fixtures.</p>` },
    { t: "h", tr: "__name__ == \"__main__\"", en: "__name__ == \"__main__\"" },
    { t: "text",
      tr: `<p>Bir dosya doğrudan çalıştırıldığında (<code>python run.py</code>) içindeki <code>__name__</code> değişkeni <code>"__main__"</code> olur; import edildiğinde ise modülün adı olur. Bu kalıp “dosya hem import edilebilsin hem de komut olarak çalışabilsin” demektir. <code>python -m demo_app</code> komutu da paketin <code>__main__.py</code> dosyasını çalıştırır.</p>`,
      en: `<p>When a file is run directly (<code>python run.py</code>) its <code>__name__</code> is <code>"__main__"</code>; when imported it's the module name. This pattern means “the file can be imported and also run as a command”. <code>python -m demo_app</code> runs the package's <code>__main__.py</code>.</p>` },
    { t: "code", id: "c3", readonly: true, real: true, file: "run.py (örnek / example)",
      code: String.raw`
import subprocess
import sys


def run_tests(mode: str = "vulnerable") -> int:
    return subprocess.call([sys.executable, "-m", "pytest", "--mode", mode])


if __name__ == "__main__":
    # Sadece "python run.py" ile çalışır, import edilince çalışmaz.
    sys.exit(run_tests())
` },
    { t: "h", tr: "Sanal ortam ve pip", en: "Virtual environments and pip" },
    { t: "text",
      tr: `<p>Üçüncü parti paketler (<code>pytest</code>, <code>playwright</code>, <code>requests</code>) <code>pip</code> ile kurulur. Her projenin bağımlılıkları birbirine karışmasın diye bir <strong>sanal ortam</strong> (venv) kullanılır. <code>requirements.txt</code> dosyası ekip arkadaşının ve CI'ın aynı sürümleri kurmasını sağlar.</p>`,
      en: `<p>Third-party packages (<code>pytest</code>, <code>playwright</code>, <code>requests</code>) are installed with <code>pip</code>. A <strong>virtual environment</strong> (venv) keeps each project's dependencies separate. A <code>requirements.txt</code> file makes your teammates and CI install the same versions.</p>` },
    { t: "code", id: "c4", readonly: true, real: true, lang: "bash", file: "terminal",
      code: String.raw`
# Bir kez / once
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

# Hangi paketler kurulu? / what is installed?
pip list
pip freeze > requirements.txt
` },
    { t: "project", file: "SecureQA proje yapısı / project layout",
      tr: `<p>SecureQA bir paket: <code>secureqa/</code> klasöründeki her dosya bir modül, <code>pages/</code> ve <code>security/</code> alt paketler. <code>pages/__init__.py</code> sınıfları yeniden dışa aktararak (re-export) kısa import'lara izin veriyor: <code>from secureqa.pages import LoginPage</code>.</p>`,
      en: `<p>SecureQA is a package: every file in <code>secureqa/</code> is a module, <code>pages/</code> and <code>security/</code> are sub-packages. <code>pages/__init__.py</code> re-exports the classes so imports stay short: <code>from secureqa.pages import LoginPage</code>.</p>`,
      lang: "text",
      code: String.raw`
secureqa/                     <- paket / package
  __init__.py
  config.py                   <- from secureqa.config import Settings
  findings.py                 <- from secureqa.findings import Finding
  pages/                      <- alt paket / sub-package
    __init__.py               <- from secureqa.pages.login_page import LoginPage
    base_page.py
    login_page.py             <- from secureqa.pages.base_page import BasePage
  security/
    payloads.py
    xss.py                    <- from secureqa.security.payloads import XSS_MARKER
tests/
  conftest.py                 <- pytest bunu otomatik yükler / auto-loaded by pytest
  security/test_injection_xss.py
`,
      notes: [
        { line: 2, tr: "<code>__init__.py</code> klasörü pakete çevirir (boş da olabilir).", en: "<code>__init__.py</code> turns a folder into a package (it may be empty)." },
        { line: 6, tr: "Re-export: <code>__init__.py</code> içinde <code>from secureqa.pages.login_page import LoginPage</code> ve <code>__all__ = [...]</code>.", en: "Re-export: inside <code>__init__.py</code>, <code>from secureqa.pages.login_page import LoginPage</code> and <code>__all__ = [...]</code>." },
        { line: 8, tr: "Mutlak import (absolute): proje kökünden tam yol. Okunması en kolay olan budur.", en: "Absolute import: the full path from the project root. The easiest to read." },
        { line: 13, tr: "<code>conftest.py</code> import edilmez; pytest onu kendisi bulur (10. ders).", en: "<code>conftest.py</code> is never imported; pytest finds it itself (lesson 10)." }
      ] }
  ],
  exercises: [
    { id: "07-e1",
      title: { tr: "pathlib ile rapor yolu", en: "Report path with pathlib" },
      prompt: {
        tr: `<p><code>pathlib</code>'den <code>Path</code>'i import et ve:</p><ul><li><code>reports_dir</code> = <code>Path("reports")</code></li><li><code>report_path</code> = <code>reports_dir</code> içinde <code>"security-report.html"</code> (<code>/</code> operatörüyle)</li><li><code>report_name</code> = dosya adı (<code>.name</code>), <code>extension</code> = uzantı (<code>.suffix</code>)</li></ul>`,
        en: `<p>Import <code>Path</code> from <code>pathlib</code> and:</p><ul><li><code>reports_dir</code> = <code>Path("reports")</code></li><li><code>report_path</code> = <code>"security-report.html"</code> inside <code>reports_dir</code> (with the <code>/</code> operator)</li><li><code>report_name</code> = the file name (<code>.name</code>), <code>extension</code> = the suffix (<code>.suffix</code>)</li></ul>`
      },
      starter: String.raw`
# import ...

reports_dir = ...
report_path = ...
report_name = ...
extension = ...

print(report_path, report_name, extension)
`,
      solution: String.raw`
from pathlib import Path

reports_dir = Path("reports")
report_path = reports_dir / "security-report.html"
report_name = report_path.name
extension = report_path.suffix

print(report_path, report_name, extension)
`,
      check: String.raw`
from pathlib import Path as _P
assert isinstance(reports_dir, _P) and str(reports_dir) == "reports", _t("reports_dir = Path(\"reports\") olmalı.", "reports_dir must be Path(\"reports\").")
assert isinstance(report_path, _P), _t("report_path bir Path olmalı (reports_dir / \"...\").", "report_path must be a Path (reports_dir / \"...\").")
assert report_path.as_posix() == "reports/security-report.html", _t(f"report_path yanlış: {report_path}", f"report_path is wrong: {report_path}")
assert report_name == "security-report.html", _t("report_name için report_path.name kullan.", "Use report_path.name for report_name.")
assert extension == ".html", _t("extension için report_path.suffix kullan (nokta dahil: '.html').", "Use report_path.suffix for extension (with the dot: '.html').")
`,
      hints: [
        { tr: "<code>from pathlib import Path</code>", en: "<code>from pathlib import Path</code>" },
        { tr: "Path nesneleri <code>/</code> ile birleşir: <code>reports_dir / \"security-report.html\"</code>.", en: "Path objects join with <code>/</code>: <code>reports_dir / \"security-report.html\"</code>." }
      ] },
    { id: "07-e2",
      title: { tr: "Ortam değişkeninden ayar oku", en: "Read a setting from the environment" },
      prompt: {
        tr: `<p><code>os</code> modülünü import et ve <code>get_base_url() -&gt; str</code> fonksiyonunu yaz: <code>BASE_URL</code> ortam değişkeni varsa onu, yoksa <code>"http://127.0.0.1:5000"</code> değerini döndürsün. Her iki durumda da sondaki <code>/</code> silinsin. (Kontrol, <code>os.environ</code>'u değiştirerek fonksiyonunu birkaç kez çağıracak.)</p>`,
        en: `<p>Import the <code>os</code> module and write <code>get_base_url() -&gt; str</code>: return the <code>BASE_URL</code> environment variable if set, otherwise <code>"http://127.0.0.1:5000"</code>. In both cases strip the trailing <code>/</code>. (The check will change <code>os.environ</code> and call your function several times.)</p>`
      },
      starter: String.raw`
def get_base_url() -> str:
    return "http://127.0.0.1:5000"


print(get_base_url())
`,
      solution: String.raw`
import os


def get_base_url() -> str:
    return os.environ.get("BASE_URL", "http://127.0.0.1:5000").rstrip("/")


print(get_base_url())
`,
      check: String.raw`
import os as _os
_old = _os.environ.pop("BASE_URL", None)
try:
    assert get_base_url() == "http://127.0.0.1:5000", _t("BASE_URL yokken varsayılan adres dönmeli.", "Without BASE_URL the default address must be returned.")
    _os.environ["BASE_URL"] = "http://staging.local:8000/"
    _got = get_base_url()
    assert _got == "http://staging.local:8000", _t(f"BASE_URL='http://staging.local:8000/' iken {_got!r} döndü; ortam değişkenini oku ve sondaki / işaretini sil.", f"With BASE_URL='http://staging.local:8000/' got {_got!r}; read the env var and strip the trailing /.")
finally:
    _os.environ.pop("BASE_URL", None)
    if _old is not None:
        _os.environ["BASE_URL"] = _old
`,
      hints: [
        { tr: "<code>os.environ.get(\"BASE_URL\", \"http://127.0.0.1:5000\")</code> — ikinci argüman varsayılan değerdir.", en: "<code>os.environ.get(\"BASE_URL\", \"http://127.0.0.1:5000\")</code> — the second argument is the default." },
        { tr: "Sonuca <code>.rstrip(\"/\")</code> ekle. SecureQA'nın <code>config.py</code> dosyası da aynısını yapıyor.", en: "Append <code>.rstrip(\"/\")</code> to the result. SecureQA's <code>config.py</code> does the same." }
      ] }
  ],
  quiz: [
    { q: { tr: "Bir klasörü Python paketi yapan dosya hangisi?", en: "Which file makes a folder a Python package?" },
      options: [{ tr: "<code>main.py</code>", en: "<code>main.py</code>" }, { tr: "<code>__init__.py</code>", en: "<code>__init__.py</code>" }, { tr: "<code>setup.cfg</code>", en: "<code>setup.cfg</code>" }],
      answer: 1, explain: { tr: "<code>__init__.py</code> (boş bile olsa) klasörü bir paket olarak işaretler.", en: "<code>__init__.py</code> (even empty) marks the folder as a package." } },
    { q: { tr: "Bir modülü iki kez import edersen içindeki üst seviye kod kaç kez çalışır?", en: "If you import a module twice, how many times does its top-level code run?" },
      options: [{ tr: "Bir kez", en: "Once" }, { tr: "İki kez", en: "Twice" }, { tr: "Hiç", en: "Never" }],
      answer: 0, explain: { tr: "Modüller <code>sys.modules</code>'te önbelleğe alınır.", en: "Modules are cached in <code>sys.modules</code>." } },
    { q: { tr: "<code>if __name__ == \"__main__\":</code> bloğu ne zaman çalışır?", en: "When does an <code>if __name__ == \"__main__\":</code> block run?" },
      options: [{ tr: "Dosya import edildiğinde", en: "When the file is imported" }, { tr: "Her zaman", en: "Always" }, { tr: "Dosya doğrudan çalıştırıldığında", en: "When the file is run directly" }],
      answer: 2, explain: { tr: "Doğrudan çalıştırılan dosyanın <code>__name__</code> değeri <code>\"__main__\"</code> olur.", en: "A file run directly has <code>__name__ == \"__main__\"</code>." } }
  ]
});
