"""Helper to detect open redirects (TR: açık yönlendirme tespiti)."""

from __future__ import annotations

from urllib.parse import quote, urlparse

import requests


def is_external(location: str, our_host: str) -> bool:
    """True when ``location`` would send the user to a different host than ``our_host``.

    ``//evil.com`` and ``https://evil.com`` are external; ``/account`` is internal.
    (TR: Yönlendirme hedefi bizim alan adımızın dışına çıkıyor mu?)
    """
    if location.startswith("//"):
        return True
    parsed = urlparse(location)
    if parsed.scheme in ("http", "https") and parsed.netloc and parsed.netloc != our_host:
        return True
    return False


def check_open_redirect(
    session: requests.Session, base_url: str, target: str
) -> tuple[bool, str]:
    """Request ``/redirect?next=<target>`` and see whether it forwards us off-site.

    Returns ``(is_vulnerable, evidence)``.
    """
    url = f"{base_url}/redirect?next={quote(target, safe='')}"
    response = session.get(url, timeout=5, allow_redirects=False)
    location = response.headers.get("Location", "")
    our_host = urlparse(base_url).netloc
    vulnerable = response.status_code in (301, 302, 303, 307, 308) and is_external(location, our_host)
    evidence = f"HTTP {response.status_code}, Location: {location or '(none)'}"
    return vulnerable, evidence
