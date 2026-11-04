"""Defensive regression checks for error handling on SecureShop — OWASP A05:2021.

Covers: no debug endpoint, and friendly error pages (no Python stack traces). All should
PASS against the secure app. (TR: /debug kapalı ve hata sayfaları traceback göstermez.)
"""

from __future__ import annotations

from urllib.parse import quote

import pytest

from secureqa.checks import Check
from secureqa.security import info_disclosure

pytestmark = [pytest.mark.security, pytest.mark.owasp_a05]


def test_debug_endpoint_absent(api, base_url, record_check) -> None:
    """The /debug page must not exist / not leak internal details."""
    exposed, evidence = info_disclosure.debug_endpoint_exposed(api, base_url)
    ok = not exposed
    record_check(
        Check(
            id="INFO-DEBUG",
            title_tr="/debug ucu kapalı",
            title_en="/debug endpoint is absent",
            category="Error Handling",
            passed=ok,
            detail=evidence,
        )
    )
    assert ok, "Information disclosure: /debug exposes internal details."


def test_errors_are_friendly(api, base_url, record_check) -> None:
    """Edge-case input must produce a friendly page, not a Python stack trace."""
    # A quote and a non-existent path are two easy ways to probe error handling.
    probes = [
        f"{base_url}/products?q={quote(chr(39))}",
        f"{base_url}/product/999999",
        f"{base_url}/orders/not-a-number",
    ]
    leaked_at = ""
    detail = ""
    for url in probes:
        verbose, evidence = info_disclosure.verbose_error_leaks_stack(api, url)
        if verbose:
            leaked_at = url
            detail = evidence
            break
    ok = leaked_at == ""
    record_check(
        Check(
            id="INFO-ERRORS",
            title_tr="Hata sayfaları traceback göstermiyor",
            title_en="Error pages show no stack trace",
            category="Error Handling",
            passed=ok,
            detail=detail or "no stack traces across probes",
        )
    )
    assert ok, f"Verbose errors: a stack trace was shown at {leaked_at}."
