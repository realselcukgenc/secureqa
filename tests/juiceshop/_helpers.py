"""Small helper shared by the Juice Shop test modules (TR: ortak yardımcı).

``record_if_solved`` confirms a challenge was marked solved by Juice Shop (via
``GET /api/Challenges``) and, when it was, records the matching :class:`Finding`.
It returns whether the challenge is solved so the test can assert on it.
"""

from __future__ import annotations

from secureqa.juiceshop import CHALLENGES, JuiceShopClient


def record_if_solved(juice: JuiceShopClient, key: str, evidence: str, record_finding, timeout_s: float = 10.0) -> bool:
    """Return True and record a finding when Juice Shop marks ``key`` as solved."""
    solved = juice.wait_until_solved(key, timeout_s=timeout_s)
    if solved:
        record_finding(CHALLENGES[key].finding(juice.base_url, evidence))
    return solved
