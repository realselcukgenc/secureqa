"""A small Page Object for OWASP Juice Shop's Angular UI (TR: Juice Shop sayfa nesnesi).

Juice Shop is a single-page app, so its routes live after the ``#`` (e.g. ``/#/search``).
We only need a couple of helpers for the browser-driven challenges.
"""

from __future__ import annotations

from urllib.parse import quote

from secureqa.pages.base_page import BasePage


class JuiceShopPage(BasePage):
    """Helpers for the Juice Shop SPA (score board, product search)."""

    def dismiss_banners(self) -> None:
        """Close the welcome/cookie banners if they are shown (best effort)."""
        for selector in ("button[aria-label='Close Welcome Banner']", "a.cc-dismiss"):
            try:
                element = self.page.locator(selector)
                if element.count() > 0 and element.first.is_visible():
                    element.first.click()
            except Exception:  # banners are optional; never fail the test on them
                pass

    def open_score_board(self) -> None:
        """Navigate to the hidden score board page (#/score-board)."""
        self.page.goto(self.url_for("/#/score-board"))
        self.page.wait_for_timeout(1500)

    def search(self, query: str) -> None:
        """Open the search route with a raw query (used for the DOM XSS challenge)."""
        self.page.goto(self.url_for(f"/#/search?q={quote(query, safe='')}"))
        self.page.wait_for_timeout(1500)
