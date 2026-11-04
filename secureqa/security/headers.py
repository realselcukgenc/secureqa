"""Checks for HTTP security response headers (TR: HTTP güvenlik başlıkları kontrolü)."""

from __future__ import annotations

from dataclasses import dataclass

import requests

# The headers we expect a secure application to send, with a short reason.
# TR: Güvenli uygulamanın göndermesi gereken başlıklar ve nedenleri.
EXPECTED_HEADERS: dict[str, str] = {
    "Content-Security-Policy": "Limits where scripts/styles can load from (stops many XSS).",
    "X-Frame-Options": "Stops the page being framed by another site (clickjacking).",
    "X-Content-Type-Options": "Stops the browser from MIME-sniffing (should be 'nosniff').",
}


@dataclass
class HeaderReport:
    """Result of inspecting the response headers of one URL."""

    url: str
    headers: dict[str, str]

    def missing(self) -> list[str]:
        """Names of the expected security headers that are absent."""
        return [name for name in EXPECTED_HEADERS if name not in self.headers]

    def present(self) -> list[str]:
        return [name for name in EXPECTED_HEADERS if name in self.headers]

    def server_banner(self) -> str:
        """Value of the ``Server`` header (empty string if not sent)."""
        return self.headers.get("Server", "")

    def banner_leaks_version(self) -> bool:
        """True when the Server banner contains a version number (e.g. 'Werkzeug/3.1')."""
        banner = self.server_banner()
        return any(character.isdigit() for character in banner) and banner != ""


def inspect(session: requests.Session, url: str) -> HeaderReport:
    """Fetch ``url`` and return a :class:`HeaderReport` of its response headers.

    ``allow_redirects=True`` so we see the headers of the final page a user lands on.
    (TR: Adresi ister ve yanıt başlıklarını döndürür.)
    """
    response = session.get(url, timeout=5)
    # requests gives a case-insensitive mapping; copy to a normal dict for the report.
    return HeaderReport(url=url, headers=dict(response.headers))
