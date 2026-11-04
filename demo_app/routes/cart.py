"""Shopping cart and (fake) checkout (TR: sepet ve demo ödeme).

The cart lives in the signed session cookie as ``{"<product_id>": qty}``. Only ids and
quantities are stored — prices are ALWAYS re-read from the database.
SECURITY: never trust a price (or total) that comes from the browser; a user can edit
any hidden field or cookie value before submitting.
"""

from __future__ import annotations

import re
from datetime import date
from typing import Any

from flask import Blueprint, flash, g, jsonify, redirect, render_template, request, session, url_for

from .. import catalog
from ..auth import login_required
from ..db import get_db
from ..i18n import t

bp = Blueprint("cart", __name__)

MAX_QTY = 10
# The ONLY card number this demo accepts (the well-known public test number).
DEMO_CARD = "4242424242424242"


# ---------------------------------------------------------------------------
# Cart helpers
# ---------------------------------------------------------------------------
def get_cart() -> dict[str, int]:
    """Return the cart from the session, dropping anything malformed."""
    raw = session.get("cart", {})
    if not isinstance(raw, dict):
        return {}
    clean: dict[str, int] = {}
    for key, qty in raw.items():
        if str(key).isdigit() and isinstance(qty, int) and 0 < qty <= MAX_QTY:
            clean[str(key)] = qty
    return clean


def save_cart(cart: dict[str, int]) -> None:
    """Store the cart back in the session."""
    session["cart"] = cart
    session.modified = True


def cart_count() -> int:
    """Total number of items (for the header badge)."""
    return sum(get_cart().values())


def cart_lines() -> tuple[list[dict[str, Any]], int]:
    """Cart lines with product data and line totals, plus the grand total (in kuruş)."""
    lines: list[dict[str, Any]] = []
    total = 0
    for key, qty in get_cart().items():
        product = catalog.get_product(int(key))
        if product is None:  # product was removed meanwhile
            continue
        line_total = product["price"] * qty
        lines.append({"product": product, "qty": qty, "total": line_total})
        total += line_total
    return lines, total


def _parse_qty(value: str | None, default: int = 1) -> int:
    """Read a quantity from the form and clamp it to 1..MAX_QTY."""
    try:
        qty = int(value) if value is not None else default
    except ValueError:
        qty = default
    return max(1, min(MAX_QTY, qty))


def _wants_json() -> bool:
    """True for our fetch() calls (they send Accept: application/json)."""
    return request.accept_mimetypes.best == "application/json"


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------
@bp.get("/cart")
def view() -> str:
    """Show the cart."""
    lines, total = cart_lines()
    return render_template("cart.html", lines=lines, total=total)


@bp.post("/cart/add/<int:product_id>")
def add(product_id: int) -> Any:
    """Add a product (field ``qty``, default 1). Answers JSON for fetch(), else redirects."""
    product = catalog.get_product(product_id)
    if product is None or product["stock"] <= 0:
        if _wants_json():
            return jsonify({"ok": False, "message": t("cannot_add")}), 400
        flash(t("cannot_add"), "error")
        return redirect(url_for("shop.products"))
    cart = get_cart()
    key = str(product_id)
    cart[key] = min(MAX_QTY, cart.get(key, 0) + _parse_qty(request.form.get("qty")))
    save_cart(cart)
    message = t("added_to_cart", name=product["name"])
    if _wants_json():
        return jsonify({"ok": True, "message": message, "count": cart_count()})
    flash(message, "success")
    return redirect(url_for("cart.view"))


@bp.post("/cart/update/<int:product_id>")
def update(product_id: int) -> Any:
    """Change the quantity of one cart line."""
    cart = get_cart()
    if str(product_id) in cart:
        cart[str(product_id)] = _parse_qty(request.form.get("qty"))
        save_cart(cart)
    return redirect(url_for("cart.view"))


@bp.post("/cart/remove/<int:product_id>")
def remove(product_id: int) -> Any:
    """Remove one line from the cart."""
    cart = get_cart()
    cart.pop(str(product_id), None)
    save_cart(cart)
    flash(t("removed_from_cart"), "info")
    return redirect(url_for("cart.view"))


def _validate_checkout(form: dict[str, str]) -> list[str]:
    """Check the checkout fields and return a list of error messages (empty = OK)."""
    errors: list[str] = []
    if not 2 <= len(form["ship_name"]) <= 80:
        errors.append(t("err_name"))
    if not 5 <= len(form["ship_address"]) <= 200:
        errors.append(t("err_address"))
    if not 2 <= len(form["ship_city"]) <= 60:
        errors.append(t("err_city"))
    # SECURITY/PRIVACY: only the public test card is accepted, so nobody can type a real
    # card number into a demo by mistake and have it processed.
    if re.sub(r"[\s-]", "", form["card_number"]) != DEMO_CARD:
        errors.append(t("err_card"))
    match = re.fullmatch(r"(\d{2})/(\d{2})", form["card_exp"])
    today = date.today()
    if not match or not 1 <= int(match.group(1)) <= 12 or \
            (2000 + int(match.group(2)), int(match.group(1))) < (today.year, today.month):
        errors.append(t("err_exp"))
    if not re.fullmatch(r"\d{3,4}", form["card_cvc"]):
        errors.append(t("err_cvc"))
    return errors


@bp.route("/checkout", methods=["GET", "POST"])
@login_required
def checkout() -> Any:
    """Fake checkout: shipping form + demo payment form (``#checkout-btn``).

    On success the order is saved, the cart is emptied and the browser is redirected to
    ``/orders/<id>`` which shows ``#order-confirmation`` (Post/Redirect/Get pattern: a page
    refresh will not place the order twice).
    """
    lines, total = cart_lines()
    if not lines:
        flash(t("cart_empty"), "info")
        return redirect(url_for("cart.view"))

    user = g.user
    if request.method == "GET":
        form = {"ship_name": user["full_name"] or user["username"], "ship_address": "",
                "ship_city": user["city"], "ship_phone": "",
                "card_number": "4242 4242 4242 4242", "card_exp": "12/30", "card_cvc": "123"}
        return render_template("checkout.html", lines=lines, total=total, form=form, errors=[])

    fields = ("ship_name", "ship_address", "ship_city", "ship_phone", "card_number", "card_exp", "card_cvc")
    form = {f: request.form.get(f, "").strip()[:200] for f in fields}
    errors = _validate_checkout(form)
    if errors:
        return render_template("checkout.html", lines=lines, total=total, form=form, errors=errors), 400

    # One transaction: either the order AND all its items are saved, or nothing is.
    conn = get_db()
    with conn:
        cur = conn.execute(
            "INSERT INTO orders (user_id, total, ship_name, ship_address, ship_city, card_last4) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (user["id"], total, form["ship_name"], form["ship_address"], form["ship_city"], DEMO_CARD[-4:]),
        )
        order_id = int(cur.lastrowid or 0)
        conn.executemany(
            "INSERT INTO order_items (order_id, product_id, qty, unit_price) VALUES (?, ?, ?, ?)",
            [(order_id, line["product"]["id"], line["qty"], line["product"]["price"]) for line in lines],
        )
    save_cart({})
    session["just_placed"] = order_id
    return redirect(url_for("account.order", order_id=order_id))
