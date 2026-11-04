"""Page Object for ``/product/<id>`` — product detail and reviews (TR: ürün detayı ve yorumlar)."""

from __future__ import annotations

from playwright.sync_api import Locator, Response

from secureqa.pages.base_page import BasePage


class ProductPage(BasePage):
    """Product detail page with a review form (field ``body``) and ``.review-body`` items."""

    def open_product(self, product_id: int) -> Response | None:
        return self.open(f"/product/{product_id}")

    @property
    def name(self) -> Locator:
        return self.page.locator("[data-testid='product-name']").first

    @property
    def reviews(self) -> Locator:
        return self.page.locator(".review-body")

    @property
    def review_input(self) -> Locator:
        return self.page.locator("[name='body']")

    @property
    def review_submit(self) -> Locator:
        return self.page.locator("form[action*='/review'] [type='submit']")

    def add_review(self, text: str) -> None:
        """Type a review and submit the form (TR: yorum yazıp gönderir)."""
        self.review_input.fill(text)
        with self.page.expect_navigation():
            self.review_submit.click()

    def review_texts(self) -> list[str]:
        return [text.strip() for text in self.reviews.all_inner_texts()]
