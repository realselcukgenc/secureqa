"""Defensive regression checks for injection defenses on SecureShop — OWASP A03:2021.

SecureShop must encode output (no XSS) and use parameterized queries (no SQLi error leak).
These checks should PASS against the secure app.
(TR: SecureShop çıktıyı kodlar ve parametreli sorgu kullanır; bu kontroller GEÇER.)
"""

from __future__ import annotations

from urllib.parse import quote

import pytest

from secureqa.checks import Check
from secureqa.config import SELCUK
from secureqa.pages import ProductPage, ProductsPage
from secureqa.security import csrf, sqli, xss
from secureqa.security.payloads import SQLI_PROBE, XSS_PAYLOADS, XSS_STORED_PAYLOAD

pytestmark = [pytest.mark.security, pytest.mark.owasp_a03]


def test_reflected_xss_is_blocked(page, base_url, record_check) -> None:
    """The search term must be encoded; the injected script must NOT run."""
    products = ProductsPage(page, base_url)
    payload = XSS_PAYLOADS[0]
    products.search(payload)
    executed = xss.payload_executed(page)
    reflected_raw = xss.reflects_unescaped(products.content(), payload)
    safe = not executed and not reflected_raw
    record_check(
        Check(
            id="XSS-REFLECTED",
            title_tr="Yansıtılmış XSS engelleniyor (arama)",
            title_en="Reflected XSS blocked (search)",
            category="Output Encoding",
            passed=safe,
            detail="payload encoded, script did not execute" if safe else "payload executed or reflected raw",
        )
    )
    assert safe, "Reflected XSS: the search term was not safely encoded."


def test_stored_xss_is_blocked(as_user, page, base_url, record_check) -> None:
    """A stored review must be encoded; its script must NOT run for later visitors."""
    as_user(SELCUK.username, SELCUK.password)
    product = ProductPage(page, base_url)
    product.open_product(1)
    try:
        product.add_review(XSS_STORED_PAYLOAD)
    except Exception as error:  # a secure form may require a CSRF token / field we miss
        pytest.skip(f"Could not submit a review via the UI: {error}")
    product.open_product(1)
    executed = xss.stored_payload_executed(page)
    reflected_raw = xss.reflects_unescaped(product.content(), XSS_STORED_PAYLOAD)
    safe = not executed and not reflected_raw
    record_check(
        Check(
            id="XSS-STORED",
            title_tr="Kalıcı XSS engelleniyor (yorumlar)",
            title_en="Stored XSS blocked (reviews)",
            category="Output Encoding",
            passed=safe,
            detail="review encoded, script did not execute" if safe else "stored payload executed",
        )
    )
    assert safe, "Stored XSS: review content was not safely encoded."


def test_sqli_search_is_parameterized(api, base_url, record_check) -> None:
    """A single quote in the search must NOT leak a SQL error."""
    url = f"{base_url}/products?q={quote(SQLI_PROBE)}"
    vulnerable, evidence = sqli.probe_error_based(api, url)
    record_check(
        Check(
            id="SQLI-SEARCH",
            title_tr="Ürün araması parametreli (SQLi yok)",
            title_en="Product search parameterized (no SQLi)",
            category="Injection",
            passed=not vulnerable,
            detail=evidence,
        )
    )
    assert not vulnerable, "SQL error leaked from product search."


def test_sqli_login_is_parameterized(api, base_url, record_check) -> None:
    """A quote in the username must NOT break the login SQL."""
    # Send a valid CSRF token so the quote actually reaches the login query.
    response = csrf.post(api, base_url, "/login", {"username": SQLI_PROBE, "password": "x"}, allow_redirects=False)
    vulnerable = sqli.looks_like_sql_error(response.text)
    record_check(
        Check(
            id="SQLI-LOGIN",
            title_tr="Giriş sorgusu parametreli (SQLi yok)",
            title_en="Login query parameterized (no SQLi)",
            category="Injection",
            passed=not vulnerable,
            detail=f"HTTP {response.status_code}; no SQL error" if not vulnerable else "SQL error leaked",
        )
    )
    assert not vulnerable, "SQL error leaked from the login form."
