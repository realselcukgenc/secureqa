"""Build the self-contained HTML dashboard and the JSON output.

The report covers **two targets** (TR: iki hedef):

* **SecureShop** — the securely-built demo app. We show *defensive checks* that should
  all pass (green).
* **OWASP Juice Shop** — the deliberately vulnerable app. We show *findings*
  (confirmed vulnerabilities).

Entry points:
    * :func:`write_report` — update the on-disk snapshots and render the combined dashboard.
    * :func:`write_comparison_report` — SecureShop (defenses) vs Juice Shop (findings) side by side.

Everything (CSS, JS, SVG charts) is inlined, so the resulting HTML file opens anywhere
with no internet connection. (TR: Tüm CSS/JS/SVG gömülüdür; dosya internetsiz açılır.)
"""

from __future__ import annotations

import html
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from secureqa.checks import Check
from secureqa.findings import (
    OWASP_2021,
    SEVERITIES,
    Finding,
    cvss_rating,
    cvss_summary,
    risk_grade,
    risk_score,
)
from secureqa.report.charts import SEVERITY_COLORS, bar_chart, donut_chart

ASSETS = Path(__file__).parent / "assets"

# File names for the per-target snapshots the report is built from.
# TR: Raporun oluşturulduğu moda özel anlık görüntü dosyaları.
SNAP_FINDINGS = "juiceshop-findings.json"
SNAP_CHECKS = "secureshop-checks.json"

# Bilingual severity labels for pills and the legend. (TR: önem dereceleri.)
SEVERITY_LABELS: dict[str, dict[str, str]] = {
    "critical": {"tr": "Kritik", "en": "Critical"},
    "high": {"tr": "Yüksek", "en": "High"},
    "medium": {"tr": "Orta", "en": "Medium"},
    "low": {"tr": "Düşük", "en": "Low"},
    "info": {"tr": "Bilgi", "en": "Info"},
}


def _esc(text: str) -> str:
    """HTML-escape a string (TR: HTML özel karakterlerini güvenli hale getirir)."""
    return html.escape(str(text), quote=True)


def _read_asset(name: str) -> str:
    return (ASSETS / name).read_text(encoding="utf-8")


def _severity_counts(findings: list[Finding]) -> dict[str, int]:
    counts = {sev: 0 for sev in SEVERITIES}
    for finding in findings:
        counts[finding.severity] += 1
    return counts


