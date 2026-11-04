"""BasePage: the parent class of every Page Object.

Page Object Model (POM) in one sentence: *each page of the website gets one Python class
that knows the page's URL and elements, so tests read like plain English.*
(TR: POM = her sayfa için bir sınıf. Locator'lar tek yerde durur; sayfa değişirse sadece
burayı güncellersiniz, testleri değil.)

Example / Örnek::

    login = LoginPage(page, base_url)
    login.open()
    login.login("selcuk", "Selcuk!2026")
"""

from __future__ import annotations

from playwright.sync_api import Locator, Page, Response


class BasePage:
    """Common behaviour for all pages (TR: tüm sayfalar için ortak davranış).

    Child classes set ``PATH`` (e.g. ``"/login"``) and add their own locators/actions.
    """

    PATH: str = "/"

    def __init__(self, page: Page, base_url: str) -> None:
        self.page = page
        self.base_url = base_url.rstrip("/")

    # ----------------------------------------------------------------- navigation
    def url_for(self, path: str) -> str:
        """Return an absolute URL for ``path`` (TR: tam adres üretir)."""
        return self.base_url + path

    def open(self, path: str | None = None) -> Response | None:
        """Navigate to this page (or to ``path`` if given) and return the HTTP response."""
        return self.page.goto(self.url_for(path if path is not None else self.PATH))

    @property
    def current_url(self) -> str:
        return self.page.url

    def title(self) -> str:
        return self.page.title()

    def content(self) -> str:
        """The full HTML of the current page."""
        return self.page.content()

    # ----------------------------------------------------------------- common UI
    def set_language(self, lang: str) -> None:
        """Switch UI language with the ``?lang=tr|en`` query parameter (stored in a cookie)."""
        separator = "&" if "?" in self.page.url else "?"
        self.page.goto(self.page.url + f"{separator}lang={lang}")

    def html_lang(self) -> str:
        """Value of ``<html lang="...">`` (empty string when missing)."""
        return self.page.locator("html").get_attribute("lang") or ""

    def body_text(self) -> str:
        """Visible text of the whole page (good for simple 'contains' checks)."""
        return self.page.locator("body").inner_text()

    def by_test_id(self, test_id: str) -> Locator:
        """Locate an element by its ``data-testid`` attribute."""
        return self.page.get_by_test_id(test_id)

    def logout_link(self) -> Locator:
        """The logout link in the navigation bar (TR: çıkış bağlantısı)."""
        return self.page.locator("a[href='/logout']")

    def is_logged_in(self) -> bool:
        """True when the navigation shows a logout link."""
        return self.logout_link().count() > 0

    def logout(self) -> None:
        self.page.goto(self.url_for("/logout"))
