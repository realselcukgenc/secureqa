"""Helpers to detect reflected and stored cross-site scripting (TR: XSS tespiti).

The idea: send a payload that contains an HTML tag. In a SAFE app the dangerous
characters come back encoded (``&lt;script&gt;``). In a VULNERABLE app the raw
``<script>`` survives in the HTML and the browser would execute it.

We offer two levels of check:

* ``reflects_unescaped`` — a fast text check on the raw HTML (works with ``requests``).
* ``payload_executes`` — the real proof: drive a browser and see if the script ran.
"""

from __future__ import annotations

from playwright.sync_api import Page

from secureqa.security.payloads import XSS_MARKER


def reflects_unescaped(html: str, payload: str) -> bool:
    """True when the *raw* payload appears in the HTML (i.e. it was NOT encoded).

    If the app encoded it, the HTML would contain ``&lt;script&gt;`` instead and this
    returns False.
    (TR: Ham payload HTML içinde aynen görünüyorsa kodlanmamış demektir -> zafiyet.)
    """
    return payload in html


def is_encoded(html: str, payload: str) -> bool:
    """True when the payload's angle brackets are HTML-encoded somewhere in the page."""
    encoded = payload.replace("<", "&lt;").replace(">", "&gt;")
    return encoded in html


def install_xss_probe(page: Page) -> None:
    """Expose a JS function ``sqaMark(id)`` that records when a payload executes.

    Our XSS payloads call ``sqaMark('<marker>')``. By defining it on ``window`` before
    navigation, we can later read ``window.__sqa_fired`` to prove script execution.
    (TR: Payload çalışırsa sqaMark çağrılır; biz de window.__sqa_fired ile kanıtlarız.)
    """
    page.add_init_script(
        "window.__sqa_fired = null;"
        "window.sqaMark = function(id){ window.__sqa_fired = id; };"
    )


def payload_executed(page: Page) -> bool:
    """True if a payload actually ran ``sqaMark`` in the real browser."""
    fired = page.evaluate("window.__sqa_fired")
    return fired == XSS_MARKER


def stored_payload_executed(page: Page) -> bool:
    """True if the stored-XSS payload set ``window.__sqa_stored`` when the page loaded."""
    value = page.evaluate("window.__sqa_stored")
    return value == XSS_MARKER
