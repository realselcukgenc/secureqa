"""Checks for secure cookie flags (TR: çerez güvenlik bayrakları kontrolü).

We look at the raw ``Set-Cookie`` header because the ``requests`` cookie jar hides the
``HttpOnly`` and ``SameSite`` flags, which are exactly what we want to inspect.
(TR: requests çerez kavanozu HttpOnly/SameSite bayraklarını gizler, bu yüzden ham başlığa bakarız.)
"""

from __future__ import annotations

from dataclasses import dataclass

import requests


@dataclass
class CookieFlags:
    """The security-relevant flags parsed from one ``Set-Cookie`` header."""

    name: str
    raw: str
    http_only: bool
    same_site: str | None
    secure: bool

    def is_insecure(self) -> bool:
        """A session cookie is considered insecure if HttpOnly OR SameSite is missing.

        (We ignore the ``Secure`` flag here because the demo app runs over plain HTTP.)
        """
        return not self.http_only or self.same_site is None


def parse_set_cookie(raw: str) -> CookieFlags:
    """Parse one raw ``Set-Cookie`` header string into :class:`CookieFlags`."""
    parts = [segment.strip() for segment in raw.split(";")]
    name = parts[0].split("=", 1)[0] if parts else ""
    lowered = [segment.lower() for segment in parts]
    same_site: str | None = None
    for segment in parts:
        if segment.lower().startswith("samesite="):
            same_site = segment.split("=", 1)[1]
    return CookieFlags(
        name=name,
        raw=raw,
        http_only="httponly" in lowered,
        same_site=same_site,
        secure="secure" in lowered,
    )


def get_set_cookie_headers(response: requests.Response) -> list[str]:
    """Return every ``Set-Cookie`` header from a response (there can be several)."""
    # urllib3 exposes multiple Set-Cookie values via get_all / getlist.
    raw_headers = response.raw.headers
    if hasattr(raw_headers, "get_all"):
        values = raw_headers.get_all("Set-Cookie")  # type: ignore[attr-defined]
    else:  # pragma: no cover - fallback for odd adapters
        values = response.headers.get("Set-Cookie")
        values = [values] if values else []
    return list(values or [])


def session_cookie_flags(response: requests.Response, cookie_name: str = "session") -> CookieFlags | None:
    """Find the flags of the session cookie in a response, or ``None`` if it is not set."""
    for raw in get_set_cookie_headers(response):
        flags = parse_set_cookie(raw)
        if flags.name == cookie_name:
            return flags
    return None
