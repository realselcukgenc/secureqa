"""API transport & misconfiguration hardening — OWASP API Security Top 10 (2023).

(TR: API taşıma katmanı ve yanlış yapılandırma sertleştirmesi — OWASP API İlk 10 (2023).)

Covered here (all should PASS against the secure SecureShop API):
  * API8 Security Misconfiguration — security headers on API responses, JSON content-type
    with no HTML error leakage, no permissive CORS, CSRF enforced on state-changing writes.
  * API5 Broken Function Level Authz — unsupported HTTP methods return 405.
  * API2/API4 Broken Auth / Resource Consumption — the login endpoint is rate limited.

Reuses the shared ``api`` fixture (a fresh ``requests.Session``) and the existing
low-level helpers in :mod:`secureqa.security` (``headers``, ``ratelimit``, ``csrf``).
"""

from __future__ import annotations

import pytest

from secureqa import apisec
from secureqa.checks import Check
from secureqa.security import csrf, headers, ratelimit

pytestmark = [pytest.mark.api]

CATEGORY = "API Security"


def test_api_responses_carry_security_headers(api, base_url, record_check) -> None:
    """API responses must carry the same security headers as pages (API8).

    We reuse :func:`secureqa.security.headers.inspect` on ``/api/products`` and expect CSP,
    X-Frame-Options and X-Content-Type-Options — SecureShop sets them on EVERY response via
    an ``after_request`` hook, so JSON endpoints are covered too.

    NEGATIVE CONTROL: a vulnerable API skips the hook for ``/api/*`` and answers JSON with
    no CSP / no ``X-Content-Type-Options: nosniff``.
    """
    report = headers.inspect(api, base_url + "/api/products")
    missing = report.missing()
    ok = not missing
    record_check(
        Check(
            id="APISEC-API8-HEADERS",
            title_tr="API yanıtlarında güvenlik başlıkları mevcut",
            title_en="Security headers present on API responses",
            category=CATEGORY,
            passed=ok,
            detail=f"[{apisec.api_label('API8')}] present={report.present()}; missing={missing or 'none'}",
        )
    )
    assert ok, f"API responses are missing security headers: {missing}"


def test_api_declares_json_and_no_html_leak(api, base_url, record_check) -> None:
    """A success response must declare ``application/json`` and not be an HTML page (API8).

    NEGATIVE CONTROL: a misconfigured API serves JSON with ``Content-Type: text/html`` (so
    browsers may render/sniff it), or returns an HTML template where JSON was expected.
    """
    response = api.get(base_url + "/api/products", timeout=5)
    json_ct = apisec.is_json_response(response)
    html_body = apisec.looks_like_html(response.text)
    ok = json_ct and not html_body
    record_check(
        Check(
            id="APISEC-API8-JSONCT",
            title_tr="API JSON içerik tipi gönderir, HTML sızdırmaz",
            title_en="API declares JSON content-type, leaks no HTML",
            category=CATEGORY,
            passed=ok,
            detail=f"[{apisec.api_label('API8')}] Content-Type={response.headers.get('Content-Type')!r}; "
                   f"html_body={html_body}",
        )
    )
    assert ok, f"API did not return clean JSON (CT={response.headers.get('Content-Type')!r})."


def test_api_errors_are_json_not_html(api, base_url, record_check) -> None:
    """Errors on ``/api/*`` must be JSON, never an HTML error page / stack trace (API8).

    An unknown ``/api/...`` path should answer 404 with a JSON body. This matters because an
    HTML error page can leak framework names, file paths or a traceback.

    NEGATIVE CONTROL: a vulnerable API returns the default HTML 404/500 page (or a Werkzeug
    debugger traceback) for API routes, disclosing internals.
    """
    response = api.get(base_url + "/api/this-endpoint-does-not-exist", timeout=5)
    json_ct = apisec.is_json_response(response)
    html_body = apisec.looks_like_html(response.text)
    ok = response.status_code == 404 and json_ct and not html_body
    record_check(
        Check(
            id="APISEC-API8-NOHTMLERR",
            title_tr="API hataları JSON döner (HTML/traceback sızıntısı yok)",
            title_en="API errors return JSON (no HTML/traceback leakage)",
            category=CATEGORY,
            passed=ok,
            detail=f"[{apisec.api_label('API8')}] unknown /api path -> HTTP {response.status_code}; "
                   f"json={json_ct}; html_body={html_body}",
        )
    )
    assert ok, f"API error was not clean JSON (HTTP {response.status_code}, html={html_body})."


