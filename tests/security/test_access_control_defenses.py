"""Defensive regression checks for access control on SecureShop — OWASP A01:2021.

Covers: owner-only orders (no IDOR), authenticated-only ``/api/me`` with no sensitive
data leak, admin panel protected by the server-side session role (not a cookie), and
CSRF protection on the email-change form. All should PASS against the secure app.
"""

from __future__ import annotations

import pytest

from secureqa.checks import Check
from secureqa.config import AYSE, SELCUK
from secureqa.security import access_control

pytestmark = [pytest.mark.security, pytest.mark.owasp_a01]


def test_orders_are_owner_only(api_logged_in, base_url, record_check) -> None:
    """A logged-in user must NOT read another user's order (expect 403/404)."""
    session = api_logged_in(SELCUK.username, SELCUK.password)
    leaked_url = ""
    statuses: list[str] = []
    for order_id in range(1, 8):
        url = f"{base_url}/orders/{order_id}"
        response = session.get(url, timeout=5, allow_redirects=False)
        statuses.append(f"{order_id}:{response.status_code}")
        if response.status_code == 200 and AYSE.username in response.text.lower():
            leaked_url = url
            break
    ok = leaked_url == ""
    record_check(
        Check(
            id="IDOR-ORDERS",
            title_tr="Siparişler yalnızca sahibine görünür (IDOR yok)",
            title_en="Orders are owner-only (no IDOR)",
            category="Access Control",
            passed=ok,
            detail="statuses " + ", ".join(statuses),
        )
    )
    assert ok, f"IDOR: {SELCUK.username} could read another user's order at {leaked_url}"


def test_api_me_requires_auth(api, base_url, record_check) -> None:
    """`/api/me` must require a session and must not leak a password hash."""
    api.cookies.clear()
    response = api.get(base_url + "/api/me", timeout=5, allow_redirects=False)
    body_lower = response.text.lower()
    protected = response.status_code in (401, 403) or response.status_code in (301, 302)
    no_hash = "password_hash" not in body_lower and "password" not in body_lower
    ok = protected and no_hash
    record_check(
        Check(
            id="API-ME-AUTH",
            title_tr="/api/me kimlik doğrulaması ister, hassas veri sızdırmaz",
            title_en="/api/me requires auth, leaks no sensitive data",
            category="Access Control",
            passed=ok,
            detail=f"unauth HTTP {response.status_code}; password field present={not no_hash}",
        )
    )
    assert ok, f"/api/me is not properly protected (HTTP {response.status_code})."


def test_admin_panel_ignores_forged_cookie(base_url, record_check) -> None:
    """A forged `role=admin` cookie must NOT open the admin panel."""
    vulnerable, evidence = access_control.admin_panel_via_cookie(base_url)
    ok = not vulnerable
    record_check(
        Check(
            id="BAC-ADMIN-COOKIE",
            title_tr="Yönetici paneli sahte çereze güvenmiyor",
            title_en="Admin panel ignores forged cookie",
            category="Access Control",
            passed=ok,
            detail=evidence,
        )
    )
    assert ok, "Admin panel opened with a forged role=admin cookie."


def test_csrf_protection_on_email_change(api_logged_in, base_url, record_check) -> None:
    """A cross-site POST without a CSRF token must NOT change the email."""
    session = api_logged_in(SELCUK.username, SELCUK.password)
    new_email = "attacker@evil.example.com"
    response = session.post(
        base_url + "/account/email",
        data={"email": new_email},
        headers={"Origin": "https://evil.example.com", "Referer": "https://evil.example.com/"},
        timeout=5,
        allow_redirects=True,
    )
    account = session.get(base_url + "/account", timeout=5)
    changed = new_email in account.text
    ok = not changed
    record_check(
        Check(
            id="CSRF-EMAIL",
            title_tr="E-posta değişikliği CSRF korumalı",
            title_en="Email change is CSRF protected",
            category="CSRF",
            passed=ok,
            detail=f"cross-site POST HTTP {response.status_code}; email changed={changed}",
        )
    )
    assert ok, "CSRF: a cross-site request changed the account email."
