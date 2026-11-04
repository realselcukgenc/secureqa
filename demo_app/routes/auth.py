"""Login, logout and registration (TR: giriş, çıkış, kayıt)."""

from __future__ import annotations

from typing import Any

from flask import Blueprint, current_app, flash, g, redirect, render_template, request, url_for

from ..auth import (EMAIL_RE, USERNAME_RE, create_user, get_user_by_id, login_user, logout_user,
                    password_problems, safe_next_url, verify_credentials)
from ..db import query
from ..i18n import t
from ..security import get_login_limiters

bp = Blueprint("auth", __name__)


def _client_ip() -> str:
    """The client's IP address as seen by this server.

    SECURITY: we do NOT trust the ``X-Forwarded-For`` header — any client can send it with a
    fake value to dodge the rate limit. (Behind a real reverse proxy you would configure
    werkzeug's ProxyFix with the exact number of trusted proxies.)
    """
    return request.remote_addr or "unknown"


@bp.route("/login", methods=["GET", "POST"])
def login() -> Any:
    """Show the login form / check the credentials.

    Security controls in this view:
      * generic error message for every failure (no user enumeration)
      * rate limit: 5 failed attempts per minute per IP+username → HTTP 429
      * session is regenerated on success (login_user)
      * the ``next`` parameter is validated (no open redirect)
    """
    next_url = safe_next_url(request.args.get("next"), fallback="/")
    if g.user is not None and request.method == "GET":
        return redirect(next_url if next_url != "/" else url_for("account.account"))

    if request.method == "GET":
        return render_template("login.html", error=None, username="", next_url=next_url)

    username = request.form.get("username", "").strip()[:50]
    password = request.form.get("password", "")[:128]
    account_limiter, ip_limiter = get_login_limiters(current_app)
    ip = _client_ip()
    account_key = f"{ip}|{username.lower()}"

    if account_limiter.is_limited(account_key) or ip_limiter.is_limited(ip):
        wait = max(account_limiter.retry_after(account_key), ip_limiter.retry_after(ip))
        html = render_template("login.html", error=t("login_rate_limited", s=wait),
                               username=username, next_url=next_url)
        # 429 = Too Many Requests; Retry-After tells well-behaved clients when to try again.
        return html, 429, {"Retry-After": str(wait)}

    user = verify_credentials(username, password) if username and password else None
    if user is None:
        account_limiter.hit(account_key)
        ip_limiter.hit(ip)
        # 200 + message (a 401 would require a WWW-Authenticate header, meant for HTTP auth).
        return render_template("login.html", error=t("login_error"), username=username,
                               next_url=next_url)

    account_limiter.reset(account_key)
    login_user(user)
    flash(t("welcome_back", name=user["username"]), "success")
    if next_url == "/" and user["role"] == "admin":
        next_url = url_for("admin.dashboard")
    return redirect(next_url)


@bp.route("/logout", methods=["GET", "POST"])
def logout() -> Any:
    """End the session and go home.

    Note: GET is kept because the test contract links to ``/logout``. The worst a forged
    cross-site logout can do is log you out (a nuisance, not a breach).
    """
    logout_user()
    flash(t("logged_out"), "info")
    return redirect(url_for("shop.index"))


@bp.route("/register", methods=["GET", "POST"])
def register() -> Any:
    """Create a new account. Errors are listed in ``#register-error``."""
    form = {"username": "", "email": ""}
    if request.method == "GET":
        return render_template("register.html", errors=[], form=form)

    username = request.form.get("username", "").strip()
    email = request.form.get("email", "").strip()
    password = request.form.get("password", "")
    form = {"username": username[:20], "email": email[:254]}

    errors: list[str] = []
    if not USERNAME_RE.fullmatch(username):
        errors.append(t("username_invalid"))
    if email and (len(email) > 254 or not EMAIL_RE.fullmatch(email)):
        errors.append(t("email_invalid"))
    errors += [t(key) for key in password_problems(password, username)]
    if not errors and query("SELECT 1 FROM users WHERE username = ?", (username,), one=True):
        errors.append(t("username_taken"))
    if errors:
        return render_template("register.html", errors=errors, form=form), 400

    user_id = create_user(username, email, password)
    login_user(get_user_by_id(user_id))
    flash(t("register_ok", name=username), "success")
    return redirect(url_for("account.account"))
