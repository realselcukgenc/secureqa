"""Reusable building blocks for REST API security checks (TR: API güvenlik yapı taşları).

Each function here does ONE small thing against SecureShop's JSON API and returns a plain
``(ok, detail)`` tuple, so a test can wrap it in a :class:`~secureqa.checks.Check` with one
line. Keeping the HTTP logic here (not inside the tests) makes the tests short and lets a
beginner study one API-security technique at a time.
(TR: Her fonksiyon tek bir kontrol yapar ve ``(ok, detail)`` döndürür; testler kısalır.)

We deliberately reuse the lower-level helpers that already exist for the browser app:
  * :mod:`secureqa.security.headers`   — inspect security response headers
  * :mod:`secureqa.security.csrf`      — read a CSRF token and POST with it
  * :mod:`secureqa.security.ratelimit` — hammer the login endpoint
"""

from __future__ import annotations

import json
import re
from typing import Any

import requests

from secureqa.security import csrf

# --------------------------------------------------------------------------- OWASP API 2023
# OWASP API Security Top 10 (2023) — bilingual labels used across the API checks.
# TR: OWASP API Güvenliği İlk 10 (2023) — kontrollerde kullanılan iki dilli etiketler.
OWASP_API_2023: dict[str, dict[str, str]] = {
    "API1": {"tr": "Nesne Seviyesi Yetki İhlali (BOLA)",
             "en": "Broken Object Level Authorization (BOLA)"},
    "API2": {"tr": "Kimlik Doğrulama Zafiyetleri",
             "en": "Broken Authentication"},
    "API3": {"tr": "Nesne Özellik Seviyesi Yetki İhlali",
             "en": "Broken Object Property Level Authorization"},
    "API4": {"tr": "Sınırsız Kaynak Tüketimi",
             "en": "Unrestricted Resource Consumption"},
    "API5": {"tr": "Fonksiyon Seviyesi Yetki İhlali",
             "en": "Broken Function Level Authorization"},
    "API8": {"tr": "Güvenlik Yanlış Yapılandırması",
             "en": "Security Misconfiguration"},
}


def api_label(code: str) -> str:
    """Return a short ``"API8:2023 Security Misconfiguration"`` style label for a detail string."""
    entry = OWASP_API_2023.get(code, {"en": code})
    return f"{code}:2023 {entry['en']}"


# --------------------------------------------------------------------------- tiny primitives
# A JSON response must declare this content type (optionally with a charset suffix).
_JSON_CT_RE = re.compile(r"^application/(?:[\w.+-]+\+)?json\b", re.IGNORECASE)

# Signs that a response body is an HTML page (error page / template) rather than JSON.
# TR: Yanıtın JSON yerine HTML sayfası olduğunu gösteren işaretler.
_HTML_SIGNS: tuple[str, ...] = ("<!doctype", "<html", "<head", "<body", "traceback (most recent")

# Field names that must NEVER appear in an API response (secret material).
# TR: Bir API yanıtında ASLA görünmemesi gereken alan adları.
_SENSITIVE_KEY_RE = re.compile(
    r"^(password|passwd|pwd|password_hash|pw_hash|pwhash|hash|salt|secret|secret_key|token)$",
    re.IGNORECASE,
)


def is_json_response(response: requests.Response) -> bool:
    """True when the ``Content-Type`` header declares JSON."""
    return bool(_JSON_CT_RE.match(response.headers.get("Content-Type", "")))


def looks_like_html(text: str) -> bool:
    """True when the body looks like an HTML document / error page / stack trace."""
    head = text.lstrip()[:400].lower()
    return any(sign in head for sign in _HTML_SIGNS)


def _walk_keys(obj: Any) -> list[str]:
    """Yield every key name found anywhere in a nested JSON structure."""
    found: list[str] = []
    if isinstance(obj, dict):
        for key, value in obj.items():
            found.append(str(key))
            found.extend(_walk_keys(value))
    elif isinstance(obj, list):
        for item in obj:
            found.extend(_walk_keys(item))
    return found


