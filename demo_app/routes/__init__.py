"""Blueprints (groups of routes) + error pages (TR: rotalar ve hata sayfaları).

| Blueprint | File        | Routes                                                         |
|-----------|-------------|----------------------------------------------------------------|
| shop      | shop.py     | /, /products, /product/<id>, POST /product/<id>/review        |
| auth      | auth.py     | /login, /logout, /register                                     |
| account   | account.py  | /account, POST /account/email, /orders/<id>                   |
| cart      | cart.py     | /cart, POST /cart/add/<id>, /cart/update, /cart/remove, /checkout |
| admin     | admin.py    | /admin                                                         |
| api       | api.py      | /api/products, /api/me, /healthz, /robots.txt, POST /__reset  |
"""

from __future__ import annotations

from typing import Any

from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import HTTPException, InternalServerError

from ..i18n import t
from .account import bp as account_bp
from .admin import bp as admin_bp
from .api import bp as api_bp
from .auth import bp as auth_bp
from .cart import bp as cart_bp
from .cart import cart_count
from .shop import bp as shop_bp

# status code -> (emoji, i18n title key, i18n message key)
ERROR_INFO: dict[int, tuple[str, str, str]] = {
    400: ("🧐", "err_400_title", "err_400_msg"),
    403: ("🔒", "err_403_title", "err_403_msg"),
    404: ("🧭", "err_404_title", "err_404_msg"),
    405: ("🚫", "err_405_title", "err_405_msg"),
    413: ("📦", "err_413_title", "err_413_msg"),
    429: ("⏳", "err_429_title", "err_429_msg"),
    500: ("🛠️", "err_500_title", "err_500_msg"),
}


def _wants_json() -> bool:
    """API clients get JSON errors, browsers get a pretty HTML page."""
    return request.path.startswith("/api/") or request.accept_mimetypes.best == "application/json"


def handle_http_error(err: HTTPException) -> Any:
    """Render every HTTP error (404, 403 ...) with our friendly template."""
    code = err.code or 500
    emoji, title_key, msg_key = ERROR_INFO.get(code, ERROR_INFO[500])
    if code == 400 and err.description == "csrf":
        msg_key = "err_csrf_msg"
    if _wants_json():
        return jsonify({"error": t(title_key), "status": code}), code
    return render_template("error.html", code=code, emoji=emoji, title=t(title_key), message=t(msg_key)), code


def handle_unexpected_error(err: Exception) -> Any:
    """Any crash → generic 500 page.

    SECURITY: we never show the exception text or a traceback to the visitor (they can reveal
    file paths, SQL, library versions). The details go to the server log instead.
    """
    from flask import current_app

    current_app.logger.exception("Unhandled error: %s", err)
    return handle_http_error(InternalServerError())


def register_blueprints(app: Flask) -> None:
    """Attach all blueprints, error handlers and template context to ``app``."""
    for bp in (shop_bp, auth_bp, account_bp, cart_bp, admin_bp, api_bp):
        app.register_blueprint(bp)
    app.register_error_handler(HTTPException, handle_http_error)
    app.register_error_handler(Exception, handle_unexpected_error)

    @app.context_processor
    def inject_cart_count() -> dict[str, Any]:
        """Make ``cart_count`` available in every template (badge in the header)."""
        return {"cart_count": cart_count()}
