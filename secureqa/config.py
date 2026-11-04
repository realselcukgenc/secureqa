"""Central configuration for the SecureQA framework.

Every setting can be changed with an environment variable, so the same code works
on your laptop, in CI and against a remote test server.
(TR: Tüm ayarlar ortam değişkenleriyle değiştirilebilir; kodu değiştirmeye gerek yok.)

Example / Örnek::

    BASE_URL=http://127.0.0.1:8000 HEADLESS=0 pytest tests/functional

Usage in code / Kodda kullanım::

    from secureqa.config import settings
    print(settings.base_url)
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# The project root is the folder that contains this package (secureqa/..).
# TR: Proje kök dizini — raporlar ve demo uygulama buna göre bulunur.
PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent
REPORTS_DIR: Path = PROJECT_ROOT / "reports"

DEFAULT_BASE_URL: str = "http://127.0.0.1:5000"       # SecureShop (functional target)
DEFAULT_JUICE_SHOP_URL: str = "http://127.0.0.1:3000"  # OWASP Juice Shop (security target)
SUPPORTED_LANGS: tuple[str, ...] = ("tr", "en")


def _env_bool(name: str, default: bool) -> bool:
    """Read a yes/no environment variable.

    "1", "true", "yes" and "on" mean True; anything else means False.
    (TR: Evet/hayır tipindeki ortam değişkenlerini okur.)
    """
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


@dataclass
class Settings:
    """All tunable values in one place (TR: tüm ayarlar tek bir yerde).

    Attributes:
        base_url: Where SecureShop (the functional target) lives.
        juice_shop_url: Where OWASP Juice Shop (the security target) lives.
        browser: Playwright browser name ("chromium", "firefox", "webkit").
        headless: Run the browser without a visible window.
        lang: UI language used by the tests and the default report language.
        chromium_path: Optional path to a pre-installed Chromium binary.
        timeout_ms: Default Playwright timeout in milliseconds.
        reports_dir: Folder where HTML/JSON reports are written.
    """

    base_url: str = field(default_factory=lambda: os.environ.get("BASE_URL", DEFAULT_BASE_URL).rstrip("/"))
    juice_shop_url: str | None = field(
        default_factory=lambda: (os.environ.get("JUICE_SHOP_URL") or "").rstrip("/") or None
    )
    browser: str = field(default_factory=lambda: os.environ.get("BROWSER", "chromium"))
    headless: bool = field(default_factory=lambda: _env_bool("HEADLESS", True))
    lang: str = field(default_factory=lambda: os.environ.get("SECUREQA_LANG", "tr"))
    chromium_path: str | None = field(default_factory=lambda: os.environ.get("PW_CHROMIUM_PATH") or None)
    timeout_ms: int = field(default_factory=lambda: int(os.environ.get("SECUREQA_TIMEOUT_MS", "10000")))
    reports_dir: Path = REPORTS_DIR

    def url(self, path: str) -> str:
        """Join the base URL with a path: ``settings.url("/login")``.

        (TR: Taban adres ile yolu birleştirir.)
        """
        if not path.startswith("/"):
            path = "/" + path
        return self.base_url + path


# A single shared instance. Tests and pages import this object.
# TR: Paylaşılan tek ayar nesnesi.
settings = Settings()


# Seed users of the SecureShop demo application (see SPEC.md).
# TR: Demo uygulamadaki hazır kullanıcılar.
@dataclass(frozen=True)
class User:
    """A test user account (TR: test kullanıcısı)."""

    id: int
    username: str
    password: str
    role: str


ADMIN = User(id=1, username="admin", password="admin123", role="admin")
SELCUK = User(id=2, username="selcuk", password="Selcuk!2026", role="user")
AYSE = User(id=3, username="ayse", password="ayse2026", role="user")


# Short bilingual UI labels used by the CLI and the report.
# TR: CLI ve raporda kullanılan kısa iki dilli metinler.
LABELS: dict[str, dict[str, str]] = {
    "tr": {
        "secureshop": "SecureShop (güvenli hedef)",
        "juiceshop": "OWASP Juice Shop (zafiyetli hedef)",
        "report_title": "SecureQA Güvenlik Raporu",
    },
    "en": {
        "secureshop": "SecureShop (secure target)",
        "juiceshop": "OWASP Juice Shop (vulnerable target)",
        "report_title": "SecureQA Security Report",
    },
}
