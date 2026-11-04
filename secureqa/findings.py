"""The ``Finding`` dataclass and a small collector that stores findings during a test run.

A *finding* is one confirmed security problem: what it is, how bad it is, where we saw it,
the proof (evidence) and how to fix it — in Turkish and English.
(TR: "Bulgu" = testin tespit ettiği tek bir güvenlik açığı.)

Example / Örnek::

    from secureqa.findings import Finding, FindingsCollector

    collector = FindingsCollector()
    collector.add(Finding(
        id="XSS-001",
        title_tr="Yansıtılmış XSS", title_en="Reflected XSS",
        severity="high", owasp="A03:2021-Injection", cwe="CWE-79",
        url="http://127.0.0.1:5000/products?q=<script>",
        evidence="Payload executed: alert() dialog was opened",
        remediation_tr="Çıktıyı kodlayın.", remediation_en="Encode output.",
    ))
    print(collector.count_by_severity())
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Allowed severities, from the most to the least dangerous.
# TR: Önem dereceleri — en tehlikeliden en aza.
SEVERITIES: tuple[str, ...] = ("critical", "high", "medium", "low", "info")

# Points per severity, used to calculate a 0-100 risk score in the report.
# TR: Risk puanı hesaplamasında kullanılan ağırlıklar.
SEVERITY_WEIGHTS: dict[str, int] = {"critical": 10, "high": 7, "medium": 4, "low": 2, "info": 0}

# The OWASP Top 10 (2021) categories with bilingual names.
# TR: OWASP Top 10 2021 kategorileri (Türkçe/İngilizce).
OWASP_2021: dict[str, dict[str, str]] = {
    "A01:2021": {"en": "Broken Access Control", "tr": "Bozuk Erişim Kontrolü"},
    "A02:2021": {"en": "Cryptographic Failures", "tr": "Kriptografik Hatalar"},
    "A03:2021": {"en": "Injection", "tr": "Enjeksiyon"},
    "A04:2021": {"en": "Insecure Design", "tr": "Güvensiz Tasarım"},
    "A05:2021": {"en": "Security Misconfiguration", "tr": "Güvenlik Yapılandırma Hatası"},
    "A06:2021": {"en": "Vulnerable and Outdated Components", "tr": "Zafiyetli ve Güncel Olmayan Bileşenler"},
    "A07:2021": {"en": "Identification and Authentication Failures", "tr": "Kimlik Doğrulama Hataları"},
    "A08:2021": {"en": "Software and Data Integrity Failures", "tr": "Yazılım ve Veri Bütünlüğü Hataları"},
    "A09:2021": {"en": "Security Logging and Monitoring Failures", "tr": "Güvenlik Kayıt ve İzleme Hataları"},
    "A10:2021": {"en": "Server-Side Request Forgery", "tr": "Sunucu Taraflı İstek Sahteciliği"},
}


@dataclass
class Finding:
    """One security finding (TR: tek bir güvenlik bulgusu).

    Attributes:
        id: Short stable identifier, e.g. ``"XSS-REFLECTED"``.
        title_tr: Turkish title.
        title_en: English title.
        severity: One of :data:`SEVERITIES`.
        owasp: OWASP 2021 category, e.g. ``"A03:2021-Injection"``.
        cwe: CWE identifier, e.g. ``"CWE-79"``.
        url: The URL where the problem was observed.
        evidence: Proof: a response snippet, header value, etc.
        remediation_tr: How to fix it (Turkish).
        remediation_en: How to fix it (English).
        cvss: CVSS 3.1 base score 0.0-10.0 (0.0 = no quantified technical impact).
        cvss_vector: CVSS 3.1 vector string, e.g. ``"CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N"``.
        description_tr: Optional longer explanation (Turkish).
        description_en: Optional longer explanation (English).
        test_id: The pytest node id that produced the finding.
        found_at: ISO timestamp (filled automatically).
    """

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
    cvss: float = 0.0
    cvss_vector: str = ""
    description_tr: str = ""
    description_en: str = ""
    test_id: str = ""
    found_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds"))

    def __post_init__(self) -> None:
        """Validate the values right after the object is created.

        (TR: Nesne oluşturulunca değerleri kontrol eder; hatalı önem derecesi kabul edilmez.)
        """
        self.severity = self.severity.lower()
        if self.severity not in SEVERITIES:
            raise ValueError(f"Unknown severity {self.severity!r}; use one of {SEVERITIES}")

    @property
    def owasp_code(self) -> str:
        """Only the code part of the OWASP category: ``"A03:2021-Injection"`` -> ``"A03:2021"``."""
        return self.owasp.split("-")[0]

    def to_dict(self) -> dict[str, Any]:
        """Convert to a plain dict (ready for ``json.dumps``)."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Finding":
        """Build a Finding back from a dict (e.g. loaded from findings.json)."""
        known = {name for name in cls.__dataclass_fields__}
        return cls(**{key: value for key, value in data.items() if key in known})


