"""Injection attacks against OWASP Juice Shop (A03:2021).

Each test runs a documented, non-destructive SQL-injection or reflected-XSS attack
against a REAL Juice Shop endpoint, then confirms the matching challenge was solved via
``GET /api/Challenges``. Marked ``juiceshop`` and skipped when Juice Shop is not running
(set ``JUICE_SHOP_URL=http://127.0.0.1:3000`` to enable them).
"""

from __future__ import annotations

import pytest

from tests.juiceshop._helpers import record_if_solved

pytestmark = [pytest.mark.juiceshop, pytest.mark.owasp_a03]


def test_sqli_login_as_bender(juice, record_finding) -> None:
    """SQLi login (``bender@juice-sh.op'--``) should authenticate us as Bender."""
    ok, evidence = juice.sqli_login_as("bender")
    assert ok, f"Expected the SQLi login as Bender to succeed. {evidence}"
    assert record_if_solved(juice, "loginBenderChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Login Bender' challenge as solved."
    )


def test_sqli_login_as_jim(juice, record_finding) -> None:
    """SQLi login (``jim@juice-sh.op'--``) should authenticate us as Jim."""
    ok, evidence = juice.sqli_login_as("jim")
    assert ok, f"Expected the SQLi login as Jim to succeed. {evidence}"
    assert record_if_solved(juice, "loginJimChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Login Jim' challenge as solved."
    )


def test_union_sqli_user_credentials(juice, record_finding) -> None:
    """A UNION-based SQLi on product search should leak user e-mails and password hashes."""
    ok, evidence = juice.union_sqli_user_credentials()
    assert ok, f"Expected the UNION SQLi to return user credentials. {evidence}"
    assert record_if_solved(juice, "unionSqlInjectionChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'User Credentials' challenge as solved."
    )


def test_union_sqli_database_schema(juice, record_finding) -> None:
    """A UNION-based SQLi on product search should dump the SQLite table definitions."""
    ok, evidence = juice.union_sqli_db_schema()
    assert ok, f"Expected the UNION SQLi to return the database schema. {evidence}"
    assert record_if_solved(juice, "dbSchemaChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Database Schema' challenge as solved."
    )


def test_reflected_xss_in_order_tracking(juice, record_finding) -> None:
    """A crafted order-tracking id should be reflected unencoded (reflected XSS).

    Note: Juice Shop disables this challenge under Docker/Heroku, so when the target
    runs as a container (CI and most local ``docker run`` setups) it cannot be solved.
    We skip in that case rather than fail, and still run the attack where it is active.
    """
    disabled_in = juice.disabled_env("reflectedXssChallenge")
    if disabled_in:
        pytest.skip(
            f"'Reflected XSS' challenge is disabled in this Juice Shop environment "
            f"({disabled_in}); run a non-Docker instance to exercise it."
        )
    ok, evidence = juice.reflected_xss_track_order()
    assert ok, f"Expected the reflected-XSS request to be accepted. {evidence}"
    assert record_if_solved(juice, "reflectedXssChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Reflected XSS' challenge as solved."
    )


def test_order_christmas_special(juice, record_finding) -> None:
    """SQLi on product search should reveal a deleted product that we can then order."""
    ok, evidence = juice.order_christmas_special()
    assert ok, f"Expected to order the deleted Christmas product. {evidence}"
    assert record_if_solved(juice, "christmasSpecialChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Christmas Special' challenge as solved."
    )
