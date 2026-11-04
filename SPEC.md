# SecureQA — Shared Project Spec (contract between all parts)

Owner: Selçuk Genç (github.com/realselcukgenc). Portfolio project: security-focused test automation.
Audience: a QA automation engineer with LIMITED Python knowledge who is learning Python, and who
holds ethical-hacking / network-security certificates. Everything user-facing is bilingual **Turkish + English**
with a language switcher (default TR). UI quality matters a lot: modern, polished, responsive, dark/light.

Environment: Python 3.13, venv at `/home/user/secureqa/.venv` (flask, pytest, playwright 1.64, pytest-html, requests installed).
Activate with `. /home/user/secureqa/.venv/bin/activate`. Chromium for Playwright: the bundled browser download
does NOT exist here; launch with `executable_path=os.environ.get("PW_CHROMIUM_PATH")` when set
(set `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` locally). Never run `playwright install` here.
No external network at runtime for the app: no CDNs in demo_app or reports (vendor nothing; write your own CSS/JS).
The learning guide (learn/) MAY load Pyodide from cdn.jsdelivr.net (exact version, e.g. pyodide v0.26.4).

## Repository layout
```
secureqa/
  SPEC.md                 this file
  README.md               bilingual (TR first, then EN) — written at the end
  requirements.txt
  demo_app/               PART A — "VulnShop" intentionally vulnerable shop (Flask)
  secureqa/               PART B — the framework package (pytest + Playwright, POM)
  tests/                  PART B — test suites
  reports/                PART B — generated output (gitignored except .gitkeep)
  learn/                  PART C — interactive Python learning guide (static site)
  .github/workflows/ci.yml
```

## PART A — demo_app "VulnShop"
Flask app, `python -m demo_app` starts it on `127.0.0.1:5000` (host/port overridable via env `VULNSHOP_HOST`, `VULNSHOP_PORT`).
SQLite DB (file in instance dir, auto-created & seeded on start; `POST /__reset` resets DB — only enabled in debug/test).
**Safety:** binds to 127.0.0.1 by default; prominent banner "Intentionally vulnerable — for local training only".
No real command execution, no file system traversal outside a sandbox folder, no outbound requests (SSRF is simulated).

**Mode switch:** env `VULNSHOP_MODE=vulnerable` (default) or `secure`. In `secure` mode every vulnerability below is fixed
(parameterized queries, escaping, CSRF tokens, security headers, proper authz, rate limiting, secure cookies flags except
`Secure` on http). This lets the test suite show RED (vulnerable) vs GREEN (secure). `GET /__mode` returns `{"mode": "..."}`.

**i18n:** `?lang=tr|en` sets a cookie `lang`; all UI strings via a dict-based translation in `demo_app/i18n.py`.

Seed users (username / password / role):
- `admin` / `admin123` / admin
- `selcuk` / `Selcuk!2026` / user  (id 2)
- `ayse` / `ayse2026` / user (id 3)
Seed: ~12 products (Turkish-flavored names, prices in TL), some reviews.

### Routes (stable contract — tests depend on these; also stable element ids / data-testid)
| Route | Purpose | Vulnerability (vulnerable mode) |
|---|---|---|
| `GET /` | home, featured products | — |
| `GET /products?q=` | search; echoes "Results for: {q}" in `#search-term` | **Reflected XSS** (q unescaped) + **SQLi** in LIKE query |
| `GET /product/<id>` | detail + reviews | **Stored XSS** in reviews (`.review-body`) |
| `POST /product/<id>/review` | add review (field `body`) | stored XSS, **no CSRF token** |
| `GET/POST /login` | fields `#username`, `#password`, button `#login-btn`; error `#login-error` | **SQLi auth bypass** (`' OR '1'='1' --`), **no rate limit**, **user enumeration** (different messages "user not found" vs "wrong password") |
| `GET /logout` | | — |
| `GET/POST /register` | `#username`, `#password`, `#register-btn` | **weak password policy** (accepts "1") |
| `GET /account` | profile of logged-in user, `#account-username`, `#account-email` | — |
| `GET /orders/<id>` | order detail | **IDOR** (any logged-in user sees any order) |
| `GET /api/users/<id>` | JSON user | **IDOR + sensitive data exposure** (returns `password_hash`, `email`) without auth |
| `GET /api/products?q=` | JSON search | SQLi |
| `GET /admin` | admin panel `#admin-panel` | **Broken access control**: checks a client cookie `role=admin` instead of session |
| `POST /account/email` | change email (field `email`) | **CSRF** (no token, SameSite unset) |
| `GET /redirect?next=` | | **Open redirect** |
| `GET /download?file=` | serves files from `demo_app/files/` | **Path traversal** (simulated: allows `../` within project dir only to read a fake `secret.txt` placed at `demo_app/secret.txt`; never beyond project root) |
| `GET /tools/ping?host=` | "network tool" | **Command injection — SIMULATED**: never executes shell; if input contains `;`,`&&`,`|` it returns a fake output including `uid=33(www-data)` to demonstrate. |
| `GET /debug` | | **Info disclosure**: shows config/stack/version in vulnerable mode; 404 in secure |
| any | response headers | vulnerable: no CSP, no X-Frame-Options, no X-Content-Type-Options, `Server: VulnShop/0.9 Werkzeug`; session cookie without HttpOnly/SameSite |
| `GET /robots.txt` | lists `/admin`, `/debug` | — |

