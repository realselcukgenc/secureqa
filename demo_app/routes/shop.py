"""Shop pages: home, product list/search, product detail, reviews (TR: mağaza sayfaları)."""

from __future__ import annotations

from typing import Any

from flask import Blueprint, abort, flash, g, redirect, render_template, request, url_for

from .. import catalog
from ..auth import login_required
from ..db import execute, query
from ..i18n import t

bp = Blueprint("shop", __name__)

MAX_QUERY_LEN = 80
MAX_REVIEW_LEN = 1000


@bp.get("/")
def index() -> str:
    """Home page: hero, categories, featured products."""
    featured = catalog.featured_products()
    stats_row = query("SELECT COUNT(*) AS n FROM products", one=True)
    rating_row = query("SELECT COALESCE(AVG(rating), 0) AS r FROM reviews", one=True)
    return render_template(
        "home.html",
        featured=featured,
        hero_products=featured[:3],
        categories=catalog.category_counts(),
        stats={"products": stats_row["n"], "rating": rating_row["r"]},
    )


@bp.get("/products")
def products() -> str:
    """Product list with search (``?q=``), category filter (``?cat=``) and sort (``?sort=``).

    SECURITY: ``q`` is (1) length-limited, (2) passed to SQL as a parameter, and
    (3) HTML-escaped when shown in ``#search-term``.
    """
    q = request.args.get("q", "").strip()[:MAX_QUERY_LEN]
    cat = request.args.get("cat") or None
    if cat not in catalog.CATEGORY_KEYS:
        cat = None
    sort = request.args.get("sort", "popular")
    if sort not in catalog.SORT_OPTIONS:
        sort = "popular"
    return render_template(
        "products.html",
        products=catalog.search_products(q, cat, sort),
        q=q,
        cat=cat,
        sort=sort,
        sort_options=list(catalog.SORT_OPTIONS),
        categories=catalog.CATEGORIES,
    )


def _render_product(product_id: int, review_errors: list[str] | None = None,
                    review_draft: str = "", status: int = 200) -> Any:
    """Shared renderer for the product page (also used to re-show the form with errors)."""
    product = catalog.get_product(product_id)
    if product is None:
        abort(404)
    reviews = catalog.reviews_for(product_id)
    distribution = {n: 0 for n in range(1, 6)}
    for r in reviews:
        distribution[r["rating"]] += 1
    return render_template(
        "product.html",
        p=product,
        reviews=reviews,
        distribution=distribution,
        related=catalog.related_products(product),
        review_errors=review_errors or [],
        review_draft=review_draft,
    ), status


@bp.get("/product/<int:product_id>")
def product(product_id: int) -> Any:
    """Product detail page with reviews. ``<int:...>`` means non-numbers get a 404 automatically."""
    return _render_product(product_id)


@bp.post("/product/<int:product_id>/review")
@login_required
def add_review(product_id: int) -> Any:
    """Save a review (fields ``body`` and ``rating``). CSRF is checked globally in csrf.py.

    SECURITY: the text is stored exactly as typed and escaped on OUTPUT by Jinja.
    (Escape on output, validate on input — never try to "clean" HTML with a home-made regex.)
    """
    if catalog.get_product(product_id) is None:
        abort(404)
    body = request.form.get("body", "").strip()
    try:
        rating = int(request.form.get("rating", "5"))
    except ValueError:
        rating = 0
    errors: list[str] = []
    if not 3 <= len(body) <= MAX_REVIEW_LEN:
        errors.append(t("review_len_error", max=MAX_REVIEW_LEN))
    if not 1 <= rating <= 5:
        errors.append(t("review_rating_error"))
    if errors:
        return _render_product(product_id, errors, body[:MAX_REVIEW_LEN], status=400)
    execute(
        "INSERT INTO reviews (product_id, user_id, rating, body) VALUES (?, ?, ?, ?)",
        (product_id, g.user["id"], rating, body),
    )
    flash(t("review_saved"), "success")
    return redirect(url_for("shop.product", product_id=product_id) + "#reviews")
