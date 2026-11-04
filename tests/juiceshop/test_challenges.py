"""Attacks against OWASP Juice Shop, verified via its own challenge API.

Semantics (TR: anlam): for the *vulnerable* target we EXPECT to succeed. Each test runs a
documented, non-destructive training exploit, then confirms Juice Shop marked the matching
challenge as solved (``GET /api/Challenges`` -> ``solved: true``). A solved challenge is
proof the vulnerability is real, so we record a :class:`Finding`.

These tests are marked ``juiceshop`` and are SKIPPED automatically when Juice Shop is not
running (set ``JUICE_SHOP_URL=http://127.0.0.1:3000`` to enable them).
"""

from __future__ import annotations

import pytest

from secureqa.juiceshop import CHALLENGES

pytestmark = [pytest.mark.juiceshop]


def _record_if_solved(juice, key: str, evidence: str, record_finding) -> bool:
    """Confirm the challenge is solved and record a finding; return whether it was solved."""
    solved = juice.wait_until_solved(key)
    if solved:
        record_finding(CHALLENGES[key].finding(juice.base_url, evidence))
    return solved


@pytest.mark.owasp_a03
def test_sql_injection_admin_login(juice, record_finding) -> None:
    """SQLi login bypass should let us authenticate without a valid password."""
    ok, evidence = juice.login_sqli("' OR 1=1--")
    assert ok, f"Expected the SQLi login bypass to succeed. {evidence}"
    solved = _record_if_solved(juice, "loginAdminChallenge", evidence, record_finding)
    assert solved, "Juice Shop did not mark the 'Login Admin' challenge as solved."


@pytest.mark.owasp_a02
def test_confidential_document_access(juice, record_finding) -> None:
    """A confidential document under /ftp should be downloadable without auth."""
    ok, evidence = juice.get_confidential_document()
    assert ok, f"Expected /ftp/acquisitions.md to be readable. {evidence}"
    solved = _record_if_solved(juice, "directoryListingChallenge", evidence, record_finding)
    assert solved, "Juice Shop did not mark the 'Confidential Document' challenge as solved."


@pytest.mark.owasp_a05
def test_exposed_metrics_endpoint(juice, record_finding) -> None:
    """The Prometheus /metrics endpoint should be publicly reachable."""
    ok, evidence = juice.get_metrics()
    assert ok, f"Expected /metrics to be exposed. {evidence}"
    solved = _record_if_solved(juice, "exposedMetricsChallenge", evidence, record_finding)
    assert solved, "Juice Shop did not mark the 'Exposed Metrics' challenge as solved."


@pytest.mark.owasp_a05
def test_verbose_error_handling(juice, record_finding) -> None:
    """A malformed login should provoke an un-gracefully handled error."""
    ok, evidence = juice.provoke_error()
    assert ok, f"Expected a verbose error response. {evidence}"
    solved = _record_if_solved(juice, "errorHandlingChallenge", evidence, record_finding)
    assert solved, "Juice Shop did not mark the 'Error Handling' challenge as solved."