# --------------------------------------------------------------------------- checks
def authentication_required(
    session: requests.Session, base_url: str, path: str = "/api/me"
) -> tuple[bool, str]:
    """A protected API endpoint must demand authentication (OWASP API2:2023).

    We send the request with NO session cookie and expect a machine-readable **401**
    (or 403). A *secure* API must not answer 200 with the data, and must not answer with a
    302 redirect to an HTML login page — an API client cannot follow that.

    NEGATIVE CONTROL (what a *vulnerable* API would do): return ``200`` with the user's
    profile to anyone, or ``302 -> /login`` (HTML) instead of ``401``.

    Returns ``(ok, detail)`` — ``ok`` means the endpoint is correctly protected.
    """
    session.cookies.clear()
    response = session.get(base_url + path, timeout=5, allow_redirects=False)
    status = response.status_code
    is_401_403 = status in (401, 403)
    not_redirect = status not in (301, 302, 303, 307, 308)
    json_body = is_json_response(response)
    ok = is_401_403 and not_redirect and json_body
    detail = (f"[{api_label('API2')}] unauth GET {path} -> HTTP {status}; "
              f"json={json_body}; redirect={not not_redirect}")
    return ok, detail


def no_idor_on_resource(
    session: requests.Session, base_url: str, template: str, foreign_marker: str,
    id_range: range = range(1, 8),
) -> tuple[bool, str]:
    """Id-based resources must be owner-only — no BOLA/IDOR (OWASP API1:2023).

    ``session`` is already logged in as one user. We walk the numeric id in ``template``
    (e.g. ``"/orders/{id}"``) and make sure that for every id we either get *our own*
    resource or a **404/403** — never a 200 that contains ``foreign_marker`` (data that
    belongs to another user).

    NEGATIVE CONTROL (vulnerable API): returns 200 with another customer's order just by
    incrementing the id in the URL — the classic Broken Object Level Authorization bug.

    Returns ``(ok, detail)``.
    """
    statuses: list[str] = []
    leaked_at = ""
    for resource_id in id_range:
        url = base_url + template.format(id=resource_id)
        response = session.get(url, timeout=5, allow_redirects=False)
        statuses.append(f"{resource_id}:{response.status_code}")
        if response.status_code == 200 and foreign_marker.lower() in response.text.lower():
            leaked_at = url
            break
    ok = leaked_at == ""
    detail = (f"[{api_label('API1')}] statuses " + ", ".join(statuses)
              + ("" if ok else f"; LEAKED foreign data at {leaked_at}"))
    return ok, detail


def method_restrictions(
    session: requests.Session, base_url: str, cases: list[tuple[str, str]]
) -> tuple[bool, str]:
    """Disallowed HTTP methods on API routes must return 405 (OWASP API5:2023).

    ``cases`` is a list of ``(method, path)`` pairs that the route does NOT support, e.g.
    ``[("POST", "/api/products"), ("DELETE", "/api/me")]``. Each must answer **405 Method
    Not Allowed** with a JSON body (not an HTML page).

    NEGATIVE CONTROL (vulnerable API): accepts ``DELETE /api/me`` or ``POST`` on a read-only
    route, or answers 500 because the method was never considered.

    Returns ``(ok, detail)``.
    """
    results: list[str] = []
    ok = True
    for method, path in cases:
        response = session.request(method, base_url + path, timeout=5, allow_redirects=False)
        json_body = is_json_response(response)
        allow = response.headers.get("Allow", "")
        good = response.status_code == 405 and json_body and not looks_like_html(response.text)
        ok = ok and good
        results.append(f"{method} {path}->{response.status_code}(Allow:{allow or '-'})")
    detail = f"[{api_label('API5')}] " + "; ".join(results)
    return ok, detail


