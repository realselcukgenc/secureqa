"""Page Object for ``/register`` (TR: kayıt sayfası)."""

from __future__ import annotations

from playwright.sync_api import Locator

from secureqa.pages.base_page import BasePage


class RegisterPage(BasePage):
    """Registration form with ``#username``, ``#password`` and ``#register-btn``."""

    PATH = "/register"

    @property
    def username_input(self) -> Locator:
        return self.page.locator("#username")

    @property
    def password_input(self) -> Locator:
        return self.page.locator("#password")

    @property
    def email_input(self) -> Locator:
        return self.page.locator("#email")

    @property
    def register_button(self) -> Locator:
        return self.page.locator("#register-btn")

    def register(self, username: str, password: str, email: str | None = None) -> None:
        """Fill and submit the registration form (email is optional in SecureShop)."""
        self.open()
        self.username_input.fill(username)
        self.password_input.fill(password)
        if email is not None and self.email_input.count() > 0:
            self.email_input.fill(email)
        with self.page.expect_navigation():
            self.register_button.click()