def _owasp_counts(findings: list[Finding]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for finding in findings:
        counts[finding.owasp_code] = counts.get(finding.owasp_code, 0) + 1
    return counts


def _legend_html() -> str:
    items = []
    for sev, color in SEVERITY_COLORS.items():
        tr = SEVERITY_LABELS[sev]["tr"]
        en = SEVERITY_LABELS[sev]["en"]
        items.append(
            f'<span><i style="background:{color}"></i>'
            f'<span class="tr">{tr}</span><span class="en">{en}</span></span>'
        )
    return '<div class="legend">' + "".join(items) + "</div>"


def _cvss_class(score: float) -> str:
    """Map a CVSS score to one of the severity colour buckets used by the pills."""
    if score <= 0:
        return "info"
    if score < 4.0:
        return "low"
    if score < 7.0:
        return "medium"
    if score < 9.0:
        return "high"
    return "critical"


def _cvss_badge(finding: Finding) -> str:
    """Render a compact CVSS score badge (empty string when no score is set)."""
    if not finding.cvss_vector:
        return ""
    score = f"{finding.cvss:.1f}"
    rating = cvss_rating(finding.cvss)
    return (
        f'<span class="cvss {_cvss_class(finding.cvss)}" '
        f'title="{_esc(finding.cvss_vector)}">CVSS {score} · {rating}</span>'
    )


def _finding_row(finding: Finding) -> str:
    """Render one collapsible finding row (header + hidden body)."""
    sev = finding.severity
    sev_tr = SEVERITY_LABELS[sev]["tr"]
    sev_en = SEVERITY_LABELS[sev]["en"]
    owasp_code = finding.owasp_code
    owasp_names = OWASP_2021.get(owasp_code, {"tr": owasp_code, "en": owasp_code})
    search_blob = " ".join(
        [finding.id, finding.title_tr, finding.title_en, finding.owasp, finding.cwe, finding.url]
    ).lower()
    cvss_badge = _cvss_badge(finding)
    cvss_kv = ""
    if finding.cvss_vector:
        cvss_kv = (
            f'<span><b>CVSS 3.1:</b> {finding.cvss:.1f} ({_esc(cvss_rating(finding.cvss))}) '
            f'· <code>{_esc(finding.cvss_vector)}</code></span>'
        )

    return f"""
    <div class="frow" data-sev="{sev}" data-owasp="{_esc(owasp_code)}" data-search="{_esc(search_blob)}">
      <div class="fhead">
        <span class="pill {sev}"><span class="tr">{sev_tr}</span><span class="en">{sev_en}</span></span>
        <span class="ftitle">
          <span class="tr">{_esc(finding.title_tr)}</span><span class="en">{_esc(finding.title_en)}</span>
          <span class="fid">{_esc(finding.id)}</span>
        </span>
        <span class="fmeta">{cvss_badge}</span>
        <span class="fmeta">{_esc(finding.cwe)}</span>
        <span class="caret">&#9656;</span>
      </div>
      <div class="fbody">
        <div class="kv">
          <span><b>OWASP:</b> {_esc(finding.owasp)}
            (<span class="tr">{_esc(owasp_names['tr'])}</span><span class="en">{_esc(owasp_names['en'])}</span>)</span>
          <span><b>CWE:</b> {_esc(finding.cwe)}</span>
          {cvss_kv}
          <span><b>Test:</b> {_esc(finding.test_id) or '—'}</span>
        </div>
        <h4><span class="tr">Açıklama</span><span class="en">Description</span></h4>
        <p><span class="tr">{_esc(finding.description_tr) or '—'}</span><span class="en">{_esc(finding.description_en) or '—'}</span></p>
        <h4>URL</h4>
        <p class="url">{_esc(finding.url)}</p>
        <h4><span class="tr">Kanıt</span><span class="en">Evidence</span></h4>
        <div class="evidence">{_esc(finding.evidence)}</div>
        <h4><span class="tr">Çözüm Önerisi</span><span class="en">Remediation</span></h4>
        <p><span class="tr">{_esc(finding.remediation_tr)}</span><span class="en">{_esc(finding.remediation_en)}</span></p>
      </div>
    </div>"""


def _check_row(check: Check) -> str:
    """Render one defensive-check row for the SecureShop section."""
    state = "pass" if check.passed else "fail"
    label_tr = "GEÇTİ" if check.passed else "BAŞARISIZ"
    label_en = "PASS" if check.passed else "FAIL"
    search_blob = " ".join([check.id, check.title_tr, check.title_en, check.category]).lower()
    return f"""
    <div class="crow" data-state="{state}" data-search="{_esc(search_blob)}">
      <span class="pill {'pass' if check.passed else 'fail'}">
        <span class="tr">{label_tr}</span><span class="en">{label_en}</span></span>
      <span class="ctitle">
        <span class="tr">{_esc(check.title_tr)}</span><span class="en">{_esc(check.title_en)}</span>
        <span class="fid">{_esc(check.category)} · {_esc(check.id)}</span>
      </span>
      <span class="cdetail">{_esc(check.detail)}</span>
    </div>"""


def _severity_chips() -> str:
    chips = ['<button class="chip on" data-sev="all"><span class="tr">Tümü</span><span class="en">All</span></button>']
    for sev in SEVERITIES:
        tr = SEVERITY_LABELS[sev]["tr"]
        en = SEVERITY_LABELS[sev]["en"]
        chips.append(f'<button class="chip" data-sev="{sev}"><span class="tr">{tr}</span><span class="en">{en}</span></button>')
    return '<div class="chips">' + "".join(chips) + "</div>"


def _owasp_chips(findings: list[Finding]) -> str:
    present = sorted({f.owasp_code for f in findings})
    chips = ['<button class="chip on" data-owasp="all">OWASP: <span class="tr">Tümü</span><span class="en">All</span></button>']
    for code in present:
        chips.append(f'<button class="chip" data-owasp="{_esc(code)}">{_esc(code)}</button>')
    return '<div class="chips">' + "".join(chips) + "</div>"


def _summary_cards(findings: list[Finding], checks: list[Check]) -> str:
    counts = _severity_counts(findings)
    score = risk_score(findings)
    grade = risk_grade(score)
    passed = sum(1 for c in checks if c.passed)
    total_checks = len(checks)
    cvss = cvss_summary(findings)
    cvss_avg = f"{cvss['average']:.1f}"
    cvss_max = f"{cvss['max']:.1f}"
    cvss_max_class = _cvss_class(cvss["max"])
    return f"""
    <div class="cards">
      <div class="card">
        <div class="k"><span class="tr">Juice Shop Bulguları</span><span class="en">Juice Shop Findings</span></div>
        <div class="v">{len(findings)}</div>
      </div>
      <div class="card accent-critical">
        <div class="k"><span class="tr">Kritik</span><span class="en">Critical</span></div>
        <div class="v">{counts['critical']}</div>
      </div>
      <div class="card accent-high">
        <div class="k"><span class="tr">Yüksek</span><span class="en">High</span></div>
        <div class="v">{counts['high']}</div>
      </div>
      <div class="card">
        <div class="k"><span class="tr">CVSS (Ort. / En Yüksek)</span><span class="en">CVSS (Avg / Max)</span></div>
        <div class="v small">{cvss_avg}<span class="muted" style="font-size:16px"> ort</span>
          <span class="cvss {cvss_max_class}" style="vertical-align:middle">{cvss_max} max</span></div>
      </div>
      <div class="card accent-pass">
        <div class="k"><span class="tr">SecureShop Kontrolleri</span><span class="en">SecureShop Checks</span></div>
        <div class="v small">{passed}<span class="muted" style="font-size:16px">/{total_checks}</span>
          <span class="tr muted" style="font-size:14px">geçti</span><span class="en muted" style="font-size:14px">passed</span></div>
      </div>
      <div class="card">
        <div class="k"><span class="tr">Risk Puanı (Juice Shop)</span><span class="en">Risk Score (Juice Shop)</span></div>
        <div class="v small">{score}<span class="muted" style="font-size:16px">/100</span>
          <span class="grade {grade}">{grade}</span></div>
        <div class="scorebar"><span style="width:{score}%"></span></div>
      </div>
    </div>"""


def _secureshop_section(checks: list[Check]) -> str:
    """Render the SecureShop defensive-checks panel (hidden entirely when empty)."""
    if not checks:
        return ""
    passed = sum(1 for c in checks if c.passed)
    failed = len(checks) - passed
    status_class = "secure" if failed == 0 else "vulnerable"
    rows = "".join(_check_row(c) for c in sorted(checks, key=lambda c: (c.passed, c.category, c.id)))
    return f"""
    <h2 class="section-title">
      <span class="tr">SecureShop — Savunma Kontrolleri</span>
      <span class="en">SecureShop — Defensive Checks</span>
    </h2>
    <div class="mode-banner {status_class}">
      {'&#9989;' if failed == 0 else '&#9888;&#65039;'}
      <span class="tr">{passed}/{len(checks)} savunma kontrolü geçti (güvenli hedef, açık beklenmiyor).</span>
      <span class="en">{passed}/{len(checks)} defensive checks passed (secure target, no findings expected).</span>
    </div>
    <div class="findings checks">{rows}</div>"""


def _juiceshop_section(findings: list[Finding]) -> str:
    """Render the Juice Shop findings panel with charts and filters."""
    sev_counts = _severity_counts(findings)
    owasp_counts = _owasp_counts(findings)
    owasp_labels = {code: OWASP_2021[code]["en"] for code in OWASP_2021}
    rows = "".join(_finding_row(f) for f in sorted(findings, key=lambda f: SEVERITIES.index(f.severity)))
    if not findings:
        rows = """<div class="empty">
          <span class="tr">Henüz Juice Shop bulgusu yok. Juice Shop'u çalıştırıp güvenlik testlerini koşun.</span>
          <span class="en">No Juice Shop findings yet. Start Juice Shop and run the security tests.</span></div>"""

    return f"""
    <h2 class="section-title">
      <span class="tr">OWASP Juice Shop — Güvenlik Bulguları</span>
      <span class="en">OWASP Juice Shop — Security Findings</span>
    </h2>
    <div class="panels">
      <div class="panel">
        <h2><span class="tr">Önem Dağılımı</span><span class="en">By Severity</span></h2>
        <div class="donut-wrap">{donut_chart(sev_counts)}{_legend_html()}</div>
      </div>
      <div class="panel">
        <h2><span class="tr">OWASP Top 10 (2021) Dağılımı</span><span class="en">OWASP Top 10 (2021)</span></h2>
        {bar_chart(owasp_counts, owasp_labels)}
      </div>
    </div>
    <div class="panel" style="margin-bottom:22px">
      <div class="toolbar">
        <input id="search" type="search" placeholder="Ara / Search... (id, title, CWE, URL)">
        <button class="btn" data-action="expand-all"><span class="tr">Hepsini Aç</span><span class="en">Expand all</span></button>
        <button class="btn" data-action="collapse-all"><span class="tr">Hepsini Kapat</span><span class="en">Collapse all</span></button>
      </div>
      {_severity_chips()}
      <div style="height:8px"></div>
      {_owasp_chips(findings)}
    </div>
    <div class="findings">{rows}</div>
    <div class="empty" id="empty-state" style="display:none">
      <span class="tr">Filtreyle eşleşen bulgu yok.</span><span class="en">No findings match the filter.</span>
    </div>"""


def _page_shell(body: str, title: str, generated_at: str) -> str:
    """Wrap the body in the full HTML document with inlined CSS and JS."""
    css = _read_asset("report.css")
    js = _read_asset("report.js")
    return f"""<!doctype html>
<html lang="tr" data-theme="light" data-lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{_esc(title)}</title>
<style>
{css}
</style>
</head>
<body>
<div class="wrap">
{body}
<footer>
  <span class="tr">SecureQA tarafından {generated_at} tarihinde üretildi · Selçuk Genç</span>
  <span class="en">Generated by SecureQA on {generated_at} · Selçuk Genç</span>
</footer>
</div>
<script>
{js}
</script>
</body>
</html>"""


def _topbar(subtitle_tr: str, subtitle_en: str) -> str:
    return f"""
    <div class="topbar">
      <div class="brand">
        <div class="logo">S</div>
        <div>
          <h1>SecureQA</h1>
          <div class="sub"><span class="tr">{_esc(subtitle_tr)}</span><span class="en">{_esc(subtitle_en)}</span></div>
        </div>
      </div>
      <div class="controls">
        <button class="btn seg">
          <span data-action="set-lang" data-lang-btn="tr">TR</span>
          <span data-action="set-lang" data-lang-btn="en">EN</span>
        </button>
        <button class="btn" id="theme-btn" data-action="toggle-theme" title="Theme">&#9728;&#65039;</button>
        <button class="btn" data-action="print"><span class="tr">Yazdır</span><span class="en">Print</span></button>
      </div>
    </div>"""


def build_report_html(
    findings: list[Finding], checks: list[Check], generated_at: str | None = None
) -> str:
    """Return the complete combined HTML document (both targets) as a string."""
    generated_at = generated_at or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    body = f"""
    {_topbar('Güvenlik Test Raporu · SecureShop + Juice Shop', 'Security Test Report · SecureShop + Juice Shop')}
    {_summary_cards(findings, checks)}
    {_secureshop_section(checks)}
    {_juiceshop_section(findings)}"""
    return _page_shell(body, "SecureQA — Security Report", generated_at)


# --------------------------------------------------------------------------- snapshots
def _load_findings(reports_dir: Path) -> list[Finding]:
    path = reports_dir / SNAP_FINDINGS
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return [Finding.from_dict(item) for item in data.get("findings", data if isinstance(data, list) else [])]


def _load_checks(reports_dir: Path) -> list[Check]:
    path = reports_dir / SNAP_CHECKS
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    items = data.get("checks", data if isinstance(data, list) else [])
    return [Check.from_dict(item) for item in items]


def write_report(
    findings: list[Finding],
    checks: list[Check],
    reports_dir: Path,
    html_name: str = "security-report.html",
    json_name: str = "findings.json",
) -> tuple[Path, Path]:
    """Update the per-target snapshots and render the combined dashboard.

    Only the targets touched this session overwrite their snapshot, so running the
    SecureShop suite and then the Juice Shop suite builds one report with both.
    (TR: Bu oturumda dokunulan hedefin anlık görüntüsü güncellenir; iki hedef birikir.)
    """
    reports_dir.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # 1) Persist this session's data (only when non-empty, so we never wipe the other target).
    if findings:
        findings_payload: dict[str, Any] = {
            "target": "juiceshop",
            "generated_at": generated_at,
            "risk_score": risk_score(findings),
            "risk_grade": risk_grade(risk_score(findings)),
            "severity_counts": _severity_counts(findings),
            "owasp_counts": _owasp_counts(findings),
            "findings": [f.to_dict() for f in sorted(findings, key=lambda f: SEVERITIES.index(f.severity))],
        }
        (reports_dir / SNAP_FINDINGS).write_text(
            json.dumps(findings_payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    if checks:
        checks_payload = {
            "target": "secureshop",
            "generated_at": generated_at,
            "passed": sum(1 for c in checks if c.passed),
            "failed": sum(1 for c in checks if not c.passed),
            "checks": [c.to_dict() for c in sorted(checks, key=lambda c: (c.passed, c.category, c.id))],
        }
        (reports_dir / SNAP_CHECKS).write_text(
            json.dumps(checks_payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    # 2) Build the combined report from everything we now have on disk.
    all_findings = findings or _load_findings(reports_dir)
    all_checks = checks or _load_checks(reports_dir)

    html_path = reports_dir / html_name
    json_path = reports_dir / json_name
    html_path.write_text(build_report_html(all_findings, all_checks, generated_at), encoding="utf-8")

    combined = {
        "generated_at": generated_at,
        "secureshop_checks": [c.to_dict() for c in all_checks],
        "juiceshop_findings": [f.to_dict() for f in sorted(all_findings, key=lambda f: SEVERITIES.index(f.severity))],
        "risk_score": risk_score(all_findings),
        "risk_grade": risk_grade(risk_score(all_findings)),
    }
    json_path.write_text(json.dumps(combined, ensure_ascii=False, indent=2), encoding="utf-8")
    return html_path, json_path


def _compare_side_checks(checks: list[Check]) -> str:
    passed = sum(1 for c in checks if c.passed)
    rows = "".join(_check_row(c) for c in checks) or """<div class="empty">
      <span class="tr">Kontrol yok.</span><span class="en">No checks.</span></div>"""
    return f"""
    <div class="side">
      <h3><span class="tr">SecureShop (Güvenli Hedef)</span><span class="en">SecureShop (Secure Target)</span></h3>
      <div class="mode-banner secure">&#9989;
        <span class="tr">{passed}/{len(checks)} savunma kontrolü geçti.</span>
        <span class="en">{passed}/{len(checks)} defensive checks passed.</span></div>
      <div class="findings checks">{rows}</div>
    </div>"""


def _compare_side_findings(findings: list[Finding]) -> str:
    sev_counts = _severity_counts(findings)
    score = risk_score(findings)
    grade = risk_grade(score)
    rows = "".join(_finding_row(f) for f in sorted(findings, key=lambda f: SEVERITIES.index(f.severity))) or """<div class="empty">
      <span class="tr">Bulgu yok.</span><span class="en">No findings.</span></div>"""
    return f"""
    <div class="side">
      <h3><span class="tr">Juice Shop (Zafiyetli Hedef)</span><span class="en">Juice Shop (Vulnerable Target)</span>
        <span class="grade {grade}" style="font-size:22px">{grade}</span></h3>
      <div class="mode-banner vulnerable">&#9888;&#65039;
        <span class="tr">{len(findings)} bulgu · risk {score}/100.</span>
        <span class="en">{len(findings)} findings · risk {score}/100.</span></div>
      <div class="panel"><div class="donut-wrap">{donut_chart(sev_counts)}</div></div>
      <div class="findings" style="margin-top:16px">{rows}</div>
    </div>"""


def write_comparison_report(reports_dir: Path, out_name: str = "comparison-report.html") -> Path:
    """Build a side-by-side HTML: SecureShop defenses vs Juice Shop findings.

    Reads the snapshots written by :func:`write_report`. Raises ``FileNotFoundError``
    if neither target has been run yet.
    """
    checks = _load_checks(reports_dir)
    findings = _load_findings(reports_dir)
    if not checks and not findings:
        raise FileNotFoundError(
            "Run the suites first (python run.py test  and/or  python run.py juiceshop)."
        )
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    body = f"""
    {_topbar('Karşılaştırma: SecureShop vs Juice Shop', 'Comparison: SecureShop vs Juice Shop')}
    <div class="compare">
      {_compare_side_checks(checks)}
      {_compare_side_findings(findings)}
    </div>"""
    out_path = reports_dir / out_name
    out_path.write_text(_page_shell(body, "SecureQA — Comparison", generated_at), encoding="utf-8")
    return out_path
