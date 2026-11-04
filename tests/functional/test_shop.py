"""Functional tests for browsing, searching and reviewing products, plus i18n.

They check normal behaviour and should pass in both vulnerable and secure modes.
(TR: Gezinme, arama, yorum ve dil değiştirme işlevsel testleri.)
"""

from __future__ import annotations

import pytest

from secureqa.config import SELCUK
from secureqa.pages import ProductPage, ProductsPage

pytestmark = pytest.mark.functional


def test_home_page_loads(page, base_url) -> None:
    """The home page opens and shows the SecureShop content."""
    products = ProductsPage(page, base_url)
    response = products.open("/")
    assert response is not None and response.ok
    assert "SecureShop" in products.content()


def test_search_lists_products(page, base_url) -> None:
    """Searching for a common term returns at least one product card."""
    products = ProductsPage(page, base_url)
    products.search("a")  # 'a' appears in many product names
    assert products.result_count() >= 1, "Expected at least one search result"


def test_search_echoes_term(page, base_url) -> None:
    """The search term is echoed back in #search-term (functional, not the XSS test)."""
    products = ProductsPage(page, base_url)
    products.search("kahve")
    assert "kahve" in products.search_term.inner_text().lower()


def test_product_detail_opens(page, base_url) -> None:
    """A product detail page loads and shows a product name."""
    product = ProductPage(page, base_url)
    response = product.open_product(1)
    assert response is not None and response.ok
    assert product.name.inner_text().strip() != ""


def test_add_review_appears(as_user, page, base_url) -> None:
    """A logged-in user can add a review and see it on the page."""
    as_user(SELCUK.username, SELCUK.password)
    product = ProductPage(page, base_url)
    product.open_product(1)
    marker = "guzel-urun-functional-test"
    product.add_review(marker)
    product.open_product(1)
    assert any(marker in text for text in product.review_texts()), "New review should be visible"


def test_language_switch(page, base_url) -> None:
    """Switching the language with ?lang= changes the <html lang> attribute."""
    products = ProductsPage(page, base_url)
    products.open("/?lang=en")
    assert products.html_lang().startswith("en")
    products.open("/?lang=tr")
    assert products.html_lang().startswith("tr")
