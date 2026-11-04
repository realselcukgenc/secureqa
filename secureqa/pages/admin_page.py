"""Page Object for ``/admin`` (TR: yönetici paneli)."""

from __future__ import annotations

from playwright.sync_api import Locator

from secureqa.pages.base_page import BasePage


class AdminPage(BasePage):
    """Admin panel; the panel itself has the id ``#admin-panel``."""

    PATH = "/admin"

    @property
    def panel(self) -> Locator:
        return self.page.locator("#admin-panel")

    def is_panel_visible(self) -> bool:
        """True when the admin panel is rendered on the page."""
        return self.panel.count() > 0 and self.panel.first.is_visible()
