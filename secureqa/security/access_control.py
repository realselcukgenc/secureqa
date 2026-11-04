"""Helpers for access-control checks: IDOR and broken authorization (TR: erişim kontrolü)."""

from __future__ import annotations

import requests


def fetch(session: requests.Session, url: str) -> requests.Response:
    """GET a URL without following redirects, so we can see 302/401/403 clearly."""
    return session.get(url, timeout=5, allow_redirects=False)


def resource_is_exposed(response: requests.Response, secret_marker: str) -> bool:
    """True when a 200 response actually contains the protected data (``secret_marker``).

    A safe app answers with 401/403, or redirects to login, or omits the secret.
    (TR: 200 dönüp gizli veriyi içeriyorsa korumasız demektir.)
    """
    if response.status_code != 200:
        return False
    return secret_marker.lower() in response.text.lower()


def admin_panel_via_cookie(base_url: str) -> tuple[bool, str]:
    """Try to open ``/admin`` with a forged ``role=admin`` cookie (no real login).

    Returns ``(is_vulnerable, evidence)``. Vulnerable when the admin panel appears.
    (TR: Gerçek giriş yapmadan 'role=admin' çerezi ile admin paneli açılıyor mu?)
    """
    session = requests.Session()
    session.cookies.set("role", "admin")
    response = session.get(base_url + "/admin", timeout=5, allow_redirects=False)
    body = response.text
    vulnerable = response.status_code == 200 and "admin-panel" in body
    evidence = f"HTTP {response.status_code} with forged cookie role=admin; " + (
        "admin panel markup present." if vulnerable else "panel not shown (good)."
    )
    return vulnerable, evidence