Error pages: vulnerable mode shows verbose stack traces (generic 500 page with traceback); secure mode shows a friendly page.

## PART B — secureqa framework + tests
- Package `secureqa/`: `config.py` (base_url from env `BASE_URL` default `http://127.0.0.1:5000`, browser, headless, lang),
  `pages/` (Page Object Model: BasePage, LoginPage, ProductsPage, ProductPage, AccountPage, AdminPage),
  `security/` (reusable checks: headers.py, cookies.py, xss.py with payload list, sqli.py, access_control.py, redirects.py,
  traversal.py, info_disclosure.py, ratelimit.py), `findings.py` (Finding dataclass: id, title_tr, title_en, severity
  [critical/high/medium/low/info], owasp (e.g. "A03:2021-Injection"), cwe, url, evidence, remediation_tr, remediation_en),
  `report/` (custom bilingual HTML dashboard generator — beautiful, self-contained single HTML file, charts drawn with
  inline SVG, filter by severity/OWASP, TR/EN toggle, dark/light; also JSON output).
- `tests/conftest.py`: starts the demo app automatically in a subprocess (unless `BASE_URL` points elsewhere / `--no-server`),
  waits for health, provides `page`, `api` (requests session) fixtures, resets DB between modules, collects findings,
  writes `reports/security-report.html` + `reports/findings.json` at session end. Option `--mode vulnerable|secure`.
- `tests/functional/` normal UI tests (login works, search works, add review, i18n switch).
- `tests/security/` one file per category. **Semantics:** a security test FAILS when the vulnerability is present
  (so vulnerable mode → many red, secure mode → all green). Use pytest markers: `security`, `functional`, `owasp_a01` … etc.
- Every source file has clear docstrings and comments in English with occasional Turkish notes — the code itself is a
  teaching tool; keep it idiomatic but readable for a Python beginner (type hints, no clever tricks).
- `Makefile` / or `run.py` with commands: `run-app`, `test`, `test-secure`, `report`.

## PART C — learn/ interactive Python guide
Static site (open `learn/index.html`, no build step). Bilingual TR/EN toggle, dark/light, beautiful.
Runs real Python in the browser via Pyodide. Curriculum tailored to a test-automation engineer, every lesson ties back
to code in this repo (show real snippets from secureqa/ and tests/ and explain them line by line).
Lessons: 1 variables & types, 2 strings & f-strings, 3 lists/dicts, 4 if/loops, 5 functions & type hints, 6 classes & POM,
7 modules/imports/packages, 8 exceptions, 9 files & JSON, 10 decorators & fixtures (pytest), 11 pytest basics & markers,
12 Playwright sync API, 13 HTTP & requests, 14 dataclasses (Finding), 15 security mindset: how the XSS/SQLi checks work.
Each lesson: explanation, runnable editable code cells, exercises with auto-check (hidden asserts), hints, quiz, progress
saved in localStorage (try/catch), XP/badges. Lesson content lives in `learn/lessons/*.js` (or JSON) so it's easy to extend.


---
## ⚠️ PLAN CHANGE (supersedes PART A above)
The intentionally vulnerable "VulnShop" will NOT be built. New plan — two targets:

