"""Account page, e-mail change and order details (TR: hesabım ve siparişler)."""

from __future__ import annotations

from typing import Any

from flask import Blueprint, abort, flash, g, redirect, render_template, request, session, url_for

from ..auth import EMAIL_RE, is_admin, login_required
from ..catalog import shape
from ..db import execute, query
from ..i18n import t

bp = Blueprint("account", __name__)


def _orders_of(user_id: int) -> list[Any]:
    """All orders of one user with the number of items in each."""
    return query(
        "SELECT o.*, COALESCE(SUM(i.qty), 0) AS item_count FROM orders o "
        "LEFT JOIN order_items i ON i.order_id = o.id WHERE o.user_id = ? "
        "GROUP BY o.id ORDER BY o.created_at DESC, o.id DESC",
        (user_id,),
    )


@bp.get("/account")
@login_required
def account() -> str:
    """Profile of the logged-in user (``#account-username``, ``#account-email``)."""
    return render_template("account.html", orders=_orders_of(g.user["id"]), email_errors=[])


@bp.post("/account/email")
@login_required
def change_email() -> Any:
    """Change the e-mail address of the CURRENT user.

    SECURITY: protected by the CSRF token (csrf.py) and SameSite cookies. The user id comes
    from the session, never from the form, so nobody can change someone else's e-mail.
    """
    email = request.form.get("email", "").strip()
    if len(email) > 254 or not EMAIL_RE.fullmatch(email):
        return render_template("account.html", orders=_orders_of(g.user["id"]),
                               email_errors=[t("email_invalid")]), 400
    execute("UPDATE users SET email = ? WHERE id = ?", (email, g.user["id"]))
    flash(t("email_saved"), "success")
    return redirect(url_for("account.account"))


@bp.get("/orders/<int:order_id>")
@login_required
def order(order_id: int) -> Any:
    """Order detail — only for its owner (or an admin).

    SECURITY (IDOR / OWASP A01): changing the number in the URL must not reveal other
    customers' orders. For someone else's order we answer 404 "not found" instead of 403,
    so an attacker cannot even learn which order numbers exist.
    """
    row = query("SELECT * FROM orders WHERE id = ?", (order_id,), one=True)
    if row is None or (row["user_id"] != g.user["id"] and not is_admin()):
        abort(404)
    items = [
        {**shape(r), "qty": r["qty"], "unit_price": r["unit_price"]}
        for r in query(
            "SELECT p.*, i.qty, i.unit_price FROM order_items i JOIN products p ON p.id = i.product_id "
            "WHERE i.order_id = ? ORDER BY i.id",
            (order_id,),
        )
    ]
    just_placed = session.pop("just_placed", None) == order_id
    return render_template("order.html", order=row, items=items, just_placed=just_placed)
