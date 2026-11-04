"""Defensive-check results for the *secure* target (SecureShop).

Against a securely-built app we do not expect vulnerabilities. Instead we run
**defensive regression checks**: "is the security header present?", "is the cookie
HttpOnly?", "is CSRF enforced?". Each produces a :class:`Check` that is expected to
*pass*. This is the mirror image of a :class:`~secureqa.findings.Finding`.
(TR: Güvenli uygulamada açık beklemeyiz; savunmaların yerinde olduğunu doğrularız.)
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass
class Check:
    """One defensive regression check result (TR: tek bir savunma kontrolü sonucu).

    Attributes:
        id: Short identifier, e.g. ``"HDR-CSP"``.
        title_tr / title_en: What the check verifies (bilingual).
        category: A short bucket, e.g. ``"Headers"``, ``"Cookies"``, ``"Access Control"``.
        passed: ``True`` when the defense is correctly in place.
        detail: Evidence / explanation (the header value seen, the status code, ...).
        test_id: The pytest node id that produced it (filled automatically).
        checked_at: ISO timestamp.
    """

    id: str
    title_tr: str
    title_en: str
    category: str
    passed: bool
    detail: str = ""
    test_id: str = ""
    checked_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds"))

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Check":
        known = {name for name in cls.__dataclass_fields__}
        return cls(**{key: value for key, value in data.items() if key in known})


class ChecksCollector:
    """Stores defensive checks during a test session (TR: savunma kontrollerini toplar)."""

    def __init__(self) -> None:
        self.checks: list[Check] = []

    def add(self, check: Check) -> Check:
        self.checks.append(check)
        return check

    def __len__(self) -> int:
        return len(self.checks)

    def passed(self) -> int:
        return sum(1 for check in self.checks if check.passed)

    def failed(self) -> int:
        return sum(1 for check in self.checks if not check.passed)

    def to_list(self) -> list[dict[str, Any]]:
        # Failed checks first (they are the ones that need attention).
        ordered = sorted(self.checks, key=lambda c: (c.passed, c.category, c.id))
        return [check.to_dict() for check in ordered]

    def save_json(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.to_list(), ensure_ascii=False, indent=2), encoding="utf-8")
