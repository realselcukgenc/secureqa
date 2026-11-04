"""Self-check for SecureShop using Flask's test client (no browser, no server needed).

Run:  python -m demo_app._selfcheck      (exit code 0 = everything OK)

It visits every route, walks through the main user journeys and verifies the security
controls described in SPEC.md. It is a quick smoke test for the app's author; the real,
much richer test suite lives in ``tests/``.
"""

from __future__ import annotations

import os
import re
import sys
import tempfile
from pathlib import Path
from typing import Any, Callable

from flask.testing import FlaskClient

from . import create_app
from .i18n import TRANSLATIONS

CSRF_RE = re.compile(r'name="csrf_token" value="([^"]+)"')
RESULTS: list[tuple[bool, str]] = []


def check(condition: Any, label: str) -> None:
    """Record one assertion (we keep going after a failure to see the full picture)."""
    RESULTS.append((bool(condition), label))
    print(("  PASS  " if condition else "  FAIL  ") + label)


def token(client: FlaskClient, path: str = "/login") -> str:
    """GET a page and pull the CSRF token out of its HTML."""
    match = CSRF_RE.search(client.get(path).get_data(as_text=True))
    assert match, f"no CSRF token on {path}"
    return match.group(1)


def login(client: FlaskClient, username: str, password: str) -> Any:
    """Log in through the real form (with CSRF token)."""
    return client.post("/login", data={"username": username, "password": password,
                                       "csrf_token": token(client)})


def new_app(**overrides: Any) -> Any:
    """A fresh app with its own temporary database."""
    tmp = tempfile.mkdtemp(prefix="secureshop-")
    config = {"DATABASE": os.path.join(tmp, "shop.sqlite"), "TESTING": True, "ENABLE_RESET": True}
    config.update(overrides)
    return create_app(config)


def section(title: str) -> None:
    print(f"\n== {title}")


