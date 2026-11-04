"""SecureShop — a small, *securely built* Flask e-commerce demo (TR: güvenli demo mağaza).

This package is the "functional target" of the SecureQA project: the test suite runs
defensive regression checks against it (security headers, cookie flags, CSRF, access
control, output escaping, rate limiting ...). It contains NO intentional vulnerabilities.

Start it with::

    python -m demo_app            # http://127.0.0.1:5000

The ``create_app()`` function below is an *application factory*: instead of one global
``app`` object, every call builds a fresh, fully configured app. Tests love this, because
each test can create its own app with its own temporary database.
"""

from __future__ import annotations

import os
import secrets
from datetime import timedelta
from pathlib import Path
from typing import Any

from flask import Flask

from . import db, i18n, security
from .auth import init_app as init_auth
from .csrf import init_app as init_csrf

__all__ = ["create_app"]

APP_NAME = "SecureShop"


def _env_flag(name: str) -> bool:
    """True when an environment variable is set to 1/true/yes (case-insensitive)."""
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


def _load_secret_key(instance_path: Path) -> str:
    """Return the key Flask uses to sign the session cookie.

    SECURITY: the secret key must be long, random and private — whoever knows it can forge
    session cookies (and become admin). We read it from ``SHOP_SECRET_KEY`` or generate one
    with ``secrets`` (a cryptographically secure generator) and keep it in the instance folder,
    which is git-ignored. We never hard-code it in the source.
    """
    from_env = os.environ.get("SHOP_SECRET_KEY")
    if from_env:
        return from_env
    key_file = instance_path / "secret_key"
    if key_file.exists():
        return key_file.read_text(encoding="utf-8").strip()
    instance_path.mkdir(parents=True, exist_ok=True)
    key = secrets.token_hex(32)
    key_file.write_text(key, encoding="utf-8")
    try:
        key_file.chmod(0o600)  # only the owner may read it
    except OSError:
        pass
    return key


def create_app(test_config: dict[str, Any] | None = None) -> Flask:
    """Build and return the SecureShop Flask application.

    Args:
        test_config: optional settings that override the defaults (used by tests,
            e.g. ``{"DATABASE": "/tmp/x.sqlite", "TESTING": True}``).
    """
    app = Flask(__name__, instance_relative_config=True)
    instance = Path(app.instance_path)
    testing = _env_flag("SHOP_TESTING") or _env_flag("VULNSHOP_TESTING")

    app.config.from_mapping(
        APP_NAME=APP_NAME,
        SECRET_KEY=_load_secret_key(instance),
        DATABASE=os.environ.get("SHOP_DB") or str(instance / "secureshop.sqlite"),
        TESTING=testing,
        # POST /__reset (wipe + re-seed DB) exists ONLY when this is True.
        ENABLE_RESET=testing,
        # SECURITY: session cookie flags.
        #   HttpOnly  -> JavaScript cannot read the cookie (stolen-by-XSS protection)
        #   SameSite  -> the browser does not send it on cross-site POSTs (CSRF defence in depth)
        #   Secure    -> only sent over HTTPS. Off by default because the demo runs on plain
        #                http://127.0.0.1; turn on with SHOP_SECURE_COOKIES=1 behind HTTPS.
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=_env_flag("SHOP_SECURE_COOKIES"),
        # SECURITY: sessions expire; a stolen cookie is not valid forever.
        PERMANENT_SESSION_LIFETIME=timedelta(hours=2),
        # SECURITY: reject huge request bodies (simple DoS protection).
        MAX_CONTENT_LENGTH=64 * 1024,
        # SECURITY: login brute-force protection — max failed attempts per window (seconds).
        LOGIN_RATE_LIMIT=5,
        LOGIN_RATE_WINDOW=60,
    )
    if test_config:
        app.config.update(test_config)

    # Jinja autoescape is ON for .html templates by default in Flask — we keep it that way.
    # SECURITY: it turns <script> in user input into &lt;script&gt; (XSS protection).
    app.jinja_env.autoescape = True

    db.init_app(app)
    i18n.init_app(app)
    init_auth(app)
    init_csrf(app)
    security.init_app(app)

    from .routes import register_blueprints

    register_blueprints(app)
    return app
