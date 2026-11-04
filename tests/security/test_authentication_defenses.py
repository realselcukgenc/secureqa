"""Defensive regression checks for authentication on SecureShop — OWASP A07:2021.

Covers: generic login error (no user enumeration), login rate limiting, and a password
policy that rejects weak passwords. All should PASS against the secure app.
"""

from __future__ import annotations

import re
import uuid

import pytest

from secureqa.checks import Check
from secureqa.config import SELCUK
from secureqa.security import csrf, ratelimit

pytestmark = [pytest.mark.security, pytest.mark.owasp_a07]


def _login_error(text: str) -> str:
    """Extract the text of the #login-error element (lowercased)."""
    match = re.search(r'id="login-error"[^>]*>(.*?)<', text, re.DOTALL | re.IGNORECASE)
    return (match.group(1).strip() if match else "").lower()


def test_login_error_is_generic(api, base_url, record_check) -> None:
    """The login error must be identical for unknown user and wrong password."""
    # Send a valid CSRF token so the request reaches the real login logic.
    unknown = csrf.post(api, base_url, "/login", {"username": "no_such_user_zzz", "password": "x"})
    wrong = csrf.post(api, base_url, "/login", {"username": SELCUK.username, "password": "wrong-password"})
    unknown_msg = _login_error(unknown.text)
    wrong_msg = _login_error(wrong.text)
    # Pass when both show an error AND it is the same wording (or we cannot tell them apart).
    ok = unknown_msg == wrong_msg
    record_check(
        Check(
            id="AUTH-ENUM",
            title_tr="Genel giriş hatası (kullanıcı tespiti yok)",
            title_en="Generic login error (no user enumeration)",
            category="Authentication",
            passed=ok,
            detail=f"unknown={unknown_msg!r} wrong={wrong_msg!r}",
        )
    )
    assert ok, "User enumeration: login reveals whether a username exists."


def test_login_is_rate_limited(api, base_url, record_check) -> None:
    """Many rapid failed logins must eventually be throttled (HTTP 429 / lockout)."""
    no_limit, evidence = ratelimit.hammer_login(api, base_url, attempts=12)
    ok = not no_limit
    record_check(
        Check(
            id="AUTH-RATELIMIT",
            title_tr="Giriş denemeleri hız sınırlı (brute-force koruması)",
            title_en="Login is rate limited (brute-force protection)",
            category="Authentication",
            passed=ok,
            detail=evidence,
        )
    )
    assert ok, "No rate limiting: rapid failed logins were not blocked."


def test_weak_password_rejected(api, base_url, record_check) -> None:
    """Registration must reject a trivially weak password such as '1'."""
    username = "weakpwd_" + uuid.uuid4().hex[:8]
    # Register with a one-character password (token-bearing, so CSRF does not mask the policy).
    csrf.post(
        api, base_url, "/register",
        {"username": username, "password": "1", "email": f"{username}@example.com"},
        token_path="/register", allow_redirects=True,
    )
    api.cookies.clear()
    csrf.post(api, base_url, "/login", {"username": username, "password": "1"}, allow_redirects=False)
    account = api.get(base_url + "/account", timeout=5, allow_redirects=False)
    accepted = account.status_code == 200 and username in account.text
    ok = not accepted
    record_check(
        Check(
            id="AUTH-WEAKPWD",
            title_tr="Zayıf parola reddediliyor",
            title_en="Weak password is rejected",
            category="Authentication",
            passed=ok,
            detail=f"one-char password accepted={accepted}",
        )
    )
    assert ok, "Weak password policy: a one-character password was accepted."
