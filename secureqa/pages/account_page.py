"""Page Object for ``/account`` — the profile of the logged-in user (TR: hesabım)."""

from __future__ import annotations

from playwright.sync_api import Locator

from secureqa.pages.base_page import BasePage


class AccountPage(BasePage):
    """Shows ``#account-username`` and ``#account-email``; has a change-email form."""

    PATH = "/account"

    @property
    def username(self) -> Locator:
        return self.page.locator("#account-username")

    @property
    def email(self) -> Locator:
        return self.page.locator("#account-email")

    @property
    def email_input(self) -> Locator:
        return self.page.locator("form[action$='/account/email'] [name='email']")

    def shown_username(self) -> str:
        return self.username.inner_text().strip()

    def shown_email(self) -> str:
        return self.email.inner_text().strip()

    def change_email(self, new_email: str) -> None:
        """Use the real form to change the email address."""
        self.email_input.fill(new_email)
        with self.page.expect_navigation():
            self.page.locator("form[action$='/account/email'] [type='submit']").click()
