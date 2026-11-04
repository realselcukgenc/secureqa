SQ.addLesson({
  id: "09-files-json",
  num: 9,
  icon: "{json}",
  minutes: 20,
  title: { tr: "Dosyalar ve JSON", en: "Files & JSON" },
  summary: {
    tr: "with open(...), UTF-8 ve Türkçe karakterler, pathlib ve json: test verisi okumak, findings.json yazmak.",
    en: "with open(...), UTF-8 and Turkish characters, pathlib and json: reading test data, writing findings.json."
  },
  goals: {
    tr: [
      "<code>with open(path, mode, encoding=\"utf-8\")</code> ile güvenli dosya okuma/yazma",
      "<code>pathlib.Path</code>: <code>read_text</code>, <code>write_text</code>, <code>exists</code>, <code>mkdir</code>",
      "<code>json.dumps</code>/<code>loads</code> (string) ve <code>json.dump</code>/<code>load</code> (dosya)",
      "<code>ensure_ascii=False</code> ve <code>indent=2</code> ile okunaklı, Türkçe dostu JSON"
    ],
    en: [
      "Safe file reading/writing with <code>with open(path, mode, encoding=\"utf-8\")</code>",
      "<code>pathlib.Path</code>: <code>read_text</code>, <code>write_text</code>, <code>exists</code>, <code>mkdir</code>",
      "<code>json.dumps</code>/<code>loads</code> (strings) and <code>json.dump</code>/<code>load</code> (files)",
      "Readable, Turkish-friendly JSON with <code>ensure_ascii=False</code> and <code>indent=2</code>"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>Test otomasyonunda dosyalar her yerde: test verisi (CSV/JSON), konfigürasyon, ekran görüntüleri, loglar ve raporlar. Python'da dosya açmanın doğru yolu <code>with</code> bloğudur: blok bitince dosya <strong>hata olsa bile</strong> otomatik kapanır (8. dersteki <code>finally</code>'nin kısa hali).</p>
<p><strong>Her zaman <code>encoding="utf-8"</code> yaz.</strong> Yazmazsan Windows'ta farklı bir kodlama seçilebilir ve “Çay Bardağı Seti” bozuk karakterlerle kaydedilir.</p>`,
      en: `<p>Files are everywhere in test automation: test data (CSV/JSON), configuration, screenshots, logs and reports. The right way to open a file in Python is a <code>with</code> block: when the block ends the file is closed automatically, <strong>even on errors</strong> (a short form of lesson 8's <code>finally</code>).</p>
<p><strong>Always write <code>encoding="utf-8"</code>.</strong> Without it Windows may pick another encoding and “Çay Bardağı Seti” gets saved with broken characters.</p>` },
    { t: "code", id: "c1",
      title: { tr: "Yaz, ekle, oku", en: "Write, append, read" },
      code: String.raw`
with open("test-log.txt", "w", encoding="utf-8") as f:     # w = üzerine yaz / overwrite
    f.write("Test başladı: giriş sayfası\n")

with open("test-log.txt", "a", encoding="utf-8") as f:     # a = sona ekle / append
    f.write("Adım: kullanıcı adı girildi (selçuk)\n")
    f.write("Sonuç: PASSED\n")

with open("test-log.txt", "r", encoding="utf-8") as f:     # r = oku / read
    for line_no, line in enumerate(f, start=1):
        print(line_no, line.rstrip("\n"))
` },
    { t: "code", id: "c2",
      title: { tr: "pathlib ile daha kısa", en: "Shorter with pathlib" },
      code: String.raw`
from pathlib import Path

reports = Path("reports")
reports.mkdir(parents=True, exist_ok=True)          # klasör yoksa oluştur / create if missing

note = reports / "notes.txt"
note.write_text("Bulgu: CSP başlığı eksik\n", encoding="utf-8")
print(note.exists(), note.name, note.suffix, note.stat().st_size, "byte")
print(note.read_text(encoding="utf-8"))

for path in sorted(reports.iterdir()):
    print("->", path)
` },
    { t: "h", tr: "JSON: API'lerin ve raporların dili", en: "JSON: the language of APIs and reports" },
    { t: "text",
      tr: `<p>JSON metni Python'a çevrildiğinde nesneler <code>dict</code>, diziler <code>list</code>, <code>true/false/null</code> ise <code>True/False/None</code> olur. Hatırlaması kolay kural: sonu <strong>s</strong> ile bitenler (<code>dumps</code>, <code>loads</code>) <strong>string</strong> ile, bitmeyenler (<code>dump</code>, <code>load</code>) <strong>dosya</strong> ile çalışır.</p>`,
      en: `<p>When JSON text becomes Python, objects become <code>dict</code>, arrays <code>list</code>, and <code>true/false/null</code> become <code>True/False/None</code>. Easy rule: the ones ending in <strong>s</strong> (<code>dumps</code>, <code>loads</code>) work with <strong>strings</strong>, the others (<code>dump</code>, <code>load</code>) with <strong>files</strong>.</p>` },
    { t: "code", id: "c3",
      title: { tr: "dumps / loads ve Türkçe karakterler", en: "dumps / loads and Turkish characters" },
      code: String.raw`
import json

body = '{"id": 2, "username": "selcuk", "active": true, "email": null, "roles": ["user"]}'
user = json.loads(body)                  # str -> dict
print(type(user), user["active"], user["email"], user["roles"][0])

finding = {"title_tr": "Yansıtılmış XSS", "severity": "high"}
print(json.dumps(finding))                          # varsayılan: ı gibi kaçışlar
print(json.dumps(finding, ensure_ascii=False))      # Türkçe karakterler olduğu gibi
print(json.dumps(finding, ensure_ascii=False, indent=2, sort_keys=True))
` },
    { t: "code", id: "c4",
      title: { tr: "Dosyaya JSON yaz ve geri oku", en: "Write JSON to a file and read it back" },
      code: String.raw`
import json
from pathlib import Path

findings = [
    {"id": "SQLI-LOGIN", "title_tr": "Girişte SQL enjeksiyonu", "severity": "critical"},
    {"id": "HEADERS-CSP", "title_tr": "CSP başlığı eksik", "severity": "medium"},
]
path = Path("reports") / "findings.json"
path.parent.mkdir(parents=True, exist_ok=True)

with open(path, "w", encoding="utf-8") as f:
    json.dump(findings, f, ensure_ascii=False, indent=2)

with open(path, encoding="utf-8") as f:
    loaded = json.load(f)

print(loaded == findings, len(loaded))
print(path.read_text(encoding="utf-8"))
` },
    { t: "callout", kind: "sec",
      tr: `<p>Dosya yollarını kullanıcı girdisinden üretmek tehlikelidir: <code>Path("files") / "../secret.txt"</code> klasörün <strong>dışına</strong> çıkar. VulnShop'un <code>/download?file=</code> uç noktası tam olarak bu <strong>path traversal</strong> zafiyetini (simüle olarak) içeriyor. Güvenli kodda yol <code>resolve()</code> edilir ve izin verilen klasörün içinde mi diye kontrol edilir: <code>target.resolve().is_relative_to(base.resolve())</code>.</p>`,
      en: `<p>Building file paths from user input is dangerous: <code>Path("files") / "../secret.txt"</code> escapes <strong>outside</strong> the folder. VulnShop's <code>/download?file=</code> endpoint contains exactly this <strong>path traversal</strong> vulnerability (simulated). Safe code calls <code>resolve()</code> and checks the path is inside the allowed folder: <code>target.resolve().is_relative_to(base.resolve())</code>.</p>` },
    { t: "project", file: "secureqa/findings.py",
      tr: `<p><code>FindingsCollector.save_json</code>, test oturumu sonunda <code>reports/findings.json</code> dosyasını yazan metot. Bu dersteki her şeyi tek satırda kullanıyor: klasörü oluştur, <code>json.dumps</code> ile Türkçe dostu metin üret, UTF-8 olarak yaz.</p>`,
      en: `<p><code>FindingsCollector.save_json</code> is the method that writes <code>reports/findings.json</code> at the end of a test session. It uses everything from this lesson in one line: create the folder, produce Turkish-friendly text with <code>json.dumps</code>, write it as UTF-8.</p>`,
      code: String.raw`
def to_list(self) -> list[dict[str, Any]]:
    """All findings as plain dicts, most severe first."""
    ordered = sorted(self.findings, key=lambda f: SEVERITIES.index(f.severity))
    return [finding.to_dict() for finding in ordered]

def save_json(self, path: Path) -> None:
    """Write only the findings list to a JSON file (UTF-8, pretty printed)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(self.to_list(), ensure_ascii=False, indent=2), encoding="utf-8")
`,
      notes: [
        { line: 3, tr: "<code>sorted</code> + <code>key=lambda</code> (5. ders): critical önce, info en son.", en: "<code>sorted</code> + <code>key=lambda</code> (lesson 5): critical first, info last." },
        { line: 4, tr: "Her <code>Finding</code> nesnesi sözlüğe çevriliyor, çünkü <code>json</code> dataclass'ları doğrudan bilmez (14. ders).", en: "Each <code>Finding</code> becomes a dict because <code>json</code> doesn't know dataclasses directly (lesson 14)." },
        { line: 8, tr: "<code>reports/</code> klasörü yoksa oluşturulur; varsa hata vermez.", en: "Creates <code>reports/</code> if missing; no error if it exists." },
        { line: 9, tr: "<code>ensure_ascii=False</code>: “Yansıtılmış XSS” dosyada okunur halde kalır.", en: "<code>ensure_ascii=False</code>: “Yansıtılmış XSS” stays readable in the file." }
      ] }
  ],
  exercises: [
    { id: "09-e1",
      title: { tr: "findings.json kaydet", en: "Save findings.json" },
      prompt: {
        tr: `<p><code>findings</code> listesini <code>reports/findings.json</code> dosyasına <code>json.dump</code> ile yaz (<code>indent=2</code>, <code>ensure_ascii=False</code>, <code>encoding="utf-8"</code>). Sonra dosyayı tekrar okuyup <code>loaded</code> değişkenine ata ve <code>count = len(loaded)</code> hesapla.</p>`,
        en: `<p>Write the <code>findings</code> list to <code>reports/findings.json</code> with <code>json.dump</code> (<code>indent=2</code>, <code>ensure_ascii=False</code>, <code>encoding="utf-8"</code>). Then read the file back into <code>loaded</code> and compute <code>count = len(loaded)</code>.</p>`
      },
      starter: String.raw`
import json
from pathlib import Path

findings = [
    {"id": "XSS-REFLECTED", "title_tr": "Yansıtılmış XSS", "severity": "high"},
    {"id": "IDOR-ORDERS", "title_tr": "Başkasının siparişini görme (IDOR)", "severity": "high"},
    {"id": "SQLI-LOGIN", "title_tr": "Girişte SQL enjeksiyonu", "severity": "critical"},
]
path = Path("reports") / "findings.json"
path.parent.mkdir(parents=True, exist_ok=True)

# with open(...) as f:
#     json.dump(...)

loaded = []
count = 0
print(count)
`,
      solution: String.raw`
import json
from pathlib import Path

findings = [
    {"id": "XSS-REFLECTED", "title_tr": "Yansıtılmış XSS", "severity": "high"},
    {"id": "IDOR-ORDERS", "title_tr": "Başkasının siparişini görme (IDOR)", "severity": "high"},
    {"id": "SQLI-LOGIN", "title_tr": "Girişte SQL enjeksiyonu", "severity": "critical"},
]
path = Path("reports") / "findings.json"
path.parent.mkdir(parents=True, exist_ok=True)

with open(path, "w", encoding="utf-8") as f:
    json.dump(findings, f, ensure_ascii=False, indent=2)

with open(path, encoding="utf-8") as f:
    loaded = json.load(f)
count = len(loaded)
print(count)
`,
      check: String.raw`
import json as _json
from pathlib import Path as _P
_p = _P("reports") / "findings.json"
assert _p.exists(), _t("reports/findings.json dosyası bulunamadı. json.dump ile yaz.", "reports/findings.json was not found. Write it with json.dump.")
_text = _p.read_text(encoding="utf-8")
_data = _json.loads(_text)
assert _data == findings, _t("Dosyadaki veri findings listesiyle aynı olmalı. Önce dosyayı sil/üzerine yaz ('w').", "The file content must equal the findings list. Write it with mode 'w'.")
assert "Yansıtılmış XSS" in _text, _t("ensure_ascii=False kullan: Türkçe karakterler dosyada olduğu gibi görünmeli.", "Use ensure_ascii=False: Turkish characters must appear as-is in the file.")
assert "\n  {" in _text, _t("indent=2 ile okunaklı yaz.", "Write it readable with indent=2.")
assert loaded == findings and count == 3, _t("Dosyayı json.load ile geri oku ve count = len(loaded) yap.", "Read the file back with json.load and set count = len(loaded).")
_p.unlink()
`,
      hints: [
        { tr: "<code>with open(path, \"w\", encoding=\"utf-8\") as f: json.dump(findings, f, ensure_ascii=False, indent=2)</code>", en: "<code>with open(path, \"w\", encoding=\"utf-8\") as f: json.dump(findings, f, ensure_ascii=False, indent=2)</code>" },
        { tr: "Okumak için <code>with open(path, encoding=\"utf-8\") as f: loaded = json.load(f)</code>", en: "To read: <code>with open(path, encoding=\"utf-8\") as f: loaded = json.load(f)</code>" }
      ] },
    { id: "09-e2",
      title: { tr: "JSON yanıtını analiz et", en: "Analyse a JSON response" },
      prompt: {
        tr: `<p><code>response_text</code> bir API'den gelen JSON metni. <code>json.loads</code> ile çöz ve:</p><ul><li><code>critical_titles</code>: <code>severity</code> değeri <code>"critical"</code> olan bulguların <code>title_tr</code> değerleri (liste, orijinal sırayla)</li><li><code>by_owasp</code>: her <code>owasp</code> kodunun kaç kez geçtiğini sayan sözlük, ör. <code>{"A03:2021": 2, ...}</code></li></ul>`,
        en: `<p><code>response_text</code> is JSON text from an API. Parse it with <code>json.loads</code> and compute:</p><ul><li><code>critical_titles</code>: the <code>title_tr</code> of findings whose <code>severity</code> is <code>"critical"</code> (list, original order)</li><li><code>by_owasp</code>: a dict counting how often each <code>owasp</code> code occurs, e.g. <code>{"A03:2021": 2, ...}</code></li></ul>`
      },
      starter: String.raw`
import json

response_text = """
[
  {"id": "SQLI-LOGIN", "title_tr": "Girişte SQL enjeksiyonu", "severity": "critical", "owasp": "A03:2021"},
  {"id": "IDOR-API", "title_tr": "Kullanıcı API'sinde IDOR", "severity": "high", "owasp": "A01:2021"},
  {"id": "XSS-STORED", "title_tr": "Kalıcı XSS", "severity": "high", "owasp": "A03:2021"},
  {"id": "ADMIN-COOKIE", "title_tr": "Çerezle admin erişimi", "severity": "critical", "owasp": "A01:2021"},
  {"id": "HEADERS-CSP", "title_tr": "CSP başlığı eksik", "severity": "medium", "owasp": "A05:2021"}
]
"""

data = ...
critical_titles = []
by_owasp = {}

print(critical_titles, by_owasp)
`,
      solution: String.raw`
import json

response_text = """
[
  {"id": "SQLI-LOGIN", "title_tr": "Girişte SQL enjeksiyonu", "severity": "critical", "owasp": "A03:2021"},
  {"id": "IDOR-API", "title_tr": "Kullanıcı API'sinde IDOR", "severity": "high", "owasp": "A01:2021"},
  {"id": "XSS-STORED", "title_tr": "Kalıcı XSS", "severity": "high", "owasp": "A03:2021"},
  {"id": "ADMIN-COOKIE", "title_tr": "Çerezle admin erişimi", "severity": "critical", "owasp": "A01:2021"},
  {"id": "HEADERS-CSP", "title_tr": "CSP başlığı eksik", "severity": "medium", "owasp": "A05:2021"}
]
"""

data = json.loads(response_text)
critical_titles = [f["title_tr"] for f in data if f["severity"] == "critical"]
by_owasp = {}
for f in data:
    by_owasp[f["owasp"]] = by_owasp.get(f["owasp"], 0) + 1

print(critical_titles, by_owasp)
`,
      check: String.raw`
assert isinstance(data, list), _t("data = json.loads(response_text) olmalı (bir liste).", "data must be json.loads(response_text) (a list).")
assert critical_titles == ["Girişte SQL enjeksiyonu", "Çerezle admin erişimi"], _t(f"critical_titles yanlış: {critical_titles}", f"critical_titles is wrong: {critical_titles}")
assert by_owasp == {"A03:2021": 2, "A01:2021": 2, "A05:2021": 1}, _t(f"by_owasp yanlış: {by_owasp}", f"by_owasp is wrong: {by_owasp}")
`,
      hints: [
        { tr: "List comprehension: <code>[f[\"title_tr\"] for f in data if f[\"severity\"] == \"critical\"]</code>", en: "List comprehension: <code>[f[\"title_tr\"] for f in data if f[\"severity\"] == \"critical\"]</code>" },
        { tr: "Sayma kalıbı: <code>by_owasp[k] = by_owasp.get(k, 0) + 1</code>", en: "Counting pattern: <code>by_owasp[k] = by_owasp.get(k, 0) + 1</code>" }
      ] }
  ],
  quiz: [
    { q: { tr: "<code>json.loads</code> ne yapar?", en: "What does <code>json.loads</code> do?" },
      options: [{ tr: "Bir dosyadan JSON okur", en: "Reads JSON from a file" }, { tr: "JSON metnini (str) Python nesnesine çevirir", en: "Turns JSON text (str) into a Python object" }, { tr: "Python nesnesini JSON metnine çevirir", en: "Turns a Python object into JSON text" }],
      answer: 1, explain: { tr: "<code>loads</code> = load <strong>s</strong>tring. Dosya için <code>json.load(f)</code>.", en: "<code>loads</code> = load <strong>s</strong>tring. For files use <code>json.load(f)</code>." } },
    { q: { tr: "<code>open(\"log.txt\", \"a\")</code> modunun anlamı?", en: "Meaning of mode <code>open(\"log.txt\", \"a\")</code>?" },
      options: [{ tr: "Dosyayı silip yeniden yaz", en: "Delete and rewrite the file" }, { tr: "Sadece oku", en: "Read only" }, { tr: "Dosyanın sonuna ekle", en: "Append to the end of the file" }],
      answer: 2, explain: { tr: "<code>a</code> = append. <code>w</code> içeriği siler, <code>r</code> okur.", en: "<code>a</code> = append. <code>w</code> truncates, <code>r</code> reads." } },
    { q: { tr: "Türkçe karakterlerin JSON dosyasında <code>\\u0131</code> yerine “ı” olarak görünmesi için?", en: "To show Turkish characters as “ı” instead of <code>\\u0131</code> in a JSON file?" },
      options: [{ tr: "<code>ensure_ascii=False</code>", en: "<code>ensure_ascii=False</code>" }, { tr: "<code>indent=2</code>", en: "<code>indent=2</code>" }, { tr: "<code>sort_keys=True</code>", en: "<code>sort_keys=True</code>" }],
      answer: 0, explain: { tr: "Ve dosyayı <code>encoding=\"utf-8\"</code> ile yazmayı unutma.", en: "And don't forget to write the file with <code>encoding=\"utf-8\"</code>." } }
  ]
});
