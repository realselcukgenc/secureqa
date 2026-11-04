"""Page Object for ``/products`` — the product list and search (TR: ürün listesi / arama)."""

from __future__ import annotations

from urllib.parse import quote

from playwright.sync_api import Locator, Response

from secureqa.pages.base_page import BasePage


class ProductsPage(BasePage):
    """Search results page. The search term is echoed in ``#search-term``."""

    PATH = "/products"

    @property
    def search_term(self) -> Locator:
        return self.page.locator("#search-term")

    @property
    def product_cards(self) -> Locator:
        """All product cards in the result list."""
        return self.page.locator("[data-testid='product-card']")

    def search(self, query: str) -> Response | None:
        """Search by opening ``/products?q=<query>`` (the query is URL-encoded for us)."""
        return self.open(f"{self.PATH}?q={quote(query)}")

    def search_via_form(self, query: str) -> None:
        """Search like a real user: type into the search box and press Enter."""
        self.open()
        box = self.page.locator("input[name='q']").first
        box.fill(query)
        with self.page.expect_navigation():
            box.press("Enter")

    def result_count(self) -> int:
        return self.product_cards.count()

    def product_names(self) -> list[str]:
        """Names shown in the result cards."""
        names = self.page.locator("[data-testid='product-card'] [data-testid='product-name']")
        return [text.strip() for text in names.all_inner_texts()]
