"""Admin dashboard (TR: yönetim paneli) — only for users whose DB role is 'admin'."""

from __future__ import annotations

from flask import Blueprint, render_template

from ..auth import admin_required
from ..catalog import shape
from ..db import query

bp = Blueprint("admin", __name__)


@bp.get("/admin")
@admin_required  # SECURITY: server-side role check from the database (see auth.py)
def dashboard() -> str:
    """Small stats, revenue per category (SVG bar chart), recent orders, users, low stock."""
    stats = {
        "revenue": query("SELECT COALESCE(SUM(total), 0) AS v FROM orders", one=True)["v"],
        "orders": query("SELECT COUNT(*) AS v FROM orders", one=True)["v"],
        "users": query("SELECT COUNT(*) AS v FROM users", one=True)["v"],
        "products": query("SELECT COUNT(*) AS v FROM products", one=True)["v"],
    }
    by_cat = query(
        "SELECT p.category, SUM(i.qty * i.unit_price) AS revenue FROM order_items i "
        "JOIN products p ON p.id = i.product_id GROUP BY p.category ORDER BY revenue DESC"
    )
    top = max((r["revenue"] for r in by_cat), default=0) or 1
    chart = [{"category": r["category"], "revenue": r["revenue"],
              "width": max(6, round(250 * r["revenue"] / top))} for r in by_cat]
    orders = query(
        "SELECT o.*, u.username FROM orders o JOIN users u ON u.id = o.user_id "
        "ORDER BY o.created_at DESC, o.id DESC LIMIT 10"
    )
    # Note: password_hash is deliberately NOT selected.
    users = query(
        "SELECT u.id, u.username, u.email, u.role, COUNT(o.id) AS order_count FROM users u "
        "LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id ORDER BY u.id"
    )
    low_stock = [shape(r) for r in query("SELECT * FROM products ORDER BY stock ASC, id LIMIT 5")]
    return render_template("admin.html", stats=stats, chart=chart, orders=orders,
                           users=users, low_stock=low_stock)