### Target 1 — `demo_app/` "SecureShop" (functional target, built by a new Part A agent)
A beautiful, bilingual (TR/EN), dark/light, responsive Flask e-commerce demo, built **securely** (no intentional vulns).
Same run contract: `python -m demo_app` on 127.0.0.1:5000 (env VULNSHOP_HOST/PORT also accepted as SHOP_HOST/SHOP_PORT),
same seed users, products, same routes for: `/`, `/products?q=` (`#search-term` shows escaped term), `/product/<id>` (+ reviews `.review-body`),
`POST /product/<id>/review` (with CSRF token), `/login` (`#username`,`#password`,`#login-btn`,`#login-error` — generic message),
`/logout`, `/register` (`#register-btn`, password policy errors in `#register-error`), `/account` (`#account-username`,`#account-email`),
`/orders/<id>` (owner-only, 404/403 otherwise), `/api/products?q=` (JSON), `/api/me` (JSON, auth), `/admin` (`#admin-panel`, session-role-based),
`POST /account/email` (CSRF protected), `/cart`, `POST /cart/add/<id>`, `/checkout` (fake payment form, `#checkout-btn`, `#order-confirmation`), `/healthz`.
Proper security headers (CSP, X-Frame-Options, nosniff, Referrer-Policy), HttpOnly+SameSite cookies, login rate limit (5/min),
friendly error pages. No `/__mode`; `POST /__reset` enabled only when env `SHOP_TESTING=1`.
Security tests against SecureShop are **defensive regression checks** that should PASS (headers, cookies, CSRF present,
authz enforced, output escaping, generic login errors, rate limiting, password policy).

### Target 2 — OWASP Juice Shop (security target)
Well-known open-source intentionally vulnerable app (https://github.com/juice-shop/juice-shop), run locally on 127.0.0.1:3000.
User runs it with `docker run -p 3000:3000 bkimminich/juice-shop`. In this container, install from the official GitHub
release prebuilt tarball (node22 linux x64) into `/home/user/juice-shop` (outside repo) and run `npm start`.
Security suite `tests/juiceshop/` uses its documented training challenges (score board `/#/score-board`,
`/api/Challenges` to verify solved challenges) — findings are expected; tests are marked `juiceshop`.
Juice Shop is optional in CI (skipped unless `JUICE_SHOP_URL` set or the CI job starts the docker service).

### Changes by SecureShop agent
- `/healthz` → `{"status":"ok","app":"SecureShop"}` (no `/__mode`; `secureqa/server.py` should wait on `/healthz`).
- `POST /__reset` enabled by `SHOP_TESTING=1` **or** the legacy `VULNSHOP_TESTING=1` (server.py still sets it); also clears rate limiters. CSRF-exempt. 404 otherwise.
- Extra env: `SHOP_DB` (sqlite path, default `instance/secureshop.sqlite` in repo root, git-ignored), `SHOP_SECRET_KEY`, `SHOP_SECURE_COOKIES=1` (adds `Secure`).
- Login rate limit: 5 **failed** attempts / 60 s per IP+username → HTTP 429 (+`Retry-After`, message in `#login-error`); plus 30 failures/min per IP. Successful logins are not counted. Failed login = HTTP 200 + generic `#login-error`.
- CSRF: hidden field `csrf_token` (or header `X-CSRF-Token`) on every POST; missing/wrong → HTTP 400 friendly page. Logout is `GET/POST /logout`.
- `/orders/<id>`: not logged in → 302 to `/login?next=…`; someone else's order → **404** (admin may view all). `/admin`: anonymous → 302 login, non-admin → 403.
- Register: `#email` optional; policy = ≥8 chars, a letter, a digit, ≠ username, not a common password; failures → HTTP 400 with `#register-error`.
- `/api/products?q=` → `{"query", "count", "products":[{id,name,name_tr,name_en,category,price,price_kurus,currency,rating,review_count,in_stock}]}`; `/api/me` → 401 JSON when anonymous.
- Extra routes: `POST /cart/update/<id>`, `POST /cart/remove/<id>`, `/robots.txt`. `POST /cart/add/<id>` returns JSON when `Accept: application/json`.
- Checkout accepts only the test card `4242 4242 4242 4242` (prefilled) and redirects to `/orders/<id>` which shows `#order-confirmation` once.
- Seed: 12 products (id 12 is out of stock), 9 reviews, 3 orders (#1, #3 selcuk; #2 ayse). Full selector list: `demo_app/TESTIDS.md`. Self-check: `python -m demo_app._selfcheck`.
