"""Defensive regression checks for SecureShop headers and cookies — OWASP A05:2021.

Against a *secure* app these checks should PASS. Each one records a :class:`Check`
(pass/fail) that the HTML report shows in the SecureShop section.
(TR: Güvenli uygulamada bu kontroller GEÇER; her biri rapora bir "kontrol" olarak işlenir.)
"""

from __future__ import annotations

import pytest

from secureqa.checks import Check
from secureqa.security import cookies, headers

pytestmark = [pytest.mark.security, pytest.mark.owasp_a05]


def test_security_headers_present(api, base_url, record_check) -> None:
    """CSP, X-Frame-Options and X-Content-Type-Options must all be set."""
    report = headers.inspect(api, base_url + "/")
    present = report.present()
    missing = report.missing()
    for name in headers.EXPECTED_HEADERS:
        ok = name in present
        record_check(
            Check(
                id=f"HDR-{name.upper().replace('-', '')}",
                title_tr=f"Güvenlik başlığı mevcut: {name}",
                title_en=f"Security header present: {name}",
                category="Headers",
                passed=ok,
                detail=(f"{name}: {report.headers.get(name)!r}" if ok else f"{name} missing"),
            )
        )
    assert not missing, f"SecureShop is missing security headers: {missing}"


def test_server_banner_is_quiet(api, base_url, record_check) -> None:
    """Informational: the Server header should not advertise a version (recorded, not fatal)."""
    report = headers.inspect(api, base_url + "/")
    leaks = report.banner_leaks_version()
    record_check(
        Check(
            id="HDR-SERVER-BANNER",
            title_tr="Sunucu başlığı sürüm sızdırmıyor",
            title_en="Server banner hides version",
            category="Headers",
            passed=not leaks,
            detail=f"Server: {report.server_banner()!r}",
        )
    )
    # Informational only — the built-in dev server may still send a banner, so no hard assert.


def test_session_cookie_is_hardened(api, base_url, record_check) -> None:
    """The session cookie must be HttpOnly and have SameSite set."""
    response = api.post(
        base_url + "/login",
        data={"username": "selcuk", "password": "Selcuk!2026"},
        timeout=5,
        allow_redirects=False,
    )
    flags = cookies.session_cookie_flags(response)
    if flags is None:
        pytest.skip("No session cookie issued on login; cannot inspect flags.")
    ok = not flags.is_insecure()
    record_check(
        Check(
            id="COOKIE-FLAGS",
            title_tr="Oturum çerezi HttpOnly + SameSite",
            title_en="Session cookie is HttpOnly + SameSite",
            category="Cookies",
            passed=ok,
            detail=f"HttpOnly={flags.http_only}, SameSite={flags.same_site}",
        )
    )
    assert ok, f"Session cookie is not hardened: {flags.raw!r}"
