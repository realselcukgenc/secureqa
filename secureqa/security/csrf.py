"""Helper to read SecureShop's CSRF token so API-level tests can submit real POSTs.

SecureShop protects every state-changing POST with a synchronizer token (field
``csrf_token`` or header ``X-CSRF-Token``). To *exercise* a protected endpoint from the
``requests`` layer we must first fetch a page, pick up the session cookie and read the
token, then send it back. (TR: Korunan uçları test etmek için önce token'ı okuruz.)

This does NOT weaken the test: the cross-site CSRF check deliberately sends *no* token.
"""

from __future__ import annotations

import re

import requests

# The token appears both in a <meta name="csrf-token"> tag and in hidden form fields.
_META_RE = re.compile(r'<meta[^>]+name=["\']csrf-token["\'][^>]+content=["\']([^"\']+)["\']', re.IGNORECASE)
_INPUT_RE = re.compile(r'<input[^>]+name=["\']csrf_token["\'][^>]+value=["\']([^"\']+)["\']', re.IGNORECASE)


def extract_token(html: str) -> str | None:
    """Return the CSRF token found in a page's HTML, or ``None``."""
    match = _META_RE.search(html) or _INPUT_RE.search(html)
    return match.group(1) if match else None


def fetch_token(session: requests.Session, base_url: str, path: str = "/login") -> str | None:
    """GET ``path`` to establish a session and read its CSRF token.

    The returned token is valid only together with the cookies now stored on ``session``.
    """
    response = session.get(base_url + path, timeout=5)
    return extract_token(response.text)


def post(
    session: requests.Session,
    base_url: str,
    path: str,
    data: dict,
    token_path: str = "/login",
    **kwargs,
) -> requests.Response:
    """POST ``data`` to ``path`` with a fresh CSRF token sent as the ``X-CSRF-Token`` header.

    A convenience wrapper so tests can submit a legitimate, token-bearing request.
    """
    token = fetch_token(session, base_url, token_path)
    headers = dict(kwargs.pop("headers", {}))
    if token:
        headers["X-CSRF-Token"] = token
        data = {**data, "csrf_token": token}
    return session.post(base_url + path, data=data, headers=headers, timeout=5, **kwargs)
