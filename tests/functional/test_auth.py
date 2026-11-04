"""Functional tests for login / logout (TR: giriş-çıkış işlevsel testleri).

These check that the app *works* for a normal user. They should pass in BOTH modes.
"""

from __future__ import annotations

import pytest

from secureqa.config import SELCUK
from secureqa.pages import AccountPage

pytestmark = pytest.mark.functional


def test_valid_login_succeeds(as_user, page, base_url) -> None:
    """A correct username + password logs the user in."""
    as_user(SELCUK.username, SELCUK.password)
    account = AccountPage(page, base_url)
    account.open()
    assert account.is_logged_in(), "Expected a logout link after logging in"
    assert SELCUK.username in account.shown_username()


def test_invalid_login_shows_error(login_page) -> None:
    """A wrong password keeps the user out and shows a (generic) error message."""
    login_page.login(SELCUK.username, "definitely-wrong")
    assert not login_page.is_logged_in()
    assert login_page.error_text() != "", "Expected a visible login error message"


def test_register_new_user(page, base_url) -> None:
    """A new user with a strong password can register and then log in."""
    import uuid

    from secureqa.pages import RegisterPage

    username = "func_" + uuid.uuid4().hex[:8]
    strong = "Str0ng!Pass2026"
    register = RegisterPage(page, base_url)
    register.register(username, strong, email=f"{username}@example.com")
    # Either we are logged in straight away, or we can log in now.
    if not register.is_logged_in():
        from secureqa.pages import LoginPage

        LoginPage(page, base_url).login(username, strong)
    assert register.is_logged_in(), "A newly registered user should be able to log in"


def test_logout_clears_session(as_user, page, base_url) -> None:
    """After logout the user is no longer logged in."""
    as_user()
    account = AccountPage(page, base_url)
    account.logout()
    account.open()
    assert not account.is_logged_in(), "User should be logged out"
