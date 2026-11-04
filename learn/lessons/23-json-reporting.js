SQ.addLesson({
  id: "23-json-reporting",
  num: 23,
  icon: "{ }",
  minutes: 25,
  title: { tr: "JSON & dosyalar ileri: raporlama", en: "JSON & files advanced: reporting" },
  summary: {
    tr: "json.dumps/loads, ensure_ascii=False ile Türkçe, dosyaya yazma/okuma, özet sayımlar ve risk puanıyla bir rapor sözlüğü kurmak (findings.json şekli).",
    en: "json.dumps/loads, Turkish with ensure_ascii=False, reading/writing files, and building a report dict with summary counts and a risk score (the findings.json shape)."
  },
  goals: {
    tr: [
      "<code>json.dumps</code>/<code>loads</code> ile sözlük ↔ metin; <code>indent</code> ve <code>ensure_ascii=False</code>",
      "Dosyaya yazma/okuma: <code>json.dump</code>/<code>load</code> ve <code>encoding=\"utf-8\"</code>",
      "Özet sayımlar (severity'ye göre) ve 0-100 risk puanıyla bir rapor sözlüğü kurmak",
      "SecureQA'nın <code>reports/findings.json</code> şeklini üretmek"
    ],
    en: [
      "dict ↔ text with <code>json.dumps</code>/<code>loads</code>; <code>indent</code> and <code>ensure_ascii=False</code>",
      "Reading/writing files: <code>json.dump</code>/<code>load</code> and <code>encoding=\"utf-8\"</code>",
      "Building a report dict with summary counts (by severity) and a 0-100 risk score",
      "Producing SecureQA's <code>reports/findings.json</code> shape"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>9. derste JSON'un temelini gördük. Bir güvenlik test paketinin son ürünü bir <strong>rapor</strong>dur: makine için <code>findings.json</code>, insan için HTML panosu. SecureQA bulguları (<code>Finding</code>) ve kontrolleri (<code>Check</code>) <code>asdict</code> ile sözlüğe, sonra <code>json.dumps</code> ile metne çevirir. Bu derste tam o şekli — özet sayımlar, risk puanı ve sıralı bulgu listesi — kendimiz kuruyoruz.</p>`,
      en: `<p>In lesson 9 we saw the basics of JSON. The final product of a security test suite is a <strong>report</strong>: <code>findings.json</code> for machines, an HTML dashboard for humans. SecureQA turns findings (<code>Finding</code>) and checks (<code>Check</code>) into dicts with <code>asdict</code>, then into text with <code>json.dumps</code>. In this lesson we build exactly that shape ourselves — summary counts, a risk score and a sorted list of findings.</p>` },
    { t: "h", tr: "json.dumps/loads ve Türkçe", en: "json.dumps/loads and Turkish" },
    { t: "text",
      tr: `<p><code>json.dumps(obj)</code> bir sözlüğü metne, <code>json.loads(text)</code> metni geri sözlüğe çevirir. İki önemli argüman: <code>indent=2</code> okunaklı yapar; <code>ensure_ascii=False</code> ise Türkçe karakterleri <code>\\u00e7</code> gibi kaçış dizilerine çevirmeden olduğu gibi bırakır — SecureQA raporları bu yüzden onu kullanır.</p>`,
      en: `<p><code>json.dumps(obj)</code> turns a dict into text, <code>json.loads(text)</code> turns text back into a dict. Two important arguments: <code>indent=2</code> makes it readable; <code>ensure_ascii=False</code> keeps Turkish characters as-is instead of escaping them to things like <code>\\u00e7</code> — which is why SecureQA's reports use it.</p>` },
    { t: "code", id: "c1",
      title: { tr: "Sözlük ↔ metin, gidiş-dönüş", en: "dict ↔ text, round-trip" },
      code: String.raw`
import json

finding = {
    "id": "JS-loginAdminChallenge",
    "title_tr": "SQL Enjeksiyonu ile Yönetici Girişi (Juice Shop)",
    "severity": "critical",
    "owasp": "A03:2021-Injection",
    "cwe": "CWE-89",
}

text = json.dumps(finding, ensure_ascii=False, indent=2)
print(text)

back = json.loads(text)                       # metin -> sözlük
print("gidiş-dönüş eşit mi / round-trip equal?", back == finding)
print("Türkçe korundu mu / Turkish kept?", "Enjeksiyonu" in text and "\\u" not in text)
` },
    { t: "h", tr: "Rapor sözlüğü kurmak", en: "Building a report dict" },
    { t: "text",
      tr: `<p>Ham bir bulgu listesi tek başına yeterli değil; bir rapor <strong>özet</strong> ister: kaç bulgu, severity dağılımı ve tek bakışta bir risk puanı. Aşağıdaki <code>build_report</code> bunu üretir ve bulguları en tehlikeliden en aza sıralar (<code>SEVERITIES.index</code> anahtarıyla).</p>`,
      en: `<p>A raw list of findings is not enough on its own; a report wants a <strong>summary</strong>: how many findings, the severity breakdown and a risk score at a glance. The <code>build_report</code> below produces this and sorts findings most-to-least severe (with a <code>SEVERITIES.index</code> key).</p>` },
    { t: "code", id: "c2",
      title: { tr: "Özet + risk puanı", en: "Summary + risk score" },
      code: String.raw`
import json

SEVERITIES = ("critical", "high", "medium", "low", "info")
SEVERITY_WEIGHTS = {"critical": 10, "high": 7, "medium": 4, "low": 2, "info": 0}


def count_by_severity(findings):
    counts = {s: 0 for s in SEVERITIES}         # sıfırlar dahil
    for f in findings:
        counts[f["severity"]] += 1
    return counts


def risk_score(findings):
    return min(100, sum(SEVERITY_WEIGHTS[f["severity"]] for f in findings))


def build_report(findings):
    ordered = sorted(findings, key=lambda f: SEVERITIES.index(f["severity"]))
    return {
        "total": len(findings),
        "by_severity": count_by_severity(findings),
        "risk_score": risk_score(findings),
        "findings": ordered,
    }


demo = [
    {"id": "CSP", "severity": "medium"},
    {"id": "SQLI", "severity": "critical"},
    {"id": "XSS", "severity": "high"},
]
print(json.dumps(build_report(demo), ensure_ascii=False, indent=2))
` },
    { t: "h", tr: "Dosyaya yazmak ve okumak", en: "Writing to and reading from a file" },
    { t: "code", id: "c3",
      title: { tr: "json.dump / json.load", en: "json.dump / json.load" },
      code: String.raw`
import json
import os
import tempfile

report = {"total": 1, "risk_score": 10, "findings": [{"id": "SQLI", "severity": "critical"}]}

path = os.path.join(tempfile.gettempdir(), "findings.json")
with open(path, "w", encoding="utf-8") as fh:          # yaz / write
    json.dump(report, fh, ensure_ascii=False, indent=2)

with open(path, "r", encoding="utf-8") as fh:          # oku / read
    loaded = json.load(fh)

print("dosya:", path)
print("gidiş-dönüş eşit mi / round-trip equal?", loaded == report)
print("risk:", loaded["risk_score"])
` },
    { t: "project", file: "secureqa/findings.py (FindingsCollector)",
      tr: `<p>Gerçek kod: <code>FindingsCollector.to_list()</code> her <code>Finding</code>'i <code>to_dict()</code> (yani <code>asdict</code>) ile sözlüğe çevirir ve <strong>en tehlikeliden en aza</strong> sıralar — <code>reports/findings.json</code>'un içindeki liste tam budur. <code>save_json()</code> ise onu <code>ensure_ascii=False, indent=2</code> ve <code>utf-8</code> ile diske yazar (Türkçe başlıklar bozulmadan). <code>count_by_severity()</code> ve <code>risk_score()</code> raporun özet kartlarını besler.</p>`,
      en: `<p>Real code: <code>FindingsCollector.to_list()</code> turns each <code>Finding</code> into a dict with <code>to_dict()</code> (i.e. <code>asdict</code>) and sorts them <strong>most-to-least severe</strong> — that list is exactly what is inside <code>reports/findings.json</code>. <code>save_json()</code> writes it to disk with <code>ensure_ascii=False, indent=2</code> and <code>utf-8</code> (Turkish titles intact). <code>count_by_severity()</code> and <code>risk_score()</code> feed the report's summary cards.</p>`,
      code: String.raw`
class FindingsCollector:
    def to_list(self) -> list[dict[str, Any]]:
        """All findings as plain dicts, most severe first."""
        ordered = sorted(self.findings, key=lambda f: SEVERITIES.index(f.severity))
        return [finding.to_dict() for finding in ordered]

    def save_json(self, path: Path) -> None:
        """Write only the findings list to a JSON file (UTF-8, pretty printed)."""
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.to_list(), ensure_ascii=False, indent=2), encoding="utf-8")

    def count_by_severity(self) -> dict[str, int]:
        """Return {"critical": 2, "high": 5, ...} including zeros."""
        counts = {severity: 0 for severity in SEVERITIES}
        for finding in self.findings:
            counts[finding.severity] += 1
        return counts


# A single entry inside reports/findings.json looks like:
# {
#   "id": "JS-loginAdminChallenge",
#   "title_tr": "...", "title_en": "...",
#   "severity": "critical", "owasp": "A03:2021-Injection", "cwe": "CWE-89",
#   "url": "...", "evidence": "...", "found_at": "2026-01-01T00:00:00+00:00"
# }
`,
      notes: [
        { line: 4, tr: "<code>SEVERITIES.index(f.severity)</code>: critical=0 olduğu için en tehlikeli en başa gelir.", en: "<code>SEVERITIES.index(f.severity)</code>: critical=0, so the most dangerous sorts first." },
        { line: 5, tr: "<code>to_dict()</code> = <code>asdict(finding)</code> (14. ders): dataclass → JSON'a hazır sözlük.", en: "<code>to_dict()</code> = <code>asdict(finding)</code> (lesson 14): dataclass → JSON-ready dict." },
        { line: 10, tr: "<code>ensure_ascii=False</code> + <code>encoding=\"utf-8\"</code>: Türkçe başlıklar kaçışsız yazılır.", en: "<code>ensure_ascii=False</code> + <code>encoding=\"utf-8\"</code>: Turkish titles are written without escaping." },
        { line: 15, tr: "Sıfır dahil sayım: rapordaki \"0 critical\" kartı da doğru görünür.", en: "Counts include zeros: the \"0 critical\" card in the report also renders correctly." }
      ] }
  ],
  exercises: [
    { id: "23-e1",
      title: { tr: "Rapor sözlüğü kur", en: "Build a report dict" },
      setup: String.raw`
SEVERITIES = ("critical", "high", "medium", "low", "info")
SEVERITY_WEIGHTS = {"critical": 10, "high": 7, "medium": 4, "low": 2, "info": 0}
`,
      prompt: {
        tr: `<p><code>build_report(findings) -&gt; dict</code> yaz. <code>findings</code> bir sözlük listesidir (her biri en az <code>"severity"</code> içerir). Dönen sözlük şu anahtarları içermeli:</p><ul><li><code>"total"</code>: bulgu sayısı</li><li><code>"by_severity"</code>: her severity için sayım, <strong>sıfırlar dahil</strong> (<code>{"critical": 0, "high": 0, ...}</code>)</li><li><code>"risk_score"</code>: ağırlık toplamı, en fazla <code>100</code></li><li><code>"findings"</code>: <strong>en tehlikeliden en aza</strong> sıralı liste (<code>SEVERITIES.index</code>)</li></ul>`,
        en: `<p>Write <code>build_report(findings) -&gt; dict</code>. <code>findings</code> is a list of dicts (each has at least <code>"severity"</code>). The returned dict must contain:</p><ul><li><code>"total"</code>: number of findings</li><li><code>"by_severity"</code>: a count per severity, <strong>zeros included</strong> (<code>{"critical": 0, "high": 0, ...}</code>)</li><li><code>"risk_score"</code>: sum of weights, capped at <code>100</code></li><li><code>"findings"</code>: list sorted <strong>most-to-least severe</strong> (<code>SEVERITIES.index</code>)</li></ul>`
      },
      starter: String.raw`
def build_report(findings):
    ...


demo = [{"id": "CSP", "severity": "medium"}, {"id": "SQLI", "severity": "critical"}, {"id": "XSS", "severity": "high"}]
print(build_report(demo))
`,
      solution: String.raw`
def build_report(findings):
    counts = {s: 0 for s in SEVERITIES}
    for f in findings:
        counts[f["severity"]] += 1
    risk = min(100, sum(SEVERITY_WEIGHTS[f["severity"]] for f in findings))
    ordered = sorted(findings, key=lambda f: SEVERITIES.index(f["severity"]))
    return {"total": len(findings), "by_severity": counts, "risk_score": risk, "findings": ordered}


demo = [{"id": "CSP", "severity": "medium"}, {"id": "SQLI", "severity": "critical"}, {"id": "XSS", "severity": "high"}]
print(build_report(demo))
`,
      check: String.raw`
_demo = [{"id": "CSP", "severity": "medium"}, {"id": "SQLI", "severity": "critical"}, {"id": "XSS", "severity": "high"}]
_r = build_report(_demo)
assert _r["total"] == 3, _t(f"total 3 olmalı; gelen {_r.get('total')}.", f"total must be 3; got {_r.get('total')}.")
assert _r["by_severity"] == {"critical": 1, "high": 1, "medium": 1, "low": 0, "info": 0}, _t(f"by_severity sıfırlar dahil tüm severity'leri içermeli; gelen {_r.get('by_severity')}.", f"by_severity must include all severities with zeros; got {_r.get('by_severity')}.")
assert _r["risk_score"] == 21, _t(f"risk_score 10+7+4=21 olmalı; gelen {_r.get('risk_score')}.", f"risk_score must be 10+7+4=21; got {_r.get('risk_score')}.")
assert [f["id"] for f in _r["findings"]] == ["SQLI", "XSS", "CSP"], _t(f"findings critical→high→medium sıralı olmalı; gelen {[f.get('id') for f in _r['findings']]}.", f"findings must be sorted critical→high→medium; got {[f.get('id') for f in _r['findings']]}.")
assert build_report([])["risk_score"] == 0 and build_report([])["total"] == 0, _t("Boş listede total ve risk_score 0 olmalı.", "On an empty list total and risk_score must be 0.")
assert build_report([{"id": str(i), "severity": "critical"} for i in range(15)])["risk_score"] == 100, _t("risk_score 100 ile sınırlanmalı.", "risk_score must be capped at 100.")
`,
      hints: [
        { tr: "Sayımı sıfırlarla başlat: <code>counts = {s: 0 for s in SEVERITIES}</code>, sonra döngüyle artır.", en: "Start counts with zeros: <code>counts = {s: 0 for s in SEVERITIES}</code>, then increment in a loop." },
        { tr: "Sıralama: <code>sorted(findings, key=lambda f: SEVERITIES.index(f[\"severity\"]))</code>; risk: <code>min(100, sum(...))</code>.", en: "Sort: <code>sorted(findings, key=lambda f: SEVERITIES.index(f[\"severity\"]))</code>; risk: <code>min(100, sum(...))</code>." }
      ] },
    { id: "23-e2",
      title: { tr: "JSON dosyasına yaz ve geri oku", en: "Write a JSON file and read it back" },
      prompt: {
        tr: `<p>İki fonksiyon yaz:</p><ul><li><code>save_findings(findings, path)</code>: <code>findings</code>'i <code>path</code>'e JSON olarak yazar. <code>encoding="utf-8"</code>, <code>ensure_ascii=False</code> ve <code>indent=2</code> kullan (Türkçe karakterler bozulmasın).</li><li><code>load_findings(path) -&gt; list</code>: dosyayı <code>utf-8</code> ile açıp <code>json.load</code> ile geri okur.</li></ul><p>Gidiş-dönüş aynı veriyi vermeli ve Türkçe karakterler dosyada kaçışsız durmalı.</p>`,
        en: `<p>Write two functions:</p><ul><li><code>save_findings(findings, path)</code>: write <code>findings</code> to <code>path</code> as JSON. Use <code>encoding="utf-8"</code>, <code>ensure_ascii=False</code> and <code>indent=2</code> (Turkish characters must stay intact).</li><li><code>load_findings(path) -&gt; list</code>: open the file as <code>utf-8</code> and read it back with <code>json.load</code>.</li></ul><p>The round-trip must give back the same data and Turkish characters must be stored unescaped.</p>`
      },
      starter: String.raw`
import json
import os
import tempfile


def save_findings(findings, path):
    ...


def load_findings(path):
    ...


_p = os.path.join(tempfile.gettempdir(), "demo_findings.json")
data = [{"id": "SQLI", "title_tr": "Enjeksiyon", "severity": "critical"}]
save_findings(data, _p)
print(load_findings(_p))
`,
      solution: String.raw`
import json
import os
import tempfile


def save_findings(findings, path):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(findings, fh, ensure_ascii=False, indent=2)


def load_findings(path):
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


_p = os.path.join(tempfile.gettempdir(), "demo_findings.json")
data = [{"id": "SQLI", "title_tr": "Enjeksiyon", "severity": "critical"}]
save_findings(data, _p)
print(load_findings(_p))
`,
      check: String.raw`
import json as _json, os as _os, tempfile as _tf
_path = _os.path.join(_tf.gettempdir(), "check_findings.json")
_data = [{"id": "SQLI", "title_tr": "SQL Enjeksiyonu", "severity": "critical"}, {"id": "XSS", "title_tr": "Yansıtılmış XSS", "severity": "high"}]
save_findings(_data, _path)
assert _os.path.exists(_path), _t("save_findings dosyayı yazmalı.", "save_findings must write the file.")
_raw = open(_path, "r", encoding="utf-8").read()
assert "Enjeksiyonu" in _raw and "\\u" not in _raw, _t("ensure_ascii=False kullan: Türkçe karakterler kaçışsız yazılmalı.", "Use ensure_ascii=False: Turkish characters must be written unescaped.")
_loaded = load_findings(_path)
assert _loaded == _data, _t(f"Gidiş-dönüş aynı veriyi vermeli; gelen {_loaded!r}.", f"The round-trip must give back the same data; got {_loaded!r}.")
`,
      hints: [
        { tr: "Yazma: <code>with open(path, \"w\", encoding=\"utf-8\") as fh: json.dump(findings, fh, ensure_ascii=False, indent=2)</code>.", en: "Write: <code>with open(path, \"w\", encoding=\"utf-8\") as fh: json.dump(findings, fh, ensure_ascii=False, indent=2)</code>." },
        { tr: "Okuma: <code>with open(path, \"r\", encoding=\"utf-8\") as fh: return json.load(fh)</code>.", en: "Read: <code>with open(path, \"r\", encoding=\"utf-8\") as fh: return json.load(fh)</code>." }
      ] }
  ],
  quiz: [
    { q: { tr: "Türkçe karakterlerin JSON'da <code>\\u00e7</code> gibi kaçışlanmaması için hangi argüman gerekir?", en: "Which argument keeps Turkish characters from being escaped to <code>\\u00e7</code> in JSON?" },
      options: [{ tr: "<code>indent=2</code>", en: "<code>indent=2</code>" }, { tr: "<code>ensure_ascii=False</code>", en: "<code>ensure_ascii=False</code>" }, { tr: "<code>sort_keys=True</code>", en: "<code>sort_keys=True</code>" }],
      answer: 1, explain: { tr: "<code>ensure_ascii=False</code> + <code>encoding=\"utf-8\"</code> ile Türkçe olduğu gibi yazılır.", en: "With <code>ensure_ascii=False</code> + <code>encoding=\"utf-8\"</code> Turkish is written as-is." } },
    { q: { tr: "<code>json.dump</code> ile <code>json.dumps</code> arasındaki fark?", en: "Difference between <code>json.dump</code> and <code>json.dumps</code>?" },
      options: [{ tr: "<code>dump</code> bir dosyaya yazar; <code>dumps</code> bir metin (string) döndürür", en: "<code>dump</code> writes to a file; <code>dumps</code> returns a string" }, { tr: "Aynı şeydir", en: "They are the same" }, { tr: "<code>dumps</code> sadece listeler için", en: "<code>dumps</code> is only for lists" }],
      answer: 0, explain: { tr: "<code>dump(obj, fh)</code> dosyaya, <code>dumps(obj)</code> belleğe (str) yazar; okumada <code>load</code>/<code>loads</code>.", en: "<code>dump(obj, fh)</code> to a file, <code>dumps(obj)</code> to memory (str); for reading <code>load</code>/<code>loads</code>." } },
    { q: { tr: "SecureQA'nın <code>findings.json</code>'undaki bulgular hangi sırayla yazılır?", en: "In what order are findings written in SecureQA's <code>findings.json</code>?" },
      options: [{ tr: "Bulunma zamanına göre", en: "By time found" }, { tr: "En tehlikeliden en aza (critical → info)", en: "Most to least severe (critical → info)" }, { tr: "Alfabetik", en: "Alphabetical" }],
      answer: 1, explain: { tr: "<code>sorted(..., key=lambda f: SEVERITIES.index(f.severity))</code> critical'ı (indeks 0) başa alır.", en: "<code>sorted(..., key=lambda f: SEVERITIES.index(f.severity))</code> puts critical (index 0) first." } }
  ]
});
