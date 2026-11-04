"""API authentication & authorization checks — OWASP API Security Top 10 (2023).

(TR: API kimlik doğrulama ve yetkilendirme kontrolleri — OWASP API İlk 10 (2023).)

Covered here (all should PASS against the secure SecureShop API):
  * API2 Broken Authentication   — ``/api/me`` demands a session (401, not a redirect).
  * API1 BOLA                    — id-based resources are owner-only (no IDOR).
  * API3 Object Property Level   — mass-assignment guard + no sensitive fields leaked.

These tests reuse the shared fixtures from ``tests/conftest.py``:
  * ``api``            — a fresh ``requests.Session`` bound to the running server
  * ``api_logged_in``  — logs that session in (fetching a real CSRF token first)
  * ``record_check``   — records a :class:`~secureqa.checks.Check` for the HTML report
No local ``conftest.py`` is needed — we do NOT restart the server, we reuse it.
(TR: Sunucu yeniden başlatılmaz; mevcut fixture'lar yeniden kullanılır.)
"""

from __future__ import annotations

import uuid

import pytest

from secureqa import apisec
from secureqa.checks import Check
from secureqa.config import SELCUK

# The whole module is API-level; ``api`` is the one new marker registered in pyproject + conftest.
pytestmark = [pytest.mark.api]

CATEGORY = "API Security"


def test_api_me_requires_authentication(api, base_url, record_check) -> None:
    """``GET /api/me`` without a session must answer 401 JSON (API2 Broken Authentication).

    NEGATIVE CONTROL: a vulnerable API would return 200 with the profile to anyone, or
    302-redirect an API client to an HTML login page instead of a clean 401.
    """
    ok, detail = apisec.authentication_required(api, base_url, "/api/me")
    record_check(
        Check(
            id="APISEC-API2-AUTH",
            title_tr="Korumalı API ucu kimlik doğrulaması ister (401)",
            title_en="Protected API endpoint requires authentication (401)",
            category=CATEGORY,
            passed=ok,
            detail=detail,
        )
    )
    assert ok, f"/api/me is not properly protected: {detail}"


def test_api_unauth_uses_machine_readable_status(api, base_url, record_check) -> None:
    """The unauthenticated answer must be a machine-readable 401 JSON, not an HTML redirect.

    This is the "correct 401/403 vs 404/redirect semantics" deliverable: an API client
    cannot act on a 302 to ``/login`` or on an HTML page — it needs a status code + JSON.
    (TR: API istemcisi 302/HTML değil, 401 + JSON bekler.)

    NEGATIVE CONTROL: a vulnerable API answers ``302 Found -> /login`` (HTML) or ``200``.
    """
    api.cookies.clear()
    response = api.get(base_url + "/api/me", timeout=5, allow_redirects=False)
    json_body = apisec.is_json_response(response)
    html_leak = apisec.looks_like_html(response.text)
    ok = response.status_code == 401 and json_body and not html_leak
    record_check(
        Check(
            id="APISEC-API2-STATUS",
            title_tr="Yetkisiz istekte doğru durum kodu (401, yönlendirme değil)",
            title_en="Correct status on unauthenticated call (401, not a redirect)",
            category=CATEGORY,
            passed=ok,
            detail=f"[{apisec.api_label('API2')}] HTTP {response.status_code}; "
                   f"json={json_body}; html_body={html_leak}",
        )
    )
    assert ok, f"Unauthenticated /api/me did not answer a clean 401 JSON (HTTP {response.status_code})."


def test_no_idor_on_order_resource(api_logged_in, base_url, record_check) -> None:
    """Id-based ``/orders/<id>`` must be owner-only — no BOLA/IDOR (API1).

    We log in as Selçuk and walk the order ids. His own orders are reachable (positive
    control), but another customer's order (Ayşe's) must answer 404 — never 200 with her
    shipping details. Answering 404 (not 403) also avoids leaking which ids exist.

    NEGATIVE CONTROL: a vulnerable API returns 200 + Ayşe's order simply by changing the id
    in the URL (the textbook Broken Object Level Authorization bug).
    """
    session = api_logged_in(SELCUK.username, SELCUK.password)

    # Positive control: the owner CAN read his own order, so we know the route works.
    own = session.get(base_url + "/orders/1", timeout=5, allow_redirects=False)
    assert own.status_code == 200, "Owner could not read their own order (fixture/seed problem)."

    # Ayşe's order #2 carries her address 'Alsancak' — a marker that must never leak to Selçuk.
    ok, detail = apisec.no_idor_on_resource(
        session, base_url, "/orders/{id}", foreign_marker="Alsancak", id_range=range(1, 8)
    )
    record_check(
        Check(
            id="APISEC-API1-BOLA",
            title_tr="Kimliğe dayalı kaynak yalnızca sahibine görünür (BOLA/IDOR yok)",
            title_en="Id-based resource is owner-only (no BOLA/IDOR)",
            category=CATEGORY,
            passed=ok,
            detail=detail,
        )
    )
    assert ok, f"BOLA/IDOR: {SELCUK.username} read another user's resource. {detail}"


def test_register_ignores_mass_assignment(api, base_url, record_check) -> None:
    """Extra write fields are ignored — mass-assignment / property-level guard (API3).

    Registering with ``role=admin`` (and friends) must NOT create an admin; the role is set
    server-side to ``user``. We confirm via ``/api/me``.

    NEGATIVE CONTROL: a vulnerable API copies the request body onto the user model, so
    ``role=admin`` is honoured and the attacker becomes an administrator.
    """
    username = "massassign_" + uuid.uuid4().hex[:8]
    ok, detail = apisec.register_ignores_extra_fields(
        api, base_url, username=username, password="Passw0rd!2026", email=f"{username}@example.com"
    )
    record_check(
        Check(
            id="APISEC-API3-MASSASSIGN",
            title_tr="Yazma ucunda fazladan alanlar yok sayılır (mass-assignment koruması)",
            title_en="Extra fields ignored on write (mass-assignment protection)",
            category=CATEGORY,
            passed=ok,
            detail=detail,
        )
    )
    assert ok, f"Mass assignment: role could be set from the request body. {detail}"


def test_api_responses_leak_no_sensitive_fields(api_logged_in, base_url, record_check) -> None:
    """No API response may contain password/hash/salt fields — property-level exposure (API3).

    We check an authenticated profile (``/api/me``) and the public catalogue
    (``/api/products``). Neither must serialise secret columns.

    NEGATIVE CONTROL: a vulnerable API returns ``"password_hash": "scrypt:..."`` (or an
    internal ``salt``/``secret``) because it dumps the whole DB row.
    """
    session = api_logged_in(SELCUK.username, SELCUK.password)
    me = session.get(base_url + "/api/me", timeout=5)
    products = session.get(base_url + "/api/products", timeout=5)

    ok_me, detail_me = apisec.no_sensitive_fields(me)
    ok_products, detail_products = apisec.no_sensitive_fields(products)
    ok = ok_me and ok_products
    record_check(
        Check(
            id="APISEC-API3-NOSENSITIVE",
            title_tr="API yanıtları hassas alan (parola/hash) sızdırmaz",
            title_en="API responses leak no sensitive fields (password/hash)",
            category=CATEGORY,
            passed=ok,
            detail=f"/api/me: {detail_me} || /api/products: {detail_products}",
        )
    )
    assert ok, f"Sensitive data exposure in an API response. me={detail_me} products={detail_products}"
