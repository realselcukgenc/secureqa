SQ.addLesson({
  id: "14-dataclasses",
  num: 14,
  icon: "@dc",
  minutes: 25,
  title: { tr: "Dataclass'lar: Finding", en: "Dataclasses: Finding" },
  summary: {
    tr: "@dataclass ile boilerplate'siz veri sınıfları: varsayılanlar, field(default_factory), __post_init__, asdict, frozen — ve SecureQA'nın Finding'i.",
    en: "Boilerplate-free data classes with @dataclass: defaults, field(default_factory), __post_init__, asdict, frozen — and SecureQA's Finding."
  },
  goals: {
    tr: [
      "<code>@dataclass</code> neleri otomatik yazar: <code>__init__</code>, <code>__repr__</code>, <code>__eq__</code>",
      "Varsayılan değerler ve <code>field(default_factory=...)</code>",
      "<code>__post_init__</code> ile doğrulama, <code>@property</code> ile türetilmiş alanlar",
      "<code>asdict</code> ile JSON'a hazır sözlük, <code>frozen=True</code> ile değişmez şablonlar"
    ],
    en: [
      "What <code>@dataclass</code> writes for you: <code>__init__</code>, <code>__repr__</code>, <code>__eq__</code>",
      "Default values and <code>field(default_factory=...)</code>",
      "Validation with <code>__post_init__</code>, derived fields with <code>@property</code>",
      "JSON-ready dicts with <code>asdict</code>, immutable templates with <code>frozen=True</code>"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>6. derste <code>__init__</code> içinde her alanı tek tek <code>self.x = x</code> diye yazdık. Sadece <strong>veri taşıyan</strong> sınıflar (bir bulgu, bir test kullanıcısı, bir ayar seti) için bu tekrar sıkıcıdır. <code>@dataclass</code> decorator'ı (10. ders!) sınıftaki tipli alanlara bakar ve <code>__init__</code>, okunaklı bir <code>__repr__</code> ve alan alan karşılaştıran <code>__eq__</code> metotlarını senin yerine üretir.</p>`,
      en: `<p>In lesson 6 we wrote every field in <code>__init__</code> by hand as <code>self.x = x</code>. For classes that <strong>just carry data</strong> (a finding, a test user, a settings bundle) that repetition is tedious. The <code>@dataclass</code> decorator (lesson 10!) looks at the typed fields in the class and generates <code>__init__</code>, a readable <code>__repr__</code> and a field-by-field <code>__eq__</code> for you.</p>` },
    { t: "compare",
      items: [
        { kind: "bad", title: { tr: "Elle yazılmış sınıf", en: "Hand-written class" },
          code: String.raw`
class User:
    def __init__(self, username, role="user"):
        self.username = username
        self.role = role

    def __repr__(self):
        return f"User(username={self.username!r}, role={self.role!r})"

    def __eq__(self, other):
        return (self.username, self.role) == (other.username, other.role)
` },
        { kind: "good", title: { tr: "Dataclass", en: "Dataclass" },
          code: String.raw`
from dataclasses import dataclass


@dataclass
class User:
    username: str
    role: str = "user"
` }
      ] },
    { t: "code", id: "c1",
      title: { tr: "İlk dataclass'ın", en: "Your first dataclass" },
      code: String.raw`
from dataclasses import dataclass


@dataclass
class User:
    id: int
    username: str
    password: str
    role: str = "user"          # varsayılanlı alanlar sonra gelir / defaults come last


selcuk = User(2, "selcuk", "Selcuk!2026")
admin = User(id=1, username="admin", password="admin123", role="admin")

print(selcuk)                                  # otomatik __repr__
print(admin.role, selcuk.role)
print(selcuk == User(2, "selcuk", "Selcuk!2026"))   # otomatik __eq__ -> True
selcuk.role = "admin"                          # normal dataclass değiştirilebilir
print(selcuk)
` },
    { t: "callout", kind: "warn",
      tr: `<p>Varsayılan değeri olmayan bir alan, varsayılanı olan bir alandan <strong>sonra</strong> gelemez (<code>TypeError: non-default argument follows default argument</code>). Liste/sözlük gibi değiştirilebilir varsayılanlar için <code>tags: list[str] = []</code> yazamazsın; <code>field(default_factory=list)</code> kullanılır — 5. dersteki “paylaşılan liste” tuzağının çözümü.</p>`,
      en: `<p>A field without a default cannot come <strong>after</strong> a field with one (<code>TypeError: non-default argument follows default argument</code>). For mutable defaults like lists/dicts you can't write <code>tags: list[str] = []</code>; use <code>field(default_factory=list)</code> — the fix for lesson 5's “shared list” trap.</p>` },
    { t: "code", id: "c2",
      title: { tr: "default_factory, __post_init__, asdict", en: "default_factory, __post_init__, asdict" },
      code: String.raw`
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone

SEVERITIES = ("critical", "high", "medium", "low", "info")


@dataclass
class Finding:
    id: str
    title: str
    severity: str
    tags: list[str] = field(default_factory=list)
    found_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds"))

    def __post_init__(self) -> None:          # __init__'ten hemen sonra çalışır
        self.severity = self.severity.lower()
        if self.severity not in SEVERITIES:
            raise ValueError(f"Unknown severity {self.severity!r}")

    @property
    def is_blocker(self) -> bool:             # türetilmiş alan / derived field
        return self.severity in ("critical", "high")


f = Finding("XSS-REFLECTED", "Reflected XSS", "HIGH", tags=["owasp_a03"])
print(f.severity, f.is_blocker, f.tags)
print(json.dumps(asdict(f), indent=2))

try:
    Finding("X", "Bad", "urgent")
except ValueError as e:
    print("Reddedildi / rejected:", e)
` },
    { t: "code", id: "c3",
      title: { tr: "frozen=True ve replace()", en: "frozen=True and replace()" },
      code: String.raw`
from dataclasses import FrozenInstanceError, dataclass, replace


@dataclass(frozen=True)
class ChallengeInfo:
    key: str
    severity: str
    owasp: str


LOGIN_ADMIN = ChallengeInfo("loginAdminChallenge", "critical", "A03:2021-Injection")
try:
    LOGIN_ADMIN.severity = "low"             # değişmez! / immutable!
except FrozenInstanceError as e:
    print("Değiştirilemez:", e)

relaxed = replace(LOGIN_ADMIN, severity="high")   # değiştirilmiş KOPYA / a modified COPY
print(LOGIN_ADMIN)
print(relaxed)
print(hash(LOGIN_ADMIN) != hash(relaxed), {LOGIN_ADMIN, relaxed})   # frozen -> set/dict anahtarı olabilir
` },
    { t: "project", file: "secureqa/findings.py + juiceshop.py",
      tr: `<p>SecureQA'nın kalbi bu iki dataclass. <code>Finding</code> doğrulanmış tek bir güvenlik açığıdır. <code>ChallengeInfo</code> (frozen) ise her Juice Shop challenge'ının değişmez şablonu: başlık, önem, OWASP, CWE, çözüm metni bir kez yazılır. Juice Shop testi challenge'ın çözüldüğünü doğruladığında <code>CHALLENGES[key].finding(base_url, evidence)</code> çağırır ve somut bir <code>Finding</code> üretir. SecureShop tarafında aynı rolü <code>secureqa/checks.py</code> içindeki <code>Check</code> dataclass'ı (<code>passed: bool</code> alanıyla) oynar. Rapor üreteci ikisini de <code>asdict</code> ile JSON'a çevirir.</p>`,
      en: `<p>These two dataclasses are SecureQA's heart. A <code>Finding</code> is one confirmed security problem. <code>ChallengeInfo</code> (frozen) is the immutable template of each Juice Shop challenge: title, severity, OWASP, CWE and remediation are written once. When a Juice Shop test confirms the challenge is solved it calls <code>CHALLENGES[key].finding(base_url, evidence)</code> to create a concrete <code>Finding</code>. On the SecureShop side the <code>Check</code> dataclass in <code>secureqa/checks.py</code> (with a <code>passed: bool</code> field) plays the same role. The report generator turns both into JSON with <code>asdict</code>.</p>`,
      code: String.raw`
@dataclass
class Finding:
    """One security finding (TR: tek bir güvenlik bulgusu)."""

    id: str
    title_tr: str
    title_en: str
    severity: str
    owasp: str
    cwe: str
    url: str
    evidence: str
    remediation_tr: str
    remediation_en: str
    description_tr: str = ""
    description_en: str = ""
    test_id: str = ""
    found_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds"))

    def __post_init__(self) -> None:
        self.severity = self.severity.lower()
        if self.severity not in SEVERITIES:
            raise ValueError(f"Unknown severity {self.severity!r}; use one of {SEVERITIES}")

    @property
    def owasp_code(self) -> str:
        """Only the code part of the OWASP category: "A03:2021-Injection" -> "A03:2021"."""
        return self.owasp.split("-")[0]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Finding":
        known = {name for name in cls.__dataclass_fields__}
        return cls(**{key: value for key, value in data.items() if key in known})


# secureqa/juiceshop.py
@dataclass(frozen=True)
class ChallengeInfo:
    """How one Juice Shop challenge maps to an OWASP/CWE finding (TR: challenge -> bulgu)."""

    key: str                 # stable Juice Shop challenge key, e.g. "loginAdminChallenge"
    name: str                # human name shown on the score board
    # ... title_tr, title_en, severity, owasp, cwe, remediation_tr, remediation_en

    def finding(self, base_url: str, evidence: str, test_id: str = "") -> Finding:
        """Build a Finding for this solved challenge."""
        return Finding(
            id=f"JS-{self.key}",
            # ... title_tr=self.title_tr, severity=self.severity, owasp=self.owasp, ...
            url=f"{base_url}/#/score-board",
            evidence=evidence,
        )
`,
      notes: [
        { line: 5, tr: "Zorunlu alanlar önce: spec'teki sözleşme (id, başlıklar, severity, owasp, cwe, url, evidence, çözümler).", en: "Required fields first: the spec's contract (id, titles, severity, owasp, cwe, url, evidence, remediations)." },
        { line: 15, tr: "İsteğe bağlı alanlar varsayılanlı ve en sonda.", en: "Optional fields have defaults and come last." },
        { line: 18, tr: "Zaman damgası her nesne için o an üretilir (<code>default_factory</code>).", en: "The timestamp is produced at creation time for each object (<code>default_factory</code>)." },
        { line: 22, tr: "Doğrulama: yanlış önem derecesi rapora hiç giremez.", en: "Validation: a wrong severity never reaches the report." },
        { line: 25, tr: "Türetilmiş alan: rapordaki OWASP filtresi bunu kullanır.", en: "Derived field: the report's OWASP filter uses this." },
        { line: 33, tr: "<code>@classmethod</code>: sözlükten (findings.json) nesneyi geri kurar; bilinmeyen anahtarları atlar. <code>**</code> sözlüğü keyword argümanlara açar.", en: "<code>@classmethod</code>: rebuilds the object from a dict (findings.json), skipping unknown keys. <code>**</code> unpacks the dict into keyword arguments." },
        { line: 40, tr: "<code>frozen=True</code>: challenge şablonları test sırasında yanlışlıkla değiştirilemez.", en: "<code>frozen=True</code>: challenge templates can't be changed by accident during a test run." },
        { line: 48, tr: "Şablondan somut bulguya: sabit bilgiler şablondan, URL ve kanıt testten gelir.", en: "From template to concrete finding: the fixed info comes from the template, the URL and evidence from the test." }
      ] }
  ],
  exercises: [
    { id: "14-e1",
      title: { tr: "Kendi Finding dataclass'ın", en: "Your own Finding dataclass" },
      prompt: {
        tr: `<p><code>Finding</code> adında bir <code>@dataclass</code> yaz. Alanlar: <code>id: str</code>, <code>title: str</code>, <code>severity: str</code>, <code>url: str</code>, <code>evidence: str = ""</code>. <code>__post_init__</code> içinde severity'yi küçük harfe çevir ve <code>SEVERITIES</code> içinde değilse <code>ValueError</code> fırlat.</p>`,
        en: `<p>Write a <code>@dataclass</code> called <code>Finding</code>. Fields: <code>id: str</code>, <code>title: str</code>, <code>severity: str</code>, <code>url: str</code>, <code>evidence: str = ""</code>. In <code>__post_init__</code>, lower-case the severity and raise <code>ValueError</code> if it's not in <code>SEVERITIES</code>.</p>`
      },
      starter: String.raw`
from dataclasses import dataclass

SEVERITIES = ("critical", "high", "medium", "low", "info")


class Finding:
    pass


f = Finding("SQLI-LOGIN", "SQLi in login", "Critical", "http://127.0.0.1:5000/login")
print(f)
`,
      solution: String.raw`
from dataclasses import dataclass

SEVERITIES = ("critical", "high", "medium", "low", "info")


@dataclass
class Finding:
    id: str
    title: str
    severity: str
    url: str
    evidence: str = ""

    def __post_init__(self) -> None:
        self.severity = self.severity.lower()
        if self.severity not in SEVERITIES:
            raise ValueError(f"Unknown severity {self.severity!r}")


f = Finding("SQLI-LOGIN", "SQLi in login", "Critical", "http://127.0.0.1:5000/login")
print(f)
`,
      check: String.raw`
import dataclasses as _dc
assert _dc.is_dataclass(Finding), _t("Finding sınıfının üstüne @dataclass ekle.", "Add @dataclass above the Finding class.")
_names = [x.name for x in _dc.fields(Finding)]
assert _names == ["id", "title", "severity", "url", "evidence"], _t(f"Alanlar sırasıyla id, title, severity, url, evidence olmalı; şu an {_names}.", f"Fields must be id, title, severity, url, evidence in order; got {_names}.")
_f = Finding("A", "B", "HIGH", "http://x")
assert _f.severity == "high", _t("__post_init__ severity'yi küçük harfe çevirmeli.", "__post_init__ must lower-case the severity.")
assert _f.evidence == "", _t("evidence varsayılanı \"\" olmalı.", "evidence must default to \"\".")
try:
    Finding("A", "B", "urgent", "http://x")
    raise AssertionError(_t("Geçersiz severity için ValueError fırlatılmalı.", "An invalid severity must raise ValueError."))
except ValueError:
    pass
assert Finding("A", "B", "low", "u") == Finding("A", "B", "LOW", "u"), _t("Dataclass eşitliği alanlara göre çalışmalı.", "Dataclass equality must compare fields.")
`,
      hints: [
        { tr: "<code>@dataclass</code> satırını sınıfın üstüne yaz; alanları <code>id: str</code> gibi tip ipucuyla tanımla.", en: "Put <code>@dataclass</code> above the class; declare fields with type hints like <code>id: str</code>." },
        { tr: "<code>def __post_init__(self):</code> içinde <code>self.severity = self.severity.lower()</code> ve <code>if ... not in SEVERITIES: raise ValueError(...)</code>.", en: "In <code>def __post_init__(self):</code> do <code>self.severity = self.severity.lower()</code> and <code>if ... not in SEVERITIES: raise ValueError(...)</code>." }
      ] },
    { id: "14-e2",
      title: { tr: "Risk puanı ve JSON", en: "Risk score and JSON" },
      setup: String.raw`
from dataclasses import dataclass, asdict

SEVERITIES = ("critical", "high", "medium", "low", "info")
SEVERITY_WEIGHTS = {"critical": 10, "high": 7, "medium": 4, "low": 2, "info": 0}


@dataclass
class Finding:
    id: str
    severity: str
    owasp: str
`,
      prompt: {
        tr: `<p><code>Finding</code> dataclass'ı ve <code>SEVERITY_WEIGHTS</code> hazır. İki fonksiyon yaz:</p><ul><li><code>risk_score(findings) -&gt; int</code>: ağırlıkların toplamı, en fazla <code>100</code></li><li><code>to_json_ready(findings) -&gt; list[dict]</code>: her bulgu <code>asdict</code> ile sözlüğe çevrilmiş, <strong>en önemliden en aza</strong> sıralı (<code>SEVERITIES.index(...)</code> ile)</li></ul>`,
        en: `<p>The <code>Finding</code> dataclass and <code>SEVERITY_WEIGHTS</code> are ready. Write two functions:</p><ul><li><code>risk_score(findings) -&gt; int</code>: sum of the weights, capped at <code>100</code></li><li><code>to_json_ready(findings) -&gt; list[dict]</code>: each finding converted with <code>asdict</code>, sorted <strong>most to least severe</strong> (using <code>SEVERITIES.index(...)</code>)</li></ul>`
      },
      starter: String.raw`
def risk_score(findings):
    return 0


def to_json_ready(findings):
    return []


demo = [Finding("CSP", "medium", "A05:2021"), Finding("SQLI", "critical", "A03:2021"), Finding("XSS", "high", "A03:2021")]
print(risk_score(demo))
print(to_json_ready(demo))
`,
      solution: String.raw`
def risk_score(findings):
    total = sum(SEVERITY_WEIGHTS[f.severity] for f in findings)
    return min(100, total)


def to_json_ready(findings):
    ordered = sorted(findings, key=lambda f: SEVERITIES.index(f.severity))
    return [asdict(f) for f in ordered]


demo = [Finding("CSP", "medium", "A05:2021"), Finding("SQLI", "critical", "A03:2021"), Finding("XSS", "high", "A03:2021")]
print(risk_score(demo))
print(to_json_ready(demo))
`,
      check: String.raw`
_demo = [Finding("CSP", "medium", "A05:2021"), Finding("SQLI", "critical", "A03:2021"), Finding("XSS", "high", "A03:2021")]
assert risk_score(_demo) == 21, _t(f"10 + 7 + 4 = 21 olmalı, gelen {risk_score(_demo)}.", f"Should be 10 + 7 + 4 = 21, got {risk_score(_demo)}.")
assert risk_score([]) == 0, _t("Bulgu yoksa puan 0.", "No findings means 0.")
assert risk_score([Finding(str(i), "critical", "A03:2021") for i in range(15)]) == 100, _t("Puan 100 ile sınırlanmalı (min(100, total)).", "The score must be capped at 100 (min(100, total)).")
_j = to_json_ready(_demo)
assert isinstance(_j, list) and all(isinstance(x, dict) for x in _j), _t("to_json_ready sözlük listesi döndürmeli (asdict).", "to_json_ready must return a list of dicts (asdict).")
assert [x["id"] for x in _j] == ["SQLI", "XSS", "CSP"], _t(f"Sıra critical → high → medium olmalı; gelen {[x.get('id') for x in _j]}.", f"Order must be critical → high → medium; got {[x.get('id') for x in _j]}.")
assert _j[0] == {"id": "SQLI", "severity": "critical", "owasp": "A03:2021"}, _t("asdict tüm alanları içermeli.", "asdict must include every field.")
`,
      hints: [
        { tr: "<code>sum(SEVERITY_WEIGHTS[f.severity] for f in findings)</code> sonra <code>min(100, ...)</code>.", en: "<code>sum(SEVERITY_WEIGHTS[f.severity] for f in findings)</code> then <code>min(100, ...)</code>." },
        { tr: "<code>sorted(findings, key=lambda f: SEVERITIES.index(f.severity))</code> ardından <code>[asdict(f) for f in ...]</code>.", en: "<code>sorted(findings, key=lambda f: SEVERITIES.index(f.severity))</code> then <code>[asdict(f) for f in ...]</code>." }
      ] }
  ],
  quiz: [
    { q: { tr: "<code>@dataclass</code> aşağıdakilerden hangisini otomatik <strong>üretmez</strong>?", en: "Which of these does <code>@dataclass</code> <strong>not</strong> generate automatically?" },
      options: [{ tr: "<code>__init__</code>", en: "<code>__init__</code>" }, { tr: "<code>__repr__</code>", en: "<code>__repr__</code>" }, { tr: "Alan doğrulaması (validation)", en: "Field validation" }],
      answer: 2, explain: { tr: "Doğrulamayı sen <code>__post_init__</code> içinde yazarsın.", en: "You write validation yourself in <code>__post_init__</code>." } },
    { q: { tr: "Bir dataclass'ta liste tipli bir alanın boş liste varsayılanı nasıl verilir?", en: "How do you give a list field an empty-list default in a dataclass?" },
      options: [{ tr: "<code>tags: list[str] = field(default_factory=list)</code>", en: "<code>tags: list[str] = field(default_factory=list)</code>" }, { tr: "<code>tags: list[str] = []</code>", en: "<code>tags: list[str] = []</code>" }, { tr: "<code>tags: list[str] = None</code> yeterli", en: "<code>tags: list[str] = None</code> is enough" }],
      answer: 0, explain: { tr: "<code>= []</code> yazmak <code>ValueError: mutable default</code> verir; her nesneye yeni liste için factory gerekir.", en: "<code>= []</code> raises <code>ValueError: mutable default</code>; a factory makes a fresh list per object." } },
    { q: { tr: "<code>frozen=True</code> bir dataclass'a ne kazandırır?", en: "What does <code>frozen=True</code> give a dataclass?" },
      options: [{ tr: "Daha hızlı JSON çevirisi", en: "Faster JSON conversion" }, { tr: "Değişmezlik (ve hash'lenebilirlik): şablonlar yanlışlıkla değiştirilemez", en: "Immutability (and hashability): templates can't be changed by accident" }, { tr: "Otomatik veritabanı kaydı", en: "Automatic database storage" }],
      answer: 1, explain: { tr: "SecureQA'nın <code>ChallengeInfo</code> şablonları (Juice Shop) bu yüzden frozen.", en: "That's why SecureQA's <code>ChallengeInfo</code> templates (Juice Shop) are frozen." } }
  ]
});
