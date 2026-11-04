"""Security-misconfiguration findings against OWASP Juice Shop (A05:2021).

These exercise hidden/discoverable resources. Each is confirmed via ``GET /api/Challenges``.
Marked ``juiceshop`` and skipped when Juice Shop is not running.
"""

from __future__ import annotations

import pytest

from tests.juiceshop._helpers import record_if_solved

pytestmark = [pytest.mark.juiceshop, pytest.mark.owasp_a05]


def test_score_board_discovery(juice, record_finding) -> None:
    """Requesting the score-board tracking pixel should reveal the hidden score board."""
    ok, evidence = juice.access_padding_pixel("1px.png")
    assert ok, f"Expected the score-board pixel request to be sent. {evidence}"
    assert record_if_solved(juice, "scoreBoardChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Score Board' challenge as solved."
    )


def test_privacy_policy_discovery(juice, record_finding) -> None:
    """Requesting the privacy-policy tracking pixel should mark the challenge."""
    ok, evidence = juice.access_padding_pixel("81px.png")
    assert ok, f"Expected the privacy-policy pixel request to be sent. {evidence}"
    assert record_if_solved(juice, "privacyPolicyChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Privacy Policy' challenge as solved."
    )


def test_security_policy_file(juice, record_finding) -> None:
    """The /security.txt policy file should be reachable."""
    ok, evidence = juice.get_security_policy()
    assert ok, f"Expected /security.txt to be readable. {evidence}"
    assert record_if_solved(juice, "securityPolicyChallenge", evidence, record_finding), (
        "Juice Shop did not mark the 'Security Policy' challenge as solved."
    )
