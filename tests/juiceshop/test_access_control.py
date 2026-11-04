"""Broken Access Control attacks against OWASP Juice Shop (A01:2021).

Documented, non-destructive exploits against REAL endpoints, each confirmed via
``GET /api/Challenges``. Marked ``juiceshop`` and skipped when Juice Shop is not running.
"""

from __future__ import annotations

import pytest

from tests.juiceshop._helpers import record_if_solved

pytestmark = [pytest.mark.juiceshop, pytest.mark.owasp_a01]


def test_basket_access_idor(juice, record_finding) -> None:
    """Reading another user's basket (changing the id) should succeed (IDOR)."""
    ok, evidence = juice.access_basket_idor()
    assert ok, f"Expected to read another user's basket. {evidence}"
    assert record_if_solved(juice, "basketAccessChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'View Basket' challenge as solved."
    )


def test_unvalidated_redirect(juice, record_finding) -> None:
    """The redirect endpoint should forward to an allowlisted crypto address."""
    ok, evidence = juice.open_redirect_crypto()
    assert ok, f"Expected the redirect endpoint to forward us. {evidence}"
    assert record_if_solved(juice, "redirectCryptoCurrencyChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Outdated Allowlist' redirect challenge as solved."
    )


def test_admin_registration(juice, record_finding) -> None:
    """Registering a user that asks for the admin role should be accepted."""
    ok, evidence = juice.register_admin()
    assert ok, f"Expected the admin registration request to be accepted. {evidence}"
    assert record_if_solved(juice, "registerAdminChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Admin Registration' challenge as solved."
    )


def test_forged_feedback(juice, record_finding) -> None:
    """Posting feedback with someone else's UserId should trigger the forged-feedback flaw."""
    ok, evidence = juice.forge_feedback()
    assert ok, f"Expected the forged-feedback request to be sent. {evidence}"
    assert record_if_solved(juice, "forgedFeedbackChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Forged Feedback' challenge as solved."
    )


def test_delete_five_star_feedback(juice, record_finding) -> None:
    """Deleting another user's 5-star feedback should be possible (missing ownership check)."""
    ok, evidence = juice.delete_five_star_feedback()
    assert ok, f"Expected to delete the 5-star feedback. {evidence}"
    assert record_if_solved(juice, "feedbackChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Five-Star Feedback' challenge as solved."
    )


def test_basket_manipulation(juice, record_finding) -> None:
    """Updating a basket item to point at another user's basket should be possible (mass assignment)."""
    ok, evidence = juice.manipulate_basket()
    assert ok, f"Expected the basket-manipulation request to be sent. {evidence}"
    assert record_if_solved(juice, "basketManipulateChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Manipulate Basket' challenge as solved."
    )


def test_product_tampering(juice, record_finding) -> None:
    """An unauthorized PUT should let us rewrite a product's description (Product Tampering)."""
    ok, evidence = juice.tamper_product()
    assert ok, f"Expected the product-tampering PUT to be accepted. {evidence}"
    assert record_if_solved(juice, "changeProductChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Product Tampering' challenge as solved."
    )
