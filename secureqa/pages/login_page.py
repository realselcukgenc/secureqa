"""Page Object for ``/login`` (TR: giriş sayfası)."""

from __future__ import annotations

from playwright.sync_api import Locator

from secureqa.pages.base_page import BasePage


class LoginPage(BasePage):
    """Login form with ``#username``, ``#password``, ``#login-btn`` and error ``#login-error``."""

    PATH = "/login"

    @property
    def username_input(self) -> Locator:
        return self.page.locator("#username")

    @property
    def password_input(self) -> Locator:
        return self.page.locator("#password")

    @property
    def login_button(self) -> Locator:
        return self.page.locator("#login-btn")

    @property
    def error_message(self) -> Locator:
        return self.page.locator("#login-error")

    def login(self, username: str, password: str) -> None:
        """Fill the form and submit it, then wait for the next page to load.

        (TR: Formu doldurur, gönderir ve sayfanın yüklenmesini bekler.)
        """
        self.open()
        self.username_input.fill(username)
        self.password_input.fill(password)
        with self.page.expect_navigation():
            self.login_button.click()

    def error_text(self) -> str:
        """Text of the error box, or ``""`` if there is no error on the page."""
        if self.error_message.count() == 0:
            return ""
        return self.error_message.inner_text().strip()
