"""A small, readable CSRF protection (TR: siteler arası istek sahteciliği koruması).

How CSRF works: you are logged in to shop.example. A malicious page you visit contains a
hidden form that POSTs to ``shop.example/account/email``. Your browser attaches your session
cookie automatically, so without protection the shop would change your e-mail.

Defence ("synchronizer token pattern"):

1. Each session gets a random secret token (``session["csrf_token"]``).
2. Every form we render includes it as a hidden field ``csrf_token``.
3. Every state-changing request (POST/PUT/PATCH/DELETE) must send the same token back,
   either as that form field or as an ``X-CSRF-Token`` header (for ``fetch``).
4. The evil site cannot read our pages (Same-Origin Policy), so it cannot know the token.

SameSite=Lax cookies (see ``__init__.py``) are a second, independent layer.
"""

from __future__ import annotations

import hmac
import secrets
from typing import Any, Callable

from flask import Flask, abort, current_app, request, session

SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
_exempt_endpoints: set[str] = set()


def generate_csrf_token() -> str:
    """Return the session's CSRF token, creating it on first use."""
    token = session.get("csrf_token")
    if not isinstance(token, str):
        token = secrets.token_urlsafe(32)  # 256 bits of randomness
        session["csrf_token"] = token
    return token


def csrf_exempt(view: Callable[..., Any]) -> Callable[..., Any]:
    """Mark a view as not needing a token (only for test helpers without a browser session)."""
    _exempt_endpoints.add(f"{view.__module__}.{view.__name__}")
    return view


def _is_exempt() -> bool:
    """True when the view handling this request was decorated with ``@csrf_exempt``."""
    if request.endpoint is None:
        return False
    view = current_app.view_functions.get(request.endpoint)
    return view is not None and f"{view.__module__}.{view.__name__}" in _exempt_endpoints


def check_csrf() -> None:
    """``before_request`` hook: reject unsafe requests whose token is missing or wrong."""
    if request.method in SAFE_METHODS or _is_exempt():
        return
    if request.routing_exception is not None:
        return  # unknown URL / wrong method: let Flask answer 404 / 405 instead
    expected = session.get("csrf_token")
    sent = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")
    # SECURITY: hmac.compare_digest compares in constant time, so an attacker cannot guess
    # the token character by character by measuring response times.
    if not expected or not sent or not hmac.compare_digest(str(expected), str(sent)):
        abort(400, description="csrf")


def init_app(app: Flask) -> None:
    """Register the hook and make ``csrf_token()`` available in every template."""
    app.before_request(check_csrf)
    app.jinja_env.globals["csrf_token"] = generate_csrf_token
