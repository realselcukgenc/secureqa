"""Authentication & authorization helpers (TR: kimlik doğrulama ve yetkilendirme).

* Passwords are hashed with werkzeug (scrypt + random salt).
* Login state lives in Flask's signed session cookie: we store only ``user_id``.
* The user's *role* is always read fresh from the database on each request — never from
  a cookie, a form field or the URL. (Trusting a client-side ``role=admin`` cookie is a
  classic Broken Access Control bug, OWASP A01.)
"""

from __future__ import annotations

import re
import secrets
from functools import wraps
from typing import Any, Callable, TypeVar
from urllib.parse import urlsplit

from flask import Flask, abort, g, redirect, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from .db import execute, query

F = TypeVar("F", bound=Callable[..., Any])

# A hash of a random throw-away password. Used when the username does not exist so that
# a login attempt for an unknown user takes as long as one for a real user.
# SECURITY: prevents "timing-based user enumeration".
_DUMMY_HASH = generate_password_hash(secrets.token_hex(16))

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,20}$")
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,189}\.[A-Za-z]{2,}$")


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
def get_user_by_id(user_id: int) -> Any:
    """Return the user row for ``user_id`` or None."""
    return query("SELECT * FROM users WHERE id = ?", (user_id,), one=True)


def verify_credentials(username: str, password: str) -> Any:
    """Return the user row when username + password are correct, otherwise None.

    SECURITY: we always run exactly one password-hash check, whether the user exists or not,
    and the caller shows ONE generic error message. Attackers cannot learn which usernames exist.
    """
    user = query("SELECT * FROM users WHERE username = ?", (username,), one=True)
    hash_to_check = user["password_hash"] if user else _DUMMY_HASH
    password_ok = check_password_hash(hash_to_check, password)
    return user if (user and password_ok) else None


def password_problems(password: str, username: str = "") -> list[str]:
    """Check the password policy and return a list of i18n keys for every broken rule.

    SECURITY: weak passwords are the easiest way in (OWASP A07). Policy:
    at least 8 characters, at least one letter, at least one digit, not equal to the username,
    and not one of a few very common passwords.
    """
    problems: list[str] = []
    if len(password) < 8:
        problems.append("pw_rule_length")
    if len(password) > 128:
        problems.append("pw_rule_max")
    if not re.search(r"[A-Za-zÇĞİÖŞÜçğıöşü]", password):
        problems.append("pw_rule_letter")
    if not re.search(r"\d", password):
        problems.append("pw_rule_digit")
    if username and password.lower() == username.lower():
        problems.append("pw_rule_username")
    if password.lower() in {"password1", "12345678", "qwerty123", "sifre123", "password123"}:
        problems.append("pw_rule_common")
    return problems


def create_user(username: str, email: str, password: str) -> int:
    """Insert a new normal user (role is ALWAYS 'user' — never taken from the form)."""
    return execute(
        "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'user')",
        (username, email, generate_password_hash(password)),
    )


# ---------------------------------------------------------------------------
# Session handling
# ---------------------------------------------------------------------------
def login_user(user: Any) -> None:
    """Start a fresh session for ``user``.

    SECURITY: ``session.clear()`` first, so any data an attacker planted before login
    (session fixation) is thrown away; then we store only the numeric user id. The cart is
    kept so a guest does not lose it when logging in.
    """
    cart = session.get("cart", {})
    lang = session.get("lang")
    session.clear()
    session["user_id"] = int(user["id"])
    session["cart"] = cart
    if lang:
        session["lang"] = lang
    session.permanent = True  # use PERMANENT_SESSION_LIFETIME (2 hours)


def logout_user() -> None:
    """Forget everything about the current session."""
    session.clear()


def load_current_user() -> None:
    """``before_request`` hook: put the logged-in user (or None) on ``g.user``."""
    g.user = None
    user_id = session.get("user_id")
    if isinstance(user_id, int):
        g.user = get_user_by_id(user_id)
        if g.user is None:  # user was deleted (e.g. DB reset) -> drop the stale session
            session.clear()


def is_admin() -> bool:
    """True when the current user has the admin role *according to the database*."""
    return bool(g.get("user")) and g.user["role"] == "admin"


def safe_next_url(target: str | None, fallback: str = "/") -> str:
    """Return ``target`` only if it is a local path, otherwise ``fallback``.

    SECURITY: prevents open redirects (``/login?next=https://evil.example``). We accept
    "/account" but reject "https://x", "//x" (protocol-relative) and "/\\x" (browser quirk).
    """
    if not target:
        return fallback
    parts = urlsplit(target)
    if parts.scheme or parts.netloc or not target.startswith("/") or target.startswith("//") \
            or "\\" in target:
        return fallback
    return target


# ---------------------------------------------------------------------------
# Decorators for views
# ---------------------------------------------------------------------------
def login_required(view: F) -> F:
    """Redirect anonymous visitors to the login page (and come back afterwards)."""

    @wraps(view)
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        if g.get("user") is None:
            return redirect(url_for("auth.login", next=request.full_path.rstrip("?")))
        return view(*args, **kwargs)

    return wrapped  # type: ignore[return-value]


def admin_required(view: F) -> F:
    """Allow only admins. Anonymous → login page, logged-in non-admin → 403 Forbidden.

    SECURITY: the check runs on the server for every request (OWASP A01 Broken Access Control).
    Hiding the admin link in the menu is UX, not security.
    """

    @wraps(view)
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        if g.get("user") is None:
            return redirect(url_for("auth.login", next=request.path))
        if not is_admin():
            abort(403)
        return view(*args, **kwargs)

    return wrapped  # type: ignore[return-value]


def init_app(app: Flask) -> None:
    """Register the hooks and template helpers of this module."""
    app.before_request(load_current_user)
    app.jinja_env.globals["is_admin"] = is_admin