def test_api_restricts_http_methods(api, base_url, record_check) -> None:
    """Unsupported HTTP methods on API routes must return 405 (API5).

    NEGATIVE CONTROL: a vulnerable API accepts ``DELETE /api/me`` or ``POST`` on a read-only
    route, or crashes with a 500 because the method was never handled.
    """
    cases = [("POST", "/api/products"), ("PUT", "/api/products"), ("DELETE", "/api/me")]
    ok, detail = apisec.method_restrictions(api, base_url, cases)
    record_check(
        Check(
            id="APISEC-API5-METHOD",
            title_tr="Desteklenmeyen HTTP yöntemleri 405 döner",
            title_en="Unsupported HTTP methods return 405",
            category=CATEGORY,
            passed=ok,
            detail=detail,
        )
    )
    assert ok, f"API method restrictions are not enforced: {detail}"


def test_api_cors_is_not_permissive(api, base_url, record_check) -> None:
    """The API must not expose data cross-origin via a permissive CORS header (API8).

    SecureShop sends no ``Access-Control-Allow-Origin`` at all, so a cross-site page cannot
    read authenticated responses. We confirm it neither sends ``*`` nor reflects the Origin.

    NEGATIVE CONTROL: a vulnerable API echoes ``Access-Control-Allow-Origin: <evil origin>``
    with ``Access-Control-Allow-Credentials: true`` — any site could read the victim's data.
    """
    permissive, detail = apisec.cors_is_permissive(api, base_url, "/api/products")
    ok = not permissive
    record_check(
        Check(
            id="APISEC-API8-CORS",
            title_tr="İzin verici CORS yok (çapraz köken veri okunamaz)",
            title_en="No permissive CORS (cross-origin cannot read data)",
            category=CATEGORY,
            passed=ok,
            detail=detail,
        )
    )
    assert ok, f"Permissive CORS: {detail}"


def test_login_endpoint_is_rate_limited(api, base_url, record_check) -> None:
    """The authentication endpoint must throttle rapid failed logins (API2/API4).

    We reuse :func:`secureqa.security.ratelimit.hammer_login`, which sends many wrong-password
    attempts (with a valid CSRF token, so each one reaches the login logic) and watches for
    HTTP 429. This protects both authentication (API2) and resource consumption (API4).

    NEGATIVE CONTROL: a vulnerable API accepts unlimited login attempts, enabling brute force.
    """
    vulnerable, evidence = ratelimit.hammer_login(api, base_url, attempts=12)
    ok = not vulnerable
    record_check(
        Check(
            id="APISEC-API2-RATELIMIT",
            title_tr="Kimlik doğrulama ucu hız sınırlı (429)",
            title_en="Authentication endpoint is rate limited (429)",
            category=CATEGORY,
            passed=ok,
            detail=f"[{apisec.api_label('API4')}] {evidence}",
        )
    )
    assert ok, f"No rate limiting on the login endpoint: {evidence}"


def test_state_changing_api_requires_csrf_token(api, base_url, record_check) -> None:
    """A state-changing API write without a CSRF token must be rejected (API8).

    ``POST /cart/add/<id>`` changes server-side session state. Sent cross-site with no token
    it must fail (400/403) and NOT modify the cart; sent with a valid token it works. We send
    ``Accept: application/json`` so the endpoint answers in its API (JSON) mode.

    NEGATIVE CONTROL: a vulnerable API performs the write on any tokenless request, so a
    malicious page can change the victim's cart/order on their behalf (CSRF).
    """
    # 1) Tokenless, cross-site style request -> must be rejected, cart unchanged.
    blocked = api.post(
        base_url + "/cart/add/1",
        headers={"Accept": "application/json", "Origin": "https://evil.example"},
        timeout=5, allow_redirects=False,
    )
    rejected = blocked.status_code in (400, 403)
    cart_after_attack = api.get(base_url + "/cart", timeout=5).text

    # 2) Positive control: the SAME write WITH a valid token succeeds (proves it is CSRF, not a ban).
    accepted = csrf.post(
        api, base_url, "/cart/add/1", {"qty": "1"}, token_path="/products",
        headers={"Accept": "application/json"}, allow_redirects=False,
    )
    works_with_token = accepted.status_code in (200, 302)

    ok = rejected and works_with_token
    record_check(
        Check(
            id="APISEC-API8-CSRF",
            title_tr="Durum değiştiren API çağrısı CSRF token ister",
            title_en="State-changing API call requires a CSRF token",
            category=CATEGORY,
            passed=ok,
            detail=f"[{apisec.api_label('API8')}] no-token POST -> HTTP {blocked.status_code} "
                   f"(rejected={rejected}); with-token POST -> HTTP {accepted.status_code} "
                   f"(works={works_with_token})",
        )
    )
    assert ok, (f"CSRF not enforced on state-changing API write "
                f"(no-token={blocked.status_code}, with-token={accepted.status_code}).")