def run() -> int:
    app = new_app()
    c = app.test_client()

    section("Public pages")
    for path, marker in [
        ("/", 'data-testid="hero"'),
        ("/products", 'data-testid="product-card"'),
        ("/products?q=kahve", 'id="search-term"'),
        ("/products?cat=home&sort=price_desc", 'data-testid="product-card"'),
        ("/product/1", 'class="review-body"'),
        ("/login", 'id="login-btn"'),
        ("/register", 'id="register-btn"'),
        ("/cart", 'data-testid="cart-empty"'),
        ("/robots.txt", "User-agent"),
    ]:
        r = c.get(path)
        check(r.status_code == 200 and marker in r.get_data(as_text=True), f"GET {path} -> 200 + {marker}")
    check(c.get("/product/9999").status_code == 404, "GET /product/9999 -> 404 friendly page")
    check(c.get("/product/abc").status_code == 404, "GET /product/abc -> 404")
    check(c.get("/healthz").get_json() == {"status": "ok", "app": "SecureShop"}, "GET /healthz JSON")
    check(c.get("/__mode").status_code == 404, "no /__mode route")
    check(c.get("/debug").status_code == 404, "no /debug route")

    section("Search: escaping, Turkish folding, SQLi-safe")
    body = c.get("/products?q=<script>alert(1)</script>").get_data(as_text=True)
    check("<script>alert(1)</script>" not in body and "&lt;script&gt;alert(1)&lt;/script&gt;" in body,
          "reflected q is HTML-escaped in #search-term")
    check(c.get("/products?q=CAY").get_data(as_text=True).count('data-testid="product-card"') >= 1,
          "'CAY' matches 'Çay' (Turkish folding)")
    r = c.get("/products?q=' OR '1'='1' --")
    check(r.status_code == 200 and 'data-testid="no-results"' in r.get_data(as_text=True),
          "SQLi probe in q -> 200, no results, no error")
    data = c.get("/api/products?q=' UNION SELECT username, password_hash FROM users --").get_json()
    check(data["count"] == 0 and data["products"] == [], "/api/products SQLi probe -> empty list")
    data = c.get("/api/products?q=kahve").get_json()
    check(data["count"] >= 1 and {"id", "name", "price"} <= set(data["products"][0]), "/api/products?q=kahve JSON")
    check(c.get("/api/products?q=%25%25%25%25").get_json()["count"] == 0, "LIKE wildcard % is escaped (matches literally)")
    check(c.get("/api/products?q=100%").get_json()["count"] == 1, "'100%' finds the '100% cotton' towel")

    section("Security headers")
    h = c.get("/").headers
    csp = h.get("Content-Security-Policy", "")
    check("script-src 'self'" in csp and "unsafe-inline" not in csp and "frame-ancestors 'none'" in csp, "CSP strict")
    check(h.get("X-Frame-Options") == "DENY", "X-Frame-Options DENY")
    check(h.get("X-Content-Type-Options") == "nosniff", "X-Content-Type-Options nosniff")
    check(h.get("Referrer-Policy") == "strict-origin-when-cross-origin", "Referrer-Policy")
    check("Werkzeug" not in h.get("Server", ""), "Server header hides version")
    html = c.get("/").get_data(as_text=True)
    check(not re.search(r"<script(?![^>]*\bsrc=)[^>]*>", html), "no inline <script> blocks")
    check(not re.search(r"\son[a-z]+=\"", html) and ' style="' not in html, "no inline event handlers / style attrs")

    section("i18n")
    r = c.get("/?lang=en")
    check('<html lang="en"' in r.get_data(as_text=True), "?lang=en -> <html lang=en>")
    cookie = r.headers.get("Set-Cookie", "")
    check("lang=en" in cookie and "HttpOnly" in cookie and "SameSite=Lax" in cookie, "lang cookie with flags")
    check('<html lang="en"' in c.get("/products").get_data(as_text=True), "language remembered via cookie")
    check('<html lang="en"' in c.get("/?lang=<script>").get_data(as_text=True), "invalid lang ignored")
    c.get("/?lang=tr")
    check("Ürünler" in c.get("/products").get_data(as_text=True), "back to Turkish")
    missing = [k for k, v in TRANSLATIONS.items() if set(v) != {"tr", "en"}]
    check(not missing, f"every translation has tr+en {missing or ''}")
    used: set[str] = set()
    root = Path(__file__).parent
    for f in list((root / "templates").glob("*.html")) + list(root.rglob("*.py")):
        used |= set(re.findall(r"\bt\(['\"]([a-z0-9_]+)['\"]", f.read_text(encoding="utf-8")))
    undefined = sorted(k for k in used if k not in TRANSLATIONS and not k.endswith("_"))
    check(not undefined, f"all used i18n keys defined {undefined or ''}")

    section("Login, rate limit, session cookie")
    r1 = login(c, "nobody", "x")
    r2 = login(c, "admin", "wrong")
    b1, b2 = r1.get_data(as_text=True), r2.get_data(as_text=True)
    check('id="login-error"' in b1 and 'id="login-error"' in b2, "#login-error shown")
    e1 = re.search(r'id="login-error".*?<div>(.*?)</div>', b1, re.S)
    e2 = re.search(r'id="login-error".*?<div>(.*?)</div>', b2, re.S)
    check(e1 and e2 and e1.group(1) == e2.group(1), "same generic message for unknown user and wrong password")
    rl = app.test_client()
    codes = [login(rl, "selcuk", f"bad{i}").status_code for i in range(6)]
    check(codes[:5] == [200] * 5 and codes[5] == 429, f"rate limit: 6th failed attempt -> 429 ({codes})")
    r = login(rl, "selcuk", "Selcuk!2026")
    check(r.status_code == 429 and r.headers.get("Retry-After"), "limited even with right password + Retry-After")
    check(login(app.test_client(), "ayse", "ayse2026").status_code == 302, "other account not affected")
    # The test client always uses IP 127.0.0.1, so clear the counters before going on.
    for key in ("login_limiter", "login_ip_limiter"):
        app.extensions[key].reset()
    r = login(c, "selcuk", "Selcuk!2026")
    check(r.status_code == 302, "login selcuk -> redirect")
    sc = r.headers.get("Set-Cookie", "")
    check("HttpOnly" in sc and "SameSite=Lax" in sc, "session cookie HttpOnly + SameSite=Lax")
    check(c.get("/").headers.get("Cache-Control") == "no-store", "Cache-Control no-store when logged in")
    r = c.post("/login?next=https://evil.example", data={"username": "selcuk", "password": "Selcuk!2026",
                                                         "csrf_token": token(c, "/register")})
    check(r.headers.get("Location", "").startswith("/"), "open redirect via ?next= blocked")

    section("Account, CSRF, IDOR")
    body = c.get("/account").get_data(as_text=True)
    check('id="account-username"' in body and ">selcuk<" in body and 'id="account-email"' in body, "/account ids")
    check(c.post("/account/email", data={"email": "x@y.com"}).status_code == 400, "POST /account/email without CSRF -> 400")
    check(c.post("/account/email", data={"email": "x@y.com", "csrf_token": "forged"}).status_code == 400,
          "wrong CSRF token -> 400")
    r = c.post("/account/email", data={"email": "selcuk@example.com", "csrf_token": token(c, "/account")})
    check(r.status_code == 302 and "selcuk@example.com" in c.get("/account").get_data(as_text=True), "email change with token")
    check(c.post("/account/email", data={"email": "bad", "csrf_token": token(c, "/account")}).status_code == 400,
          "invalid email rejected")
    check(c.get("/orders/1").status_code == 200, "own order /orders/1 -> 200")
    check(c.get("/orders/2").status_code == 404, "someone else's order /orders/2 -> 404")
    check(c.get("/orders/999").status_code == 404, "missing order -> 404")
    me = c.get("/api/me").get_json()
    check(me["username"] == "selcuk" and "password_hash" not in me, "/api/me returns own profile, no hash")
    check(app.test_client().get("/api/me").status_code == 401, "/api/me anonymous -> 401")
    check(c.get("/admin").status_code == 403, "/admin as normal user -> 403")
    c.set_cookie("role", "admin")
    check(c.get("/admin").status_code == 403, "role=admin cookie does not grant admin")

    section("Reviews (stored XSS escaped, CSRF)")
    payload = '<img src=x onerror=alert(1)>'
    check(c.post("/product/2/review", data={"body": payload, "rating": "5"}).status_code == 400,
          "review without CSRF -> 400")
    r = c.post("/product/2/review", data={"body": payload, "rating": "4", "csrf_token": token(c, "/product/2")})
    body = c.get("/product/2").get_data(as_text=True)
    check(r.status_code == 302 and payload not in body and "&lt;img src=x onerror=alert(1)&gt;" in body,
          "review stored and rendered escaped in .review-body")
    check(c.post("/product/2/review", data={"body": "x", "rating": "9", "csrf_token": token(c, "/product/2")}).status_code == 400,
          "invalid review rejected")
    anon = app.test_client()
    r = anon.post("/product/2/review", data={"body": "hello there", "csrf_token": token(anon, "/product/2")})
    check(r.status_code == 302 and "/login" in r.headers["Location"], "anonymous review -> login")

    section("Cart & checkout")
    check(c.post("/cart/add/1", data={}).status_code == 400, "cart add without CSRF -> 400")
    t = token(c, "/products")
    check(c.post("/cart/add/1", data={"csrf_token": t, "qty": "2"}).status_code == 302, "POST /cart/add/1 (form)")
    j = c.post("/cart/add/3", data={"csrf_token": t}, headers={"Accept": "application/json"}).get_json()
    check(j["ok"] and j["count"] == 3, "POST /cart/add/3 (fetch/JSON) count=3")
    check(c.post("/cart/add/12", data={"csrf_token": t}).status_code == 302, "sold-out product refused (redirect + toast)")
    check(c.post("/cart/add/999", data={"csrf_token": t}, headers={"Accept": "application/json"}).status_code == 400,
          "unknown product -> 400")
    body = c.get("/cart").get_data(as_text=True)
    check(body.count('data-testid="cart-item"') == 2 and 'id="cart-total"' in body, "/cart shows 2 lines + total")
    check(c.post("/cart/update/3", data={"csrf_token": t, "qty": "99"}).status_code == 302, "update qty (clamped)")
    check(c.post("/cart/remove/3", data={"csrf_token": t}).status_code == 302, "remove line")
    body = c.get("/checkout").get_data(as_text=True)
    check('id="checkout-btn"' in body and "4242 4242 4242 4242" in body, "/checkout form prefilled with test card")
    form = {"csrf_token": token(c, "/checkout"), "ship_name": "Selçuk Genç", "ship_address": "Atatürk Blv. 10",
            "ship_city": "Ankara", "card_number": "5555 5555 5555 4444", "card_exp": "12/30", "card_cvc": "123"}
    r = c.post("/checkout", data=form)
    check(r.status_code == 400 and 'id="checkout-error"' in r.get_data(as_text=True), "non-test card rejected")
    form["card_number"] = "4242 4242 4242 4242"
    r = c.post("/checkout", data=form)
    check(r.status_code == 302 and "/orders/" in r.headers["Location"], "checkout -> redirect to order")
    body = c.get(r.headers["Location"]).get_data(as_text=True)
    check('id="order-confirmation"' in body, "#order-confirmation shown after checkout")
    check('id="order-confirmation"' not in c.get(r.headers["Location"]).get_data(as_text=True), "confirmation only once")
    check('data-testid="cart-empty"' in c.get("/cart").get_data(as_text=True), "cart emptied")
    r = c.get("/checkout")
    check(r.status_code == 302, "empty-cart checkout -> back to cart")
    check(anon.get("/checkout").status_code == 302, "anonymous checkout -> login")

    section("Register")
    rc = app.test_client()
    r = rc.post("/register", data={"username": "deneme", "password": "1", "csrf_token": token(rc, "/register")})
    check(r.status_code == 400 and 'id="register-error"' in r.get_data(as_text=True), "weak password -> #register-error")
    r = rc.post("/register", data={"username": "selcuk", "password": "GoodPass123", "csrf_token": token(rc, "/register")})
    check(r.status_code == 400, "duplicate username rejected")
    r = rc.post("/register", data={"username": "<b>x</b>", "password": "GoodPass123", "csrf_token": token(rc, "/register")})
    check(r.status_code == 400, "invalid username rejected")
    r = rc.post("/register", data={"username": "yeni_kullanici", "email": "yeni@example.com", "password": "GuvenliSifre42",
                                   "csrf_token": token(rc, "/register")})
    check(r.status_code == 302 and "yeni_kullanici" in rc.get("/account").get_data(as_text=True), "register + auto login")
    check(rc.get("/api/me").get_json()["role"] == "user", "new users always get role 'user'")

    section("Admin")
    ac = app.test_client()
    check(ac.get("/admin").status_code == 302, "/admin anonymous -> login")
    r = login(ac, "admin", "admin123")
    check(r.headers.get("Location") == "/admin", "admin login lands on /admin")
    body = ac.get("/admin").get_data(as_text=True)
    check('id="admin-panel"' in body and "password_hash" not in body and "scrypt" not in body, "#admin-panel, no hashes")
    check(ac.get("/orders/2").status_code == 200, "admin can view any order")
    check(ac.get("/logout").status_code == 302 and ac.get("/account").status_code == 302, "logout ends session")

    section("Errors + reset")
    r = c.get("/does-not-exist")
    check(r.status_code == 404 and 'data-testid="error-page"' in r.get_data(as_text=True), "friendly 404")
    check(c.get("/api/nothing").get_json()["status"] == 404, "API 404 is JSON")
    check(c.put("/login").status_code == 405, "405 friendly")
    check(c.post("/__reset").get_json() == {"status": "reset"}, "POST /__reset works when enabled")
    check(login(app.test_client(), "selcuk", "Selcuk!2026").status_code == 302, "reset also cleared rate limiter")
    prod = new_app(ENABLE_RESET=False).test_client()
    check(prod.post("/__reset").status_code == 404, "POST /__reset -> 404 when SHOP_TESTING is off")

    failed = [label for ok, label in RESULTS if not ok]
    print(f"\n{len(RESULTS) - len(failed)}/{len(RESULTS)} checks passed")
    for label in failed:
        print("  FAILED:", label)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(run())