def cors_is_permissive(
    session: requests.Session, base_url: str, path: str = "/api/products",
    origin: str = "https://evil.example",
) -> tuple[bool, str]:
    """Check whether the API hands out a permissive CORS header (OWASP API8:2023).

    A browser only lets a cross-site page *read* an API response if the server opts in with
    ``Access-Control-Allow-Origin``. A safe API either sends no such header, or echoes only
    an allow-list — never ``*`` (especially with credentials) and never a blind reflection
    of the caller's ``Origin``.

    NEGATIVE CONTROL (vulnerable API): returns ``Access-Control-Allow-Origin: *`` together
    with ``Access-Control-Allow-Credentials: true``, letting *any* website read logged-in
    data on the victim's behalf.

    Returns ``(is_permissive, detail)`` — note this reports the *bad* condition, so the test
    passes when it is ``False``.
    """
    response = session.get(base_url + path, headers={"Origin": origin}, timeout=5)
    acao = response.headers.get("Access-Control-Allow-Origin")
    acac = response.headers.get("Access-Control-Allow-Credentials", "")
    wildcard = acao == "*"
    reflected = acao is not None and acao == origin
    permissive = wildcard or reflected
    detail = (f"[{api_label('API8')}] Origin={origin} -> "
              f"ACAO={acao!r}, Allow-Credentials={acac!r}; "
              f"{'PERMISSIVE' if permissive else 'not permissive (good)'}")
    return permissive, detail


def no_sensitive_fields(response: requests.Response) -> tuple[bool, str]:
    """No secret fields (password/hash/salt/token) may appear in an API response (API3:2023).

    We parse the JSON and look for dangerous *key names* anywhere in the structure, and also
    do a raw-text check for ``password_hash`` as a belt-and-braces guard.

    NEGATIVE CONTROL (vulnerable API): serialises the whole DB row, so the response includes
    ``"password_hash": "scrypt:..."`` — excessive data exposure at the property level.

    Returns ``(ok, detail)``.
    """
    offenders: list[str] = []
    try:
        data = response.json()
        offenders = sorted({k for k in _walk_keys(data) if _SENSITIVE_KEY_RE.match(k)})
    except (ValueError, json.JSONDecodeError):
        pass
    raw_hit = "password_hash" in response.text.lower()
    ok = not offenders and not raw_hit
    detail = (f"[{api_label('API3')}] sensitive keys={offenders or 'none'}; "
              f"'password_hash' in body={raw_hit}")
    return ok, detail


def register_ignores_extra_fields(
    session: requests.Session, base_url: str, username: str, password: str, email: str,
) -> tuple[bool, str]:
    """Extra fields on a write endpoint must be ignored — mass-assignment guard (API3:2023).

    We register a brand-new account but sneak in ``role=admin`` and ``is_admin=1``. A secure
    server derives the role server-side (always ``'user'`` for self-registration) and ignores
    anything extra the client sent. We then read ``/api/me`` and confirm the role is ``user``.

    NEGATIVE CONTROL (vulnerable API): binds the request body straight onto the user model, so
    ``role=admin`` is honoured and the attacker self-promotes to administrator.

    Returns ``(ok, detail)``.
    """
    # A token-bearing POST, so CSRF does not mask the mass-assignment behaviour we are testing.
    csrf.post(
        session, base_url, "/register",
        {"username": username, "password": password, "email": email,
         "role": "admin", "is_admin": "1", "admin": "true"},
        token_path="/register", allow_redirects=True,
    )
    me = session.get(base_url + "/api/me", timeout=5)
    role = ""
    try:
        role = str(me.json().get("role", ""))
    except (ValueError, json.JSONDecodeError):
        role = "<non-json>"
    ok = role == "user"
    detail = (f"[{api_label('API3')}] registered with role=admin extra field; "
              f"/api/me role={role!r} (expected 'user')")
    return ok, detail
