"""Small JSON API + health check + test helper (TR: JSON API ve yardımcılar)."""

from __future__ import annotations

from typing import Any

from flask import Blueprint, Response, abort, current_app, g, jsonify, request, session

from .. import catalog
from ..csrf import csrf_exempt
from ..db import init_db

bp = Blueprint("api", __name__)


def _product_json(p: dict[str, Any]) -> dict[str, Any]:
    """Only the public fields of a product (allow-list, so new DB columns never leak)."""
    return {
        "id": p["id"],
        "name": p["name"],
        "name_tr": p["name_tr"],
        "name_en": p["name_en"],
        "category": p["category"],
        "price": p["price"] / 100,      # TL as a number, e.g. 890.0
        "price_kurus": p["price"],      # exact integer value
        "currency": "TRY",
        "rating": p["rating"],
        "review_count": p["review_count"],
        "in_stock": p["stock"] > 0,
    }


@bp.get("/api/products")
def api_products() -> Response:
    """``GET /api/products?q=`` → ``{"query": ..., "count": N, "products": [...]}``."""
    q = request.args.get("q", "").strip()[:80]
    products = catalog.search_products(q)
    return jsonify({"query": q, "count": len(products), "products": [_product_json(p) for p in products]})


@bp.get("/api/me")
def api_me() -> Any:
    """The logged-in user's own profile. 401 when not logged in.

    SECURITY: returns an allow-list of fields — never ``password_hash``.
    """
    if g.user is None:
        return jsonify({"error": "authentication required"}), 401
    u = g.user
    return jsonify({"id": u["id"], "username": u["username"], "email": u["email"], "role": u["role"]})


@bp.get("/healthz")
def healthz() -> Response:
    """Liveness check used by the test runner to know the server is up."""
    return jsonify({"status": "ok", "app": "SecureShop"})


@bp.get("/robots.txt")
def robots() -> Response:
    """robots.txt. SECURITY: it is public, so it must not list "secret" paths."""
    return Response("User-agent: *\nDisallow: /account\nDisallow: /cart\n", mimetype="text/plain")


@bp.post("/__reset")
@csrf_exempt  # called by the test runner (no browser session, no token)
def reset() -> Any:
    """Wipe and re-seed the database + rate limiters. Exists only when SHOP_TESTING=1.

    SECURITY: a destructive helper like this must never be reachable in production — so when
    the flag is off we answer 404, exactly as if the route did not exist.
    """
    if not current_app.config.get("ENABLE_RESET"):
        abort(404)
    init_db(current_app, reset=True)
    for key in ("login_limiter", "login_ip_limiter"):
        current_app.extensions[key].reset()
    session.clear()
    return jsonify({"status": "reset"})
