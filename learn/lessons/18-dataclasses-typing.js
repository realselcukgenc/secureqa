SQ.addLesson({
  id: "18-dataclasses-typing",
  num: 18,
  icon: "froz",
  minutes: 25,
  title: { tr: "Dataclass & tip ipuçları ileri", en: "Dataclasses & typing (advanced)" },
  summary: {
    tr: "frozen=True değişmezlik ve hash'lenebilirlik, Optional ve varsayılanlar, alan sırası kuralı, __post_init__ ile türetilmiş varsayılan.",
    en: "frozen=True immutability and hashability, Optional and defaults, the field-order rule, and derived defaults with __post_init__."
  },
  goals: {
    tr: [
      "<code>Optional[str]</code> ve <code>X | None</code>: bir alan \"olmayabilir\"",
      "Varsayılanlar ve alan sırası kuralı: varsayılansız alan, varsayılanlıdan önce",
      "<code>frozen=True</code>: değişmez + hash'lenebilir; <code>replace()</code> ile değiştirilmiş kopya",
      "<code>__post_init__</code>: doğrulama ve boş bırakılan alanları türetme"
    ],
    en: [
      "<code>Optional[str]</code> and <code>X | None</code>: a field may be \"absent\"",
      "Defaults and the field-order rule: a field without a default comes before one with a default",
      "<code>frozen=True</code>: immutable + hashable; a modified copy with <code>replace()</code>",
      "<code>__post_init__</code>: validation and deriving fields left empty"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>14. derste <code>@dataclass</code>'ın temelini gördük: <code>Finding</code> ve <code>ChallengeInfo</code>. Bu derste tip ipuçlarını ve dataclass seçeneklerini profesyonel seviyeye taşıyoruz. İki fikir SecureQA'nın tasarımının merkezinde: <strong>Optional</strong> alanlar (bir bulgunun uzun açıklaması olmayabilir) ve <strong>frozen</strong> şablonlar (bir challenge'ın severity'si test sırasında yanlışlıkla değişmemeli).</p>`,
      en: `<p>In lesson 14 we saw the basics of <code>@dataclass</code>: <code>Finding</code> and <code>ChallengeInfo</code>. This lesson takes type hints and dataclass options to a professional level. Two ideas sit at the heart of SecureQA's design: <strong>Optional</strong> fields (a finding may not have a long description) and <strong>frozen</strong> templates (a challenge's severity must not change by accident during a test run).</p>` },
    { t: "h", tr: "Optional ve varsayılanlar", en: "Optional and defaults" },
    { t: "text",
      tr: `<p><code>Optional[str]</code> (eşdeğeri <code>str | None</code>) bir alanın <code>None</code> olabileceğini söyler. Bu sadece okuyana ve tip denetleyiciye (mypy) verilen bir ipucudur; Python çalışma anında zorlamaz. <strong>Kural:</strong> varsayılanı olmayan bir alan, varsayılanlı bir alandan <strong>önce</strong> gelmelidir — aksi halde <code>TypeError: non-default argument follows default argument</code> alırsın. Liste/sözlük gibi değiştirilebilir varsayılanlar için <code>= []</code> yasak; <code>field(default_factory=list)</code> kullanılır.</p>`,
      en: `<p><code>Optional[str]</code> (the same as <code>str | None</code>) says a field may be <code>None</code>. This is only a hint to the reader and the type checker (mypy); Python does not enforce it at runtime. <strong>The rule:</strong> a field without a default must come <strong>before</strong> any field with a default — otherwise you get <code>TypeError: non-default argument follows default argument</code>. For mutable defaults like lists/dicts <code>= []</code> is forbidden; use <code>field(default_factory=list)</code>.</p>` },
    { t: "code", id: "c1",
      title: { tr: "Optional, varsayılanlar, factory", en: "Optional, defaults, factory" },
      code: String.raw`
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ScanTarget:
    name: str                                  # zorunlu / required
    base_url: str                              # zorunlu / required
    juice_shop_url: Optional[str] = None       # opsiyonel / optional (str | None)
    tags: list[str] = field(default_factory=list)   # her nesneye taze liste


secureshop = ScanTarget("SecureShop", "http://127.0.0.1:5000")
juice = ScanTarget("Juice Shop", "http://127.0.0.1:5000",
                   juice_shop_url="http://127.0.0.1:3000", tags=["security"])

print(secureshop)
print(juice)
print("juice_shop_url yok mu / absent?", secureshop.juice_shop_url is None)
secureshop.tags.append("functional")
print("ayrı listeler / separate lists?", juice.tags)      # etkilenmez
` },
    { t: "callout", kind: "warn",
      tr: `<p><code>Optional[str] = None</code> yazmak çalışma anında tipi zorlamaz: <code>ScanTarget("x", "y", juice_shop_url=123)</code> patlamaz. Gerçek doğrulama istiyorsan <code>__post_init__</code> içinde elle kontrol et (SecureQA'nın <code>Finding</code>'inin severity için yaptığı gibi). Tip ipuçları <strong>belgeleme + mypy</strong> içindir, güvenlik duvarı değil.</p>`,
      en: `<p>Writing <code>Optional[str] = None</code> does not enforce the type at runtime: <code>ScanTarget("x", "y", juice_shop_url=123)</code> won't blow up. If you want real validation, check it by hand in <code>__post_init__</code> (as SecureQA's <code>Finding</code> does for severity). Type hints are for <strong>documentation + mypy</strong>, not a safety wall.</p>` },
    { t: "h", tr: "frozen=True: değişmez şablonlar", en: "frozen=True: immutable templates" },
    { t: "code", id: "c2",
      title: { tr: "frozen, replace, hash'lenebilirlik", en: "frozen, replace, hashability" },
      code: String.raw`
from dataclasses import dataclass, replace, FrozenInstanceError


@dataclass(frozen=True)
class ChallengeInfo:
    key: str
    severity: str
    owasp: str


login_admin = ChallengeInfo("loginAdminChallenge", "critical", "A03:2021-Injection")

try:
    login_admin.severity = "low"              # değişmez! / immutable!
except FrozenInstanceError as e:
    print("Değiştirilemez / cannot change:", e)

relaxed = replace(login_admin, severity="high")   # değiştirilmiş KOPYA / a modified COPY
print(login_admin)
print(relaxed)

# frozen -> hash'lenebilir -> set/dict anahtarı olabilir
registry = {login_admin: "classic SQLi", relaxed: "relaxed variant"}
print("kayıtlı mı / in registry?", login_admin in registry, "| boyut:", len(registry))
` },
    { t: "h", tr: "__post_init__ ile türetilmiş varsayılan", en: "Derived defaults with __post_init__" },
    { t: "text",
      tr: `<p>Bazı alanlar başka alanlardan <em>türetilebilir</em>. Boş bırakılırsa <code>__post_init__</code> içinde doldurursun: hem doğrulama hem de "kullanıcı vermediyse akıllı varsayılan üret" burada yapılır. Aşağıda <code>description</code> <code>None</code> bırakılırsa başlıktan üretilir.</p>`,
      en: `<p>Some fields can be <em>derived</em> from others. If left empty you fill them in <code>__post_init__</code>: both validation and "produce a smart default when the caller didn't give one" happen here. Below, if <code>description</code> is left <code>None</code> it is built from the title.</p>` },
    { t: "code", id: "c3",
      title: { tr: "Doğrula ve türet", en: "Validate and derive" },
      code: String.raw`
from dataclasses import dataclass
from typing import Optional

SEVERITIES = ("critical", "high", "medium", "low", "info")


@dataclass
class Finding:
    id: str
    title: str
    severity: str
    description: Optional[str] = None

    def __post_init__(self) -> None:
        self.severity = self.severity.lower()                 # normalize
        if self.severity not in SEVERITIES:                   # doğrula / validate
            raise ValueError(f"Unknown severity {self.severity!r}")
        if self.description is None:                          # türet / derive
            self.description = f"{self.title} ({self.severity})"


auto = Finding("XSS-1", "Reflected XSS", "HIGH")
given = Finding("SQLI-1", "SQLi login", "critical", description="Classic auth bypass")
print(auto.severity, "|", auto.description)
print(given.severity, "|", given.description)
` },
    { t: "project", file: "secureqa/findings.py + secureqa/juiceshop.py",
      tr: `<p>Gerçek <code>Finding</code> tam bu kalıpları kullanır: <strong>zorunlu alanlar önce</strong> (id, başlıklar, severity, owasp, cwe, url, evidence, çözümler), sonra <strong>varsayılanlı opsiyonel alanlar</strong> (<code>description_tr=""</code>, <code>test_id=""</code>, <code>found_at</code> factory ile). <code>ChallengeInfo</code> ise <code>frozen=True</code>: 30+ challenge şablonu bir kez yazılır ve test sırasında yanlışlıkla değişemez. (Not: bu sürümde <code>Finding</code>'de ayrı bir CVSS alanı <strong>yoktur</strong>; önem derecesi <code>severity</code> metniyle taşınır ve <code>SEVERITY_WEIGHTS</code> ile 0-100 risk puanına çevrilir — 21. derste CVSS mantığına ayrıca bakacağız.)</p>`,
      en: `<p>The real <code>Finding</code> uses exactly these patterns: <strong>required fields first</strong> (id, titles, severity, owasp, cwe, url, evidence, remediations), then <strong>optional fields with defaults</strong> (<code>description_tr=""</code>, <code>test_id=""</code>, <code>found_at</code> via a factory). <code>ChallengeInfo</code> is <code>frozen=True</code>: the 30+ challenge templates are written once and cannot change by accident during a run. (Note: in this version <code>Finding</code> has <strong>no</strong> separate CVSS field; severity is carried as the <code>severity</code> text and turned into a 0-100 risk score via <code>SEVERITY_WEIGHTS</code> — we look at CVSS reasoning separately in lesson 21.)</p>`,
      code: String.raw`
@dataclass
class Finding:
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


# secureqa/juiceshop.py
@dataclass(frozen=True)
class ChallengeInfo:
    key: str
    name: str
    title_tr: str
    title_en: str
    severity: str
    owasp: str
    cwe: str
    remediation_tr: str
    remediation_en: str
`,
      notes: [
        { line: 3, tr: "Zorunlu alanlar (varsayılansız) blok halinde en başta.", en: "Required fields (no default) come first as a block." },
        { line: 13, tr: "Opsiyonel alanlar varsayılanlı ve en sonda — sıra kuralı gereği.", en: "Optional fields have defaults and come last — per the ordering rule." },
        { line: 16, tr: "<code>found_at</code>: her nesneye o anın zaman damgası (<code>default_factory</code>).", en: "<code>found_at</code>: each object gets the current timestamp (<code>default_factory</code>)." },
        { line: 20, tr: "Tip ipucu zorlamaz; gerçek doğrulama <code>__post_init__</code>'te.", en: "The type hint doesn't enforce; real validation is in <code>__post_init__</code>." },
        { line: 26, tr: "<code>frozen=True</code>: şablonlar değişmez, hash'lenebilir ve güvenle bir sözlükte saklanır.", en: "<code>frozen=True</code>: templates are immutable, hashable and safely kept in a dict." }
      ] }
  ],
  exercises: [
    { id: "18-e1",
      title: { tr: "frozen + Optional şablon", en: "A frozen + Optional template" },
      prompt: {
        tr: `<p><code>TargetInfo</code> adında <code>@dataclass(frozen=True)</code> yaz. Alanlar sırasıyla: <code>name: str</code>, <code>url: str</code>, <code>note: Optional[str] = None</code>. Değişmez, hash'lenebilir bir şablon olmalı.</p>`,
        en: `<p>Write a <code>@dataclass(frozen=True)</code> called <code>TargetInfo</code>. Fields in order: <code>name: str</code>, <code>url: str</code>, <code>note: Optional[str] = None</code>. It must be an immutable, hashable template.</p>`
      },
      starter: String.raw`
from dataclasses import dataclass
from typing import Optional


class TargetInfo:
    pass


t = TargetInfo("SecureShop", "http://127.0.0.1:5000")
print(t)
`,
      solution: String.raw`
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class TargetInfo:
    name: str
    url: str
    note: Optional[str] = None


t = TargetInfo("SecureShop", "http://127.0.0.1:5000")
print(t)
`,
      check: String.raw`
import dataclasses as _dc
assert _dc.is_dataclass(TargetInfo), _t("TargetInfo bir @dataclass olmalı.", "TargetInfo must be a @dataclass.")
_names = [f.name for f in _dc.fields(TargetInfo)]
assert _names == ["name", "url", "note"], _t(f"Alanlar sırasıyla name, url, note olmalı; şu an {_names}.", f"Fields must be name, url, note in order; got {_names}.")
_t1 = TargetInfo("SecureShop", "http://127.0.0.1:5000")
assert _t1.note is None, _t("note varsayılanı None olmalı.", "note must default to None.")
try:
    _t1.url = "x"
    raise AssertionError(_t("frozen=True ile atama yasak olmalı (FrozenInstanceError).", "With frozen=True, assignment must be forbidden (FrozenInstanceError)."))
except _dc.FrozenInstanceError:
    pass
_reg = {_t1: 1}
assert _t1 in _reg, _t("frozen dataclass hash'lenebilir olmalı (dict anahtarı).", "A frozen dataclass must be hashable (dict key).")
assert TargetInfo("a", "b") == TargetInfo("a", "b"), _t("Dataclass eşitliği alanlara göre çalışmalı.", "Dataclass equality must compare fields.")
`,
      hints: [
        { tr: "<code>@dataclass(frozen=True)</code> satırını sınıfın üstüne yaz.", en: "Put <code>@dataclass(frozen=True)</code> above the class." },
        { tr: "Alanları tip ipucuyla tanımla: <code>name: str</code>, <code>url: str</code>, <code>note: Optional[str] = None</code>.", en: "Declare fields with type hints: <code>name: str</code>, <code>url: str</code>, <code>note: Optional[str] = None</code>." }
      ] },
    { id: "18-e2",
      title: { tr: "Doğrula ve türet (__post_init__)", en: "Validate and derive (__post_init__)" },
      setup: String.raw`
from dataclasses import dataclass
from typing import Optional

SEVERITIES = ("critical", "high", "medium", "low", "info")
`,
      prompt: {
        tr: `<p><code>Finding</code> adında bir <code>@dataclass</code> yaz. Alanlar: <code>id: str</code>, <code>severity: str</code>, <code>owasp: str</code>, <code>owasp_code: Optional[str] = None</code>. <code>__post_init__</code> içinde:</p><ul><li>severity'yi küçük harfe çevir; <code>SEVERITIES</code>'te değilse <code>ValueError</code> fırlat</li><li><code>owasp_code</code> <code>None</code> ise onu <code>owasp.split("-")[0]</code> ile türet (örn. <code>"A03:2021-Injection"</code> → <code>"A03:2021"</code>)</li></ul>`,
        en: `<p>Write a <code>@dataclass</code> called <code>Finding</code>. Fields: <code>id: str</code>, <code>severity: str</code>, <code>owasp: str</code>, <code>owasp_code: Optional[str] = None</code>. In <code>__post_init__</code>:</p><ul><li>lower-case the severity; raise <code>ValueError</code> if it is not in <code>SEVERITIES</code></li><li>if <code>owasp_code</code> is <code>None</code>, derive it with <code>owasp.split("-")[0]</code> (e.g. <code>"A03:2021-Injection"</code> → <code>"A03:2021"</code>)</li></ul>`
      },
      starter: String.raw`
@dataclass
class Finding:
    id: str
    severity: str
    owasp: str
    owasp_code: Optional[str] = None


f = Finding("SQLI-1", "Critical", "A03:2021-Injection")
print(f)
`,
      solution: String.raw`
@dataclass
class Finding:
    id: str
    severity: str
    owasp: str
    owasp_code: Optional[str] = None

    def __post_init__(self):
        self.severity = self.severity.lower()
        if self.severity not in SEVERITIES:
            raise ValueError(f"Unknown severity {self.severity!r}")
        if self.owasp_code is None:
            self.owasp_code = self.owasp.split("-")[0]


f = Finding("SQLI-1", "Critical", "A03:2021-Injection")
print(f)
`,
      check: String.raw`
import dataclasses as _dc
assert _dc.is_dataclass(Finding), _t("Finding bir @dataclass olmalı.", "Finding must be a @dataclass.")
_f = Finding("SQLI-1", "Critical", "A03:2021-Injection")
assert _f.severity == "critical", _t("severity küçük harfe çevrilmeli.", "severity must be lower-cased.")
assert _f.owasp_code == "A03:2021", _t(f"owasp_code 'A03:2021' olarak türetilmeli; gelen {_f.owasp_code!r}.", f"owasp_code must be derived as 'A03:2021'; got {_f.owasp_code!r}.")
_f2 = Finding("X", "high", "A01:2021-Broken Access Control", owasp_code="GIVEN")
assert _f2.owasp_code == "GIVEN", _t("owasp_code verilmişse türetme, olduğu gibi bırak.", "If owasp_code is given, don't derive — keep it as is.")
try:
    Finding("Y", "urgent", "A03:2021-Injection")
    raise AssertionError(_t("Geçersiz severity ValueError fırlatmalı.", "An invalid severity must raise ValueError."))
except ValueError:
    pass
`,
      hints: [
        { tr: "<code>def __post_init__(self):</code> içinde önce severity'yi normalize et ve doğrula.", en: "In <code>def __post_init__(self):</code> normalize and validate severity first." },
        { tr: "Türetme: <code>if self.owasp_code is None: self.owasp_code = self.owasp.split(\"-\")[0]</code>.", en: "Derive: <code>if self.owasp_code is None: self.owasp_code = self.owasp.split(\"-\")[0]</code>." }
      ] }
  ],
  quiz: [
    { q: { tr: "<code>Optional[str]</code> çalışma anında ne yapar?", en: "What does <code>Optional[str]</code> do at runtime?" },
      options: [{ tr: "Değerin str veya None olmasını zorlar", en: "Forces the value to be str or None" }, { tr: "Hiçbir şey zorlamaz; sadece okuyucu ve mypy için bir ipucudur", en: "Enforces nothing; it is only a hint for the reader and mypy" }, { tr: "Alanı otomatik None yapar", en: "Makes the field automatically None" }],
      answer: 1, explain: { tr: "Gerçek doğrulama istiyorsan <code>__post_init__</code>'te elle yaparsın.", en: "If you want real validation you do it by hand in <code>__post_init__</code>." } },
    { q: { tr: "<code>@dataclass(frozen=True)</code> bir örneğin alanına atama yapmaya çalışırsan ne olur?", en: "What happens if you assign to a field of a <code>@dataclass(frozen=True)</code> instance?" },
      options: [{ tr: "Sessizce yok sayılır", en: "It is silently ignored" }, { tr: "<code>FrozenInstanceError</code> fırlatılır", en: "A <code>FrozenInstanceError</code> is raised" }, { tr: "Yeni bir kopya oluşur", en: "A new copy is created" }],
      answer: 1, explain: { tr: "Değiştirilmiş kopya için <code>replace(obj, field=...)</code> kullanılır.", en: "For a modified copy use <code>replace(obj, field=...)</code>." } },
    { q: { tr: "Alan sırası kuralı nedir?", en: "What is the field-order rule?" },
      options: [{ tr: "Alanlar alfabetik sırada olmalı", en: "Fields must be alphabetical" }, { tr: "Varsayılansız bir alan, varsayılanlı bir alandan sonra gelemez", en: "A field without a default cannot come after one with a default" }, { tr: "Tüm alanların varsayılanı olmalı", en: "All fields must have a default" }],
      answer: 1, explain: { tr: "Aksi halde <code>TypeError: non-default argument follows default argument</code>.", en: "Otherwise <code>TypeError: non-default argument follows default argument</code>." } }
  ]
});
