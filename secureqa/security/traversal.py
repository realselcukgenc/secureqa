"""Helper to detect path traversal in the file-download endpoint (TR: dizin atlatma)."""

from __future__ import annotations

from urllib.parse import quote

import requests

# The demo app hides a fake secret file; seeing its marker proves traversal worked.
# TR: Demo uygulamadaki sahte gizli dosyanın işareti; görünürse atlatma başarılı.
SECRET_MARKER = "SECRET"


def check_traversal(
    session: requests.Session, base_url: str, payload: str
) -> tuple[bool, str]:
    """Request ``/download?file=<payload>`` and see if we read the out-of-bounds secret.

    Returns ``(is_vulnerable, evidence)``. Vulnerable when the secret content comes back.
    """
    url = f"{base_url}/download?file={quote(payload, safe='')}"
    response = session.get(url, timeout=5)
    body = response.text
    vulnerable = response.status_code == 200 and SECRET_MARKER in body
    snippet = body[:160].replace("\n", " ")
    evidence = f"payload={payload!r} -> HTTP {response.status_code}; body starts: {snippet!r}"
    return vulnerable, evidence
