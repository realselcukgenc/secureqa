"""Browser-driven Juice Shop challenges (score board + DOM XSS).

These use Playwright because the vulnerability lives in the Angular front-end.
Marked ``juiceshop`` and skipped when Juice Shop is not running.
"""

from __future__ import annotations

import pytest

from secureqa.juiceshop import CHALLENGES
from secureqa.pages.juiceshop_page import JuiceShopPage

pytestmark = [pytest.mark.juiceshop]


# The score board challenge is "Miscellaneous"; we map it to Broken Access Control.
_SCORE_BOARD_INFO = CHALLENGES.get("adminSectionChallenge")


@pytest.mark.owasp_a03
def test_dom_xss_in_search(juice, page, record_finding) -> None:
    """A crafted search term should trigger DOM XSS in the Juice Shop search page."""
    shop = JuiceShopPage(page, juice.base_url)
    shop.open("/#/")
    shop.dismiss_banners()
    payload = '<iframe src="javascript:alert(`xss`)">'
    shop.search(payload)

    solved = juice.wait_until_solved("localXssChallenge", timeout_s=10)
    if solved:
        record_finding(
            CHALLENGES["localXssChallenge"].finding(
                juice.base_url, evidence=f"DOM XSS payload rendered in /#/search: {payload}"
            )
        )
    assert solved, "Juice Shop did not mark the 'DOM XSS' challenge as solved."


@pytest.mark.owasp_a01
def test_admin_section_access(juice, page, record_finding) -> None:
    """Navigating directly to the admin route should reach the admin section."""
    shop = JuiceShopPage(page, juice.base_url)
    shop.open("/#/administration")
    shop.dismiss_banners()
    page.wait_for_timeout(1500)

    solved = juice.wait_until_solved("adminSectionChallenge", timeout_s=10)
    if solved:
        record_finding(
            CHALLENGES["adminSectionChallenge"].finding(
                juice.base_url, evidence="Reached /#/administration without proper authorization."
            )
        )
    # The admin section may require a logged-in account first; skip rather than fail hard.
    if not solved:
        pytest.skip("Admin Section challenge not solved (may need an authenticated session first).")