class FindingsCollector:
    """Stores findings during a test session (TR: test oturumu boyunca bulguları toplar)."""

    def __init__(self) -> None:
        self.findings: list[Finding] = []

    def add(self, finding: Finding) -> Finding:
        """Add a finding and return it (so you can chain or inspect it)."""
        self.findings.append(finding)
        return finding

    def __len__(self) -> int:
        return len(self.findings)

    def count_by_severity(self) -> dict[str, int]:
        """Return ``{"critical": 2, "high": 5, ...}`` including zeros."""
        counts = {severity: 0 for severity in SEVERITIES}
        for finding in self.findings:
            counts[finding.severity] += 1
        return counts

    def count_by_owasp(self) -> dict[str, int]:
        """Return ``{"A01:2021": 3, ...}`` for all ten OWASP categories (zeros included)."""
        counts = {code: 0 for code in OWASP_2021}
        for finding in self.findings:
            counts[finding.owasp_code] = counts.get(finding.owasp_code, 0) + 1
        return counts

    def to_list(self) -> list[dict[str, Any]]:
        """All findings as plain dicts, most severe first."""
        ordered = sorted(self.findings, key=lambda f: SEVERITIES.index(f.severity))
        return [finding.to_dict() for finding in ordered]

    def save_json(self, path: Path) -> None:
        """Write only the findings list to a JSON file (UTF-8, pretty printed)."""
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.to_list(), ensure_ascii=False, indent=2), encoding="utf-8")


def risk_score(findings: list[Finding]) -> int:
    """Calculate a simple 0-100 risk score (higher = more dangerous).

    Each finding adds points by severity (critical=10, high=7, ...). The total is capped at 100.
    It is intentionally simple so it is easy to explain in an interview.
    (TR: Basit risk puanı: bulguların ağırlıkları toplanır, en fazla 100.)
    """
    total = sum(SEVERITY_WEIGHTS[finding.severity] for finding in findings)
    return min(100, total)


def risk_grade(score: int) -> str:
    """Turn a risk score into a school-style letter grade (A = safest)."""
    if score == 0:
        return "A"
    if score < 15:
        return "B"
    if score < 40:
        return "C"
    if score < 70:
        return "D"
    return "F"


# CVSS 3.1 qualitative severity bands (TR: CVSS 3.1 nitel önem aralıkları).
# None 0.0 · Low 0.1-3.9 · Medium 4.0-6.9 · High 7.0-8.9 · Critical 9.0-10.0
def cvss_rating(score: float) -> str:
    """Map a CVSS 3.1 base score to its qualitative rating word."""
    if score <= 0:
        return "None"
    if score < 4.0:
        return "Low"
    if score < 7.0:
        return "Medium"
    if score < 9.0:
        return "High"
    return "Critical"


def cvss_summary(findings: list[Finding]) -> dict[str, float]:
    """Return ``{"average": .., "max": ..}`` CVSS across findings that carry a score.

    Findings with a 0.0 score (purely informational, no quantified impact) are excluded
    from the average so a few info items do not drag the mean down artificially; they are
    still counted in ``max`` only if nothing scores higher.
    (TR: Puanı olan bulgular üzerinden ortalama ve en yüksek CVSS değeri.)
    """
    scored = [f.cvss for f in findings if f.cvss and f.cvss > 0]
    if not scored:
        return {"average": 0.0, "max": 0.0}
    return {"average": round(sum(scored) / len(scored), 1), "max": round(max(scored), 1)}
