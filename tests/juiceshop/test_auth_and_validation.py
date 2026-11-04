"""Authentication, cryptography and input-validation attacks against Juice Shop.

Covers A07 (weak password), A02 (weird crypto) and A04 (insecure design: empty/mismatched
registration and zero-star feedback). Each is confirmed via ``GET /api/Challenges``.
Marked ``juiceshop`` and skipped when Juice Shop is not running.
"""

from __future__ import annotations

import pytest

from tests.juiceshop._helpers import record_if_solved

pytestmark = [pytest.mark.juiceshop]


@pytest.mark.owasp_a07
def test_weak_admin_password(juice, record_finding) -> None:
    """Logging in as admin with the weak password ``admin123`` should succeed."""
    ok, evidence = juice.weak_admin_password_login()
    assert ok, f"Expected the weak admin password to work. {evidence}"
    assert record_if_solved(juice, "weakPasswordChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Password Strength' challenge as solved."
    )


@pytest.mark.owasp_a02
def test_weird_crypto_feedback(juice, record_finding) -> None:
    """Feedback naming md5/base64 as password protection should trigger the challenge."""
    ok, evidence = juice.submit_weird_crypto_feedback()
    assert ok, f"Expected the feedback to be accepted. {evidence}"
    assert record_if_solved(juice, "weirdCryptoChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Weird Crypto' challenge as solved."
    )


@pytest.mark.owasp_a04
def test_empty_user_registration(juice, record_finding) -> None:
    """Registering with an empty e-mail and password should bypass client validation."""
    ok, evidence = juice.register_empty_user()
    assert ok, f"Expected the empty-registration request to be sent. {evidence}"
    assert record_if_solved(juice, "emptyUserRegistration", evidence, record_finding), (
        "Juice Shop did not mark the 'Empty User Registration' challenge as solved."
    )


@pytest.mark.owasp_a04
def test_password_repeat_mismatch(juice, record_finding) -> None:
    """Registering with a mismatched password repeat should be accepted (no server check)."""
    ok, evidence = juice.register_password_mismatch()
    assert ok, f"Expected the mismatched-registration request to be sent. {evidence}"
    assert record_if_solved(juice, "passwordRepeatChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Repetitive Registration' challenge as solved."
    )


@pytest.mark.owasp_a04
def test_zero_star_feedback(juice, record_finding) -> None:
    """Submitting feedback with a 0-star rating should be accepted (no server validation)."""
    ok, evidence = juice.submit_zero_star_feedback()
    assert ok, f"Expected the zero-star feedback to be accepted. {evidence}"
    assert record_if_solved(juice, "zeroStarsChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Zero Stars' challenge as solved."
    )
