"""Page Object Model classes (TR: Sayfa Nesnesi Modeli sınıfları).

Import them from here::

    from secureqa.pages import LoginPage, ProductsPage
"""

from secureqa.pages.account_page import AccountPage
from secureqa.pages.admin_page import AdminPage
from secureqa.pages.base_page import BasePage
from secureqa.pages.login_page import LoginPage
from secureqa.pages.product_page import ProductPage
from secureqa.pages.products_page import ProductsPage
from secureqa.pages.register_page import RegisterPage

__all__ = [
    "AccountPage",
    "AdminPage",
    "BasePage",
    "LoginPage",
    "ProductPage",
    "ProductsPage",
    "RegisterPage",
]
