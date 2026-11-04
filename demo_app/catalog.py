"""Product catalogue queries + shaping rows for templates (TR: ürün kataloğu).

Views call these functions instead of writing SQL themselves, so every query lives in one
place and is easy to review. All queries are parameterized (see ``db.py``).
"""

from __future__ import annotations

from typing import Any

from .db import like_pattern, query
from .i18n import get_lang

# Base SELECT: every product with its average rating and number of reviews.
_PRODUCT_SELECT = """
SELECT p.*,
       COALESCE(AVG(r.rating), 0) AS rating,
       COUNT(r.id)                AS review_count
FROM products p
LEFT JOIN reviews r ON r.product_id = p.id
"""

# SECURITY: ORDER BY cannot use ``?`` placeholders (they only work for *values*). So we never
# put user input into ORDER BY. Instead the user picks a KEY and we look up a fixed SQL
# fragment in this allow-list. Unknown keys fall back to the default.
SORT_OPTIONS: dict[str, str] = {
    "popular": "review_count DESC, rating DESC, p.id ASC",
    "price_asc": "p.price ASC, p.id ASC",
    "price_desc": "p.price DESC, p.id ASC",
    "rating": "rating DESC, review_count DESC, p.id ASC",
    "newest": "p.id DESC",
}

# Display order + illustration for category tiles.
CATEGORIES: list[dict[str, Any]] = [
    {"key": "sweets", "emoji": "🍯", "art": 1},
    {"key": "coffee", "emoji": "☕", "art": 2},
    {"key": "tea", "emoji": "🍵", "art": 4},
    {"key": "kitchen", "emoji": "🫕", "art": 5},
    {"key": "home", "emoji": "🏡", "art": 6},
]
CATEGORY_KEYS = {c["key"] for c in CATEGORIES}


def shape(row: Any) -> dict[str, Any]:
    """Turn a DB row into a plain dict with ``name``/``desc`` in the visitor's language."""
    p = dict(row)
    lang = get_lang()
    p["name"] = p.get(f"name_{lang}") or p.get("name_tr", "")
    p["desc"] = p.get(f"desc_{lang}") or p.get("desc_tr", "")
    p["rating"] = round(float(p.get("rating") or 0), 2)
    p["review_count"] = int(p.get("review_count") or 0)
    old = p.get("old_price")
    p["discount"] = round(100 - p["price"] * 100 / old) if old else 0
    return p


def search_products(q: str = "", category: str | None = None, sort: str = "popular") -> list[dict[str, Any]]:
    """Search by name/description (both languages), optionally filter by category, then sort."""
    where: list[str] = []
    params: list[Any] = []
    if q:
        pattern = like_pattern(q)
        # fold() = Turkish-aware lower-case (registered in db.py). ESCAPE makes \% and \_ literal.
        where.append(
            "(fold(p.name_tr) LIKE ? ESCAPE '\\' OR fold(p.name_en) LIKE ? ESCAPE '\\' "
            "OR fold(p.desc_tr) LIKE ? ESCAPE '\\' OR fold(p.desc_en) LIKE ? ESCAPE '\\')"
        )
        params += [pattern] * 4
    if category in CATEGORY_KEYS:
        where.append("p.category = ?")
        params.append(category)
    order_by = SORT_OPTIONS.get(sort, SORT_OPTIONS["popular"])  # allow-list lookup
    sql = _PRODUCT_SELECT
    if where:
        sql += " WHERE " + " AND ".join(where)  # only our own fixed SQL fragments are joined
    sql += f" GROUP BY p.id ORDER BY {order_by}"
    return [shape(r) for r in query(sql, params)]


def get_product(product_id: int) -> dict[str, Any] | None:
    """One product by id, or None."""
    row = query(_PRODUCT_SELECT + " WHERE p.id = ? GROUP BY p.id", (product_id,), one=True)
    return shape(row) if row else None


def featured_products(limit: int = 8) -> list[dict[str, Any]]:
    """Products flagged as featured (home page)."""
    rows = query(_PRODUCT_SELECT + " WHERE p.featured = 1 GROUP BY p.id ORDER BY p.id LIMIT ?", (limit,))
    return [shape(r) for r in rows]


def related_products(product: dict[str, Any], limit: int = 4) -> list[dict[str, Any]]:
    """Other products of the same category (then anything else) for the detail page."""
    rows = query(
        _PRODUCT_SELECT + " WHERE p.id != ? GROUP BY p.id "
        "ORDER BY (p.category = ?) DESC, review_count DESC, p.id LIMIT ?",
        (product["id"], product["category"], limit),
    )
    return [shape(r) for r in rows]


def category_counts() -> list[dict[str, Any]]:
    """Category tiles with product counts."""
    counts = {r["category"]: r["n"] for r in query("SELECT category, COUNT(*) AS n FROM products GROUP BY category")}
    return [{**c, "count": counts.get(c["key"], 0)} for c in CATEGORIES]


def reviews_for(product_id: int) -> list[Any]:
    """Reviews of a product, newest first, with the author's username."""
    return query(
        "SELECT r.*, u.username FROM reviews r JOIN users u ON u.id = r.user_id "
        "WHERE r.product_id = ? ORDER BY r.created_at DESC, r.id DESC",
        (product_id,),
    )
