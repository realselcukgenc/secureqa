SQ.addLesson({
  id: "21-cvss-mapping",
  num: 21,
  icon: "CVSS",
  minutes: 30,
  title: { tr: "Güvenlik otomasyonu 2: OWASP, CWE, CVSS", en: "Security automation 2: OWASP, CWE, CVSS" },
  summary: {
    tr: "OWASP Top 10 ve CWE eşlemesi, CVSS v3.1 taban puanı ve severity bantları, bir bulgunun önem derecesini akıllıca seçmek.",
    en: "OWASP Top 10 and CWE mapping, the CVSS v3.1 base score and severity bands, and choosing a finding's severity sensibly."
  },
  goals: {
    tr: [
      "OWASP Top 10 (2021) kategorileri ve CWE kimlikleri: bir bulgu nereye oturur",
      "CVSS v3.1 taban metrikleri (AV/AC/PR/UI/S/C/I/A) ve 0-10 taban puanı",
      "CVSS severity bantları (None/Low/Medium/High/Critical) ve SecureQA severity'lerine eşleme",
      "Bir <code>Finding</code>'in önem derecesini gerekçeyle seçmek ve risk puanına çevirmek"
    ],
    en: [
      "OWASP Top 10 (2021) categories and CWE ids: where a finding belongs",
      "CVSS v3.1 base metrics (AV/AC/PR/UI/S/C/I/A) and the 0-10 base score",
      "CVSS severity bands (None/Low/Medium/High/Critical) and mapping to SecureQA severities",
      "Choosing a <code>Finding</code>'s severity with reasoning and turning it into a risk score"
    ]
  },
  blocks: [
    { t: "text",
      tr: `<p>15. derste güvenlik testi düşünce yapısını (hedef, zafiyet, kanıt) gördük. Bir zafiyeti bulmak işin yarısıdır; profesyonel bir bulgu onu <strong>sınıflandırır</strong> ve <strong>puanlar</strong>: hangi OWASP kategorisi, hangi CWE, ne kadar tehlikeli (severity). Bu derste bu üç etiketin nereden geldiğini ve CVSS puanının nasıl hesaplandığını güvenli bir simülasyonla (saf Python) işliyoruz. SecureQA'nın <code>Finding</code>'i ve <code>ChallengeInfo</code>'su tam olarak bu alanları taşır.</p>`,
      en: `<p>In lesson 15 we saw the security-testing mindset (target, vulnerability, proof). Finding a vulnerability is half the job; a professional finding <strong>classifies</strong> and <strong>scores</strong> it: which OWASP category, which CWE, how dangerous (severity). This lesson works through where those three labels come from and how a CVSS score is computed, with a safe simulation (pure Python). SecureQA's <code>Finding</code> and <code>ChallengeInfo</code> carry exactly these fields.</p>` },
    { t: "callout", kind: "info", title: { tr: "Güvenli simülasyon", en: "Safe simulation" },
      tr: `<p>Bu dersin tüm hücreleri saf Python'dır — ağ veya saldırı yok. CVSS hesaplayıcısı, resmi <strong>CVSS v3.1</strong> taban puanı formülünü birebir uygular; böylece sayıların nereden geldiğini kendi gözünle görürsün. (Gerçek bir değerlendirmede bu puanı bir CVSS hesaplayıcısı üretir; biz mantığını öğreniyoruz.)</p>`,
      en: `<p>Every cell here is pure Python — no network, no attack. The CVSS calculator implements the official <strong>CVSS v3.1</strong> base-score formula exactly, so you see where the numbers come from. (In a real assessment a CVSS calculator produces this score; we are learning its logic.)</p>` },
    { t: "h", tr: "OWASP ve CWE: bulguyu sınıflandırmak", en: "OWASP and CWE: classifying the finding" },
    { t: "text",
      tr: `<p><strong>OWASP Top 10</strong> geniş risk <em>kategorileridir</em> (A01 Bozuk Erişim Kontrolü, A03 Enjeksiyon…). <strong>CWE</strong> ise belirli bir <em>zayıflık türüdür</em> (CWE-89 SQL Enjeksiyonu, CWE-79 XSS, CWE-639 IDOR). Bir bulgu ikisini birden taşır: OWASP yöneticiye "hangi aile", CWE geliştiriciye "tam olarak hangi hata" der.</p>`,
      en: `<p><strong>OWASP Top 10</strong> are broad risk <em>categories</em> (A01 Broken Access Control, A03 Injection…). <strong>CWE</strong> is a specific <em>weakness type</em> (CWE-89 SQL Injection, CWE-79 XSS, CWE-639 IDOR). A finding carries both: OWASP tells a manager "which family", CWE tells a developer "exactly which bug".</p>` },
    { t: "code", id: "c1",
      title: { tr: "OWASP/CWE eşlemesi", en: "OWASP/CWE mapping" },
      code: String.raw`
OWASP_2021 = {
    "A01:2021": {"en": "Broken Access Control", "tr": "Bozuk Erişim Kontrolü"},
    "A02:2021": {"en": "Cryptographic Failures", "tr": "Kriptografik Hatalar"},
    "A03:2021": {"en": "Injection", "tr": "Enjeksiyon"},
    "A05:2021": {"en": "Security Misconfiguration", "tr": "Güvenlik Yapılandırma Hatası"},
    "A07:2021": {"en": "Identification and Authentication Failures", "tr": "Kimlik Doğrulama Hataları"},
}


def classify(owasp: str, cwe: str, lang: str = "tr") -> str:
    code = owasp.split("-")[0]                       # "A03:2021-Injection" -> "A03:2021"
    name = OWASP_2021.get(code, {}).get(lang, "?")
    return f"{code} {name}  ·  {cwe}"


print(classify("A03:2021-Injection", "CWE-89"))                      # SQLi
print(classify("A03:2021-Injection", "CWE-79"))                      # XSS
print(classify("A01:2021-Broken Access Control", "CWE-639"))         # IDOR
print(classify("A07:2021-Identification and Authentication Failures", "CWE-521", lang="en"))
` },
    { t: "h", tr: "CVSS v3.1 taban puanı", en: "The CVSS v3.1 base score" },
    { t: "text",
      tr: `<p>CVSS bir zafiyeti 0-10 arasında puanlar. Taban metrikler iki gruba ayrılır: <strong>Exploitability</strong> (ne kadar kolay sömürülür — Saldırı Vektörü AV, Karmaşıklık AC, Gereken Yetki PR, Kullanıcı Etkileşimi UI) ve <strong>Impact</strong> (gizlilik C, bütünlük I, erişilebilirlik A etkisi). <strong>Scope</strong> (S), etkinin başka bir bileşene taşıp taşmadığını söyler. Aşağıdaki hücre resmi formülü uygular.</p>`,
      en: `<p>CVSS scores a vulnerability from 0 to 10. The base metrics split into two groups: <strong>Exploitability</strong> (how easy to exploit — Attack Vector AV, Complexity AC, Privileges Required PR, User Interaction UI) and <strong>Impact</strong> (effect on Confidentiality C, Integrity I, Availability A). <strong>Scope</strong> (S) says whether the impact crosses into another component. The cell below applies the official formula.</p>` },
    { t: "code", id: "c2",
      title: { tr: "CVSS taban puanı hesaplayıcı", en: "CVSS base score calculator" },
      code: String.raw`
import math

AV = {"N": 0.85, "A": 0.62, "L": 0.55, "P": 0.2}          # Attack Vector
AC = {"L": 0.77, "H": 0.44}                               # Attack Complexity
PR = {"U": {"N": 0.85, "L": 0.62, "H": 0.27},             # Privileges Required (Scope'a bağlı)
      "C": {"N": 0.85, "L": 0.68, "H": 0.5}}
UI = {"N": 0.85, "R": 0.62}                               # User Interaction
CIA = {"H": 0.56, "L": 0.22, "N": 0.0}                    # Confidentiality/Integrity/Availability


def _roundup(x: float) -> float:
    """Resmi CVSS yuvarlama: 0.1 üste (float hatalarına dayanıklı)."""
    i = round(x * 100000)
    return i / 100000 if i % 10000 == 0 else (math.floor(i / 10000) + 1) / 10.0


def cvss_base(av, ac, pr, ui, scope, c, i, a) -> float:
    iss = 1 - (1 - CIA[c]) * (1 - CIA[i]) * (1 - CIA[a])      # Impact Sub-Score
    if scope == "U":
        impact = 6.42 * iss
    else:
        impact = 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15
    exploitability = 8.22 * AV[av] * AC[ac] * PR[scope][pr] * UI[ui]
    if impact <= 0:
        return 0.0
    raw = impact + exploitability if scope == "U" else 1.08 * (impact + exploitability)
    return _roundup(min(raw, 10.0))


# SQLi ile admin girişi: uzaktan, kolay, yetkisiz, etkileşimsiz, tam etki
print("SQLi admin login:", cvss_base("N", "L", "N", "N", "U", "H", "H", "H"))   # 9.8
# Ayrıntılı hata mesajı ifşası: sadece gizlilik, düşük etki
print("Verbose error:   ", cvss_base("N", "L", "N", "N", "U", "L", "N", "N"))   # 5.3
` },
    { t: "h", tr: "Puandan severity'ye ve risk puanına", en: "From score to severity and risk score" },
    { t: "text",
      tr: `<p>CVSS taban puanı resmi <strong>severity bantlarına</strong> çevrilir: <code>0.0</code> None, <code>0.1–3.9</code> Low, <code>4.0–6.9</code> Medium, <code>7.0–8.9</code> High, <code>9.0–10.0</code> Critical. SecureQA bunu kendi <code>SEVERITIES</code> adlarına eşler (None → <code>info</code>) ve <code>SEVERITY_WEIGHTS</code> ile bir rapor için 0-100 risk puanı üretir.</p>`,
      en: `<p>The CVSS base score maps to official <strong>severity bands</strong>: <code>0.0</code> None, <code>0.1–3.9</code> Low, <code>4.0–6.9</code> Medium, <code>7.0–8.9</code> High, <code>9.0–10.0</code> Critical. SecureQA maps these to its own <code>SEVERITIES</code> names (None → <code>info</code>) and uses <code>SEVERITY_WEIGHTS</code> to produce a 0-100 risk score for a report.</p>` },
    { t: "code", id: "c3",
      title: { tr: "severity bantları ve risk puanı", en: "severity bands and risk score" },
      code: String.raw`
SEVERITIES = ("critical", "high", "medium", "low", "info")
SEVERITY_WEIGHTS = {"critical": 10, "high": 7, "medium": 4, "low": 2, "info": 0}


def severity_from_cvss(score: float) -> str:
    if score == 0:
        return "info"            # CVSS "None"
    if score < 4:
        return "low"
    if score < 7:
        return "medium"
    if score < 9:
        return "high"
    return "critical"


def risk_score(severities) -> int:
    total = sum(SEVERITY_WEIGHTS[s] for s in severities)
    return min(100, total)       # en fazla 100


scores = [9.8, 5.3, 7.5, 0.0]
severities = [severity_from_cvss(s) for s in scores]
print(list(zip(scores, severities)))
print("risk puanı / risk score:", risk_score(severities), "/ 100")
` },
    { t: "project", file: "secureqa/findings.py + secureqa/juiceshop.py",
      tr: `<p>SecureQA bu puanlamayı <code>SEVERITY_WEIGHTS</code> ve <code>risk_score()</code> ile basit ve açıklanabilir tutar (mülakatta anlatması kolay). OWASP/CWE eşlemeleri ise her Juice Shop challenge'ı için <code>ChallengeInfo</code>'da bir kez yazılır ve çözülen challenge bir <code>Finding</code>'e dönüşünce bu etiketler taşınır. (Bu sürümde ayrı bir CVSS alanı yoktur; severity metni ana ölçüttür.)</p>`,
      en: `<p>SecureQA keeps this scoring simple and explainable with <code>SEVERITY_WEIGHTS</code> and <code>risk_score()</code> (easy to explain in an interview). The OWASP/CWE mappings are written once per Juice Shop challenge in <code>ChallengeInfo</code>, and when a solved challenge becomes a <code>Finding</code> these labels are carried over. (This version has no separate CVSS field; the severity text is the main measure.)</p>`,
      code: String.raw`
# secureqa/findings.py
SEVERITIES = ("critical", "high", "medium", "low", "info")
SEVERITY_WEIGHTS = {"critical": 10, "high": 7, "medium": 4, "low": 2, "info": 0}


def risk_score(findings: list[Finding]) -> int:
    """Simple 0-100 risk score (higher = more dangerous), capped at 100."""
    total = sum(SEVERITY_WEIGHTS[finding.severity] for finding in findings)
    return min(100, total)


def risk_grade(score: int) -> str:
    """A (safest) .. F from the score."""
    if score == 0:
        return "A"
    if score < 15:
        return "B"
    if score < 40:
        return "C"
    if score < 70:
        return "D"
    return "F"


# secureqa/juiceshop.py — the OWASP/CWE/severity mapping, written once per challenge
ChallengeInfo(
    key="loginAdminChallenge", name="Login Admin",
    title_tr="SQL Enjeksiyonu ile Yönetici Girişi (Juice Shop)",
    title_en="SQL Injection Admin Login (Juice Shop)",
    severity="critical", owasp="A03:2021-Injection", cwe="CWE-89",
    remediation_tr="Giriş sorgularını parametreli yapın; girdiyi asla SQL metnine birleştirmeyin.",
    remediation_en="Use parameterized login queries; never concatenate input into SQL text.",
)
`,
      notes: [
        { line: 3, tr: "Ağırlıklar en tehlikeliden en aza; <code>info</code> puana katkı yapmaz.", en: "Weights from most to least dangerous; <code>info</code> adds nothing to the score." },
        { line: 8, tr: "Toplam en fazla 100 ile sınırlanır — tek bir critical bile raporu kırmızıya çeker.", en: "The total is capped at 100 — even one critical pushes the report toward red." },
        { line: 13, tr: "Harf notu paydaşlara tek bakışta durum verir (A..F).", en: "The letter grade gives stakeholders the status at a glance (A..F)." },
        { line: 30, tr: "Bir challenge'ın OWASP/CWE/severity'si burada bir kez belirlenir ve her bulguya taşınır.", en: "A challenge's OWASP/CWE/severity is decided here once and carried to every finding." }
      ] }
  ],
  exercises: [
    { id: "21-e1",
      title: { tr: "CVSS puanını severity'ye çevir", en: "Map a CVSS score to severity" },
      setup: String.raw`
SEVERITIES = ("critical", "high", "medium", "low", "info")
`,
      prompt: {
        tr: `<p><code>severity_from_cvss(score) -&gt; str</code> fonksiyonunu yaz. Resmi CVSS v3.1 severity bantlarını kullan ve SecureQA severity adlarını döndür:</p><ul><li><code>0.0</code> → <code>"info"</code> (None)</li><li><code>0.1–3.9</code> → <code>"low"</code></li><li><code>4.0–6.9</code> → <code>"medium"</code></li><li><code>7.0–8.9</code> → <code>"high"</code></li><li><code>9.0–10.0</code> → <code>"critical"</code></li></ul>`,
        en: `<p>Write <code>severity_from_cvss(score) -&gt; str</code>. Use the official CVSS v3.1 severity bands and return SecureQA severity names:</p><ul><li><code>0.0</code> → <code>"info"</code> (None)</li><li><code>0.1–3.9</code> → <code>"low"</code></li><li><code>4.0–6.9</code> → <code>"medium"</code></li><li><code>7.0–8.9</code> → <code>"high"</code></li><li><code>9.0–10.0</code> → <code>"critical"</code></li></ul>`
      },
      starter: String.raw`
def severity_from_cvss(score):
    return "info"


for s in [0.0, 3.9, 4.0, 6.9, 7.0, 8.9, 9.8]:
    print(s, "->", severity_from_cvss(s))
`,
      solution: String.raw`
def severity_from_cvss(score):
    if score == 0:
        return "info"
    if score < 4:
        return "low"
    if score < 7:
        return "medium"
    if score < 9:
        return "high"
    return "critical"


for s in [0.0, 3.9, 4.0, 6.9, 7.0, 8.9, 9.8]:
    print(s, "->", severity_from_cvss(s))
`,
      check: String.raw`
_cases = {0.0: "info", 0.1: "low", 3.9: "low", 4.0: "medium", 6.9: "medium", 7.0: "high", 8.9: "high", 9.0: "critical", 10.0: "critical"}
for _score, _want in _cases.items():
    _got = severity_from_cvss(_score)
    assert _got == _want, _t(f"CVSS {_score} -> {_want!r} olmalı; gelen {_got!r}.", f"CVSS {_score} -> should be {_want!r}; got {_got!r}.")
assert all(severity_from_cvss(s) in SEVERITIES for s in (0.0, 5.0, 9.9)), _t("Dönen değer SEVERITIES içinden biri olmalı.", "The return value must be one of SEVERITIES.")
`,
      hints: [
        { tr: "Sınırlara dikkat: <code>&lt; 4</code>, <code>&lt; 7</code>, <code>&lt; 9</code> kullan; 4.0 Medium'dur (Low değil).", en: "Mind the boundaries: use <code>&lt; 4</code>, <code>&lt; 7</code>, <code>&lt; 9</code>; 4.0 is Medium (not Low)." },
        { tr: "Önce <code>if score == 0: return \"info\"</code>, sonra artan bantlar.", en: "First <code>if score == 0: return \"info\"</code>, then the ascending bands." }
      ] },
    { id: "21-e2",
      title: { tr: "Bir bulgu kur ve eşle", en: "Build and map a finding" },
      setup: String.raw`
OWASP_2021 = {
    "A01:2021": {"en": "Broken Access Control", "tr": "Bozuk Erişim Kontrolü"},
    "A03:2021": {"en": "Injection", "tr": "Enjeksiyon"},
    "A07:2021": {"en": "Identification and Authentication Failures", "tr": "Kimlik Doğrulama Hataları"},
}


def severity_from_cvss(score):
    if score == 0:
        return "info"
    if score < 4:
        return "low"
    if score < 7:
        return "medium"
    if score < 9:
        return "high"
    return "critical"
`,
      prompt: {
        tr: `<p><code>severity_from_cvss</code> ve <code>OWASP_2021</code> hazır. <code>make_finding(fid, owasp, cwe, cvss) -&gt; dict</code> yaz. Dönen sözlük şu anahtarları içermeli:</p><ul><li><code>"id"</code>: <code>fid</code></li><li><code>"owasp_code"</code>: <code>owasp.split("-")[0]</code> (örn. <code>"A03:2021"</code>)</li><li><code>"owasp_name"</code>: <code>OWASP_2021[owasp_code]["tr"]</code></li><li><code>"cwe"</code>: <code>cwe</code></li><li><code>"cvss"</code>: <code>cvss</code></li><li><code>"severity"</code>: <code>severity_from_cvss(cvss)</code></li></ul>`,
        en: `<p><code>severity_from_cvss</code> and <code>OWASP_2021</code> are ready. Write <code>make_finding(fid, owasp, cwe, cvss) -&gt; dict</code>. The returned dict must contain these keys:</p><ul><li><code>"id"</code>: <code>fid</code></li><li><code>"owasp_code"</code>: <code>owasp.split("-")[0]</code> (e.g. <code>"A03:2021"</code>)</li><li><code>"owasp_name"</code>: <code>OWASP_2021[owasp_code]["tr"]</code></li><li><code>"cwe"</code>: <code>cwe</code></li><li><code>"cvss"</code>: <code>cvss</code></li><li><code>"severity"</code>: <code>severity_from_cvss(cvss)</code></li></ul>`
      },
      starter: String.raw`
def make_finding(fid, owasp, cwe, cvss):
    ...


print(make_finding("JS-loginAdmin", "A03:2021-Injection", "CWE-89", 9.8))
`,
      solution: String.raw`
def make_finding(fid, owasp, cwe, cvss):
    code = owasp.split("-")[0]
    return {
        "id": fid,
        "owasp_code": code,
        "owasp_name": OWASP_2021[code]["tr"],
        "cwe": cwe,
        "cvss": cvss,
        "severity": severity_from_cvss(cvss),
    }


print(make_finding("JS-loginAdmin", "A03:2021-Injection", "CWE-89", 9.8))
`,
      check: String.raw`
_f = make_finding("JS-loginAdmin", "A03:2021-Injection", "CWE-89", 9.8)
assert _f["id"] == "JS-loginAdmin", _t("id doğru taşınmalı.", "id must be carried through.")
assert _f["owasp_code"] == "A03:2021", _t(f"owasp_code 'A03:2021' olmalı; gelen {_f.get('owasp_code')!r}.", f"owasp_code must be 'A03:2021'; got {_f.get('owasp_code')!r}.")
assert _f["owasp_name"] == "Enjeksiyon", _t(f"owasp_name OWASP_2021'den gelmeli ('Enjeksiyon'); gelen {_f.get('owasp_name')!r}.", f"owasp_name must come from OWASP_2021 ('Enjeksiyon'); got {_f.get('owasp_name')!r}.")
assert _f["cwe"] == "CWE-89" and _f["cvss"] == 9.8, _t("cwe ve cvss olduğu gibi taşınmalı.", "cwe and cvss must be carried as-is.")
assert _f["severity"] == "critical", _t(f"9.8 -> critical olmalı; gelen {_f.get('severity')!r}.", f"9.8 -> must be critical; got {_f.get('severity')!r}.")
_g = make_finding("BAC-1", "A01:2021-Broken Access Control", "CWE-639", 5.3)
assert _g["owasp_name"] == "Bozuk Erişim Kontrolü" and _g["severity"] == "medium", _t(f"A01/5.3 -> Bozuk Erişim Kontrolü + medium; gelen {_g.get('owasp_name')!r}/{_g.get('severity')!r}.", f"A01/5.3 -> Broken Access Control + medium; got {_g.get('owasp_name')!r}/{_g.get('severity')!r}.")
`,
      hints: [
        { tr: "Önce <code>code = owasp.split(\"-\")[0]</code>, sonra sözlüğü kur.", en: "First <code>code = owasp.split(\"-\")[0]</code>, then build the dict." },
        { tr: "<code>\"owasp_name\": OWASP_2021[code][\"tr\"]</code> ve <code>\"severity\": severity_from_cvss(cvss)</code>.", en: "<code>\"owasp_name\": OWASP_2021[code][\"tr\"]</code> and <code>\"severity\": severity_from_cvss(cvss)</code>." }
      ] }
  ],
  quiz: [
    { q: { tr: "OWASP kategorisi ile CWE arasındaki fark nedir?", en: "What is the difference between an OWASP category and a CWE?" },
      options: [{ tr: "Aynı şeydir", en: "They are the same thing" }, { tr: "OWASP geniş bir risk ailesi (A03 Enjeksiyon), CWE ise belirli bir zayıflık türüdür (CWE-89 SQLi)", en: "OWASP is a broad risk family (A03 Injection), CWE is a specific weakness type (CWE-89 SQLi)" }, { tr: "CWE sadece ağ zafiyetleri içindir", en: "CWE is only for network vulnerabilities" }],
      answer: 1, explain: { tr: "Bir bulgu ikisini de taşır: OWASP yöneticiye, CWE geliştiriciye hitap eder.", en: "A finding carries both: OWASP speaks to managers, CWE to developers." } },
    { q: { tr: "CVSS taban puanı <code>9.8</code> hangi severity bandına düşer?", en: "A CVSS base score of <code>9.8</code> falls in which severity band?" },
      options: [{ tr: "Medium", en: "Medium" }, { tr: "High", en: "High" }, { tr: "Critical", en: "Critical" }],
      answer: 2, explain: { tr: "9.0–10.0 Critical'dır; SQLi admin bypass tipik bir 9.8 örneğidir.", en: "9.0–10.0 is Critical; an SQLi admin bypass is a typical 9.8." } },
    { q: { tr: "CVSS'te \"Exploitability\" grubuna hangisi girer?", en: "Which belongs to the CVSS \"Exploitability\" group?" },
      options: [{ tr: "Gizlilik/Bütünlük/Erişilebilirlik etkisi (C/I/A)", en: "Confidentiality/Integrity/Availability impact (C/I/A)" }, { tr: "Saldırı Vektörü, Karmaşıklık, Gereken Yetki, Kullanıcı Etkileşimi (AV/AC/PR/UI)", en: "Attack Vector, Complexity, Privileges Required, User Interaction (AV/AC/PR/UI)" }, { tr: "Sadece Scope", en: "Scope only" }],
      answer: 1, explain: { tr: "C/I/A Impact grubudur; AV/AC/PR/UI ise sömürülebilirliği ölçer.", en: "C/I/A is the Impact group; AV/AC/PR/UI measure exploitability." } }
  ]
});
