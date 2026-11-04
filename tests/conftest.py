"""pytest configuration: starts SecureShop, wires Juice Shop, collects results.

What this file does, in plain terms (TR: bu dosyanın işi):
  1. Starts ``python -m demo_app`` (SecureShop) once per test session.
  2. Gives tests a browser ``page`` and an HTTP ``api`` session.
  3. Resets SecureShop's database before each test (best effort).
  4. Provides a ``juice`` fixture (OWASP Juice Shop client) that SKIPS when the app is
     not reachable (controlled by the ``JUICE_SHOP_URL`` environment variable).
  5. Collects :class:`Finding` (Juice Shop) and :class:`Check` (SecureShop) results and,
     at session end, writes the combined HTML + JSON report.

Beginners: a *fixture* is a ready-made object pytest hands to any test that asks for it
by naming it as a function argument. (TR: fixture = teste hazır verilen nesne.)
"""

from __future__ import annotations

import os
from typing import Iterator

import pytest
import requests

from secureqa.browser import launch_browser
from secureqa.checks import Check, ChecksCollector
from secureqa.config import DEFAULT_JUICE_SHOP_URL, PROJECT_ROOT, Settings
from secureqa.findings import Finding, FindingsCollector
from secureqa.juiceshop import JuiceShopClient
from secureqa.report.generator import write_report
from secureqa.server import DemoServer


# --------------------------------------------------------------------------- CLI options
def pytest_addoption(parser: pytest.Parser) -> None:
    """Add SecureQA command-line options to pytest."""
    group = parser.getgroup("secureqa")
    group.addoption(
        "--no-server",
        action="store_true",
        default=False,
        help="Do not start SecureShop; test an already-running BASE_URL.",
    )


def pytest_configure(config: pytest.Config) -> None:
    """Register custom markers so ``-m`` filtering works and pytest does not warn."""
    markers = [
        "functional: normal behaviour tests against SecureShop (login, search, cart, i18n).",
        "security: a defensive regression check against SecureShop (should PASS).",
        "juiceshop: an attack against OWASP Juice Shop (a finding is EXPECTED).",
        "owasp_a01: Broken Access Control.",
        "owasp_a02: Cryptographic Failures.",
        "owasp_a03: Injection.",
        "owasp_a04: Insecure Design.",
        "owasp_a05: Security Misconfiguration.",
        "owasp_a07: Identification and Authentication Failures.",
        "owasp_a09: Security Logging and Monitoring Failures.",
    ]
    for marker in markers:
        config.addinivalue_line("markers", marker)


# --------------------------------------------------------------------------- settings
@pytest.fixture(scope="session")
def settings() -> Settings:
    """A :class:`Settings` object built from the environment."""
    return Settings()


# --------------------------------------------------------------------------- SecureShop server
@pytest.fixture(scope="session")
def base_url(request: pytest.FixtureRequest) -> Iterator[str]:
    """Start SecureShop (once) and yield its base URL; stop it at the end.

    If ``BASE_URL`` is set or ``--no-server`` is passed, we assume it is already running.
    (TR: BASE_URL verilmişse uygulamayı başlatmayız; zaten çalışıyor varsayarız.)
    """
    external = os.environ.get("BASE_URL")
    if external or request.config.getoption("--no-server"):
        yield (external or "http://127.0.0.1:5000").rstrip("/")
        return

    server = DemoServer()
    server.start()
    try:
        yield server.base_url
    finally:
        server.stop()


@pytest.fixture(scope="function", autouse=True)
def _reset_db(request: pytest.FixtureRequest) -> None:
    """Reset the SecureShop database before each SecureShop test (best effort).

    Juice Shop tests do not use SecureShop, so we skip the reset for them.
    (TR: Her SecureShop testinden önce veritabanını sıfırlar.)
    """
    if "juice" in request.fixturenames or request.node.get_closest_marker("juiceshop"):
        return
    if "base_url" not in request.fixturenames:
        return
    url = request.getfixturevalue("base_url")
    try:
        requests.post(url + "/__reset", timeout=5)
    except requests.RequestException:
        pass


# --------------------------------------------------------------------------- HTTP + browser
@pytest.fixture()
def api(base_url: str) -> Iterator[requests.Session]:
    """A ``requests.Session`` with the base URL remembered (for API/security checks)."""
    session = requests.Session()
    session.base_url = base_url  # type: ignore[attr-defined]  # handy extra attribute
    yield session
    session.close()


@pytest.fixture(scope="session")
def _playwright() -> Iterator:
    """Start Playwright once for the whole session (internal helper)."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        yield playwright


@pytest.fixture(scope="session")
def _browser(_playwright, settings: Settings) -> Iterator:
    """Launch one browser for the whole session (internal helper)."""
    browser = launch_browser(_playwright, settings)
    yield browser
    browser.close()


@pytest.fixture()
def page(_browser, settings: Settings) -> Iterator:
    """A fresh browser page (new context) for each test, with an XSS probe installed."""
    from secureqa.security.xss import install_xss_probe

    context = _browser.new_context(ignore_https_errors=True)
    context.set_default_timeout(settings.timeout_ms)
    page = context.new_page()
    install_xss_probe(page)
    yield page
    context.close()


# --------------------------------------------------------------------------- Juice Shop
@pytest.fixture(scope="session")
def juice_shop_url(settings: Settings) -> str | None:
    """The Juice Shop URL from ``JUICE_SHOP_URL`` (or the default when explicitly asked)."""
    return settings.juice_shop_url


@pytest.fixture()
def juice(juice_shop_url: str | None) -> Iterator[JuiceShopClient]:
    """A :class:`JuiceShopClient`, or SKIP the test when Juice Shop is not reachable.

    Set ``JUICE_SHOP_URL=http://127.0.0.1:3000`` to enable these tests.
    (TR: Juice Shop erişilebilir değilse test atlanır.)
    """
    url = juice_shop_url or DEFAULT_JUICE_SHOP_URL
    client = JuiceShopClient(url)
    if juice_shop_url is None and not client.is_reachable():
        pytest.skip("Juice Shop is not running. Set JUICE_SHOP_URL to enable these tests.")
    if not client.is_reachable():
        pytest.skip(f"Juice Shop not reachable at {url}.")
    yield client


# --------------------------------------------------------------------------- collectors
@pytest.fixture(scope="session")
def findings() -> FindingsCollector:
    """The shared collector that gathers Juice Shop findings across the session."""
    return FindingsCollector()


@pytest.fixture(scope="session")
def checks() -> ChecksCollector:
    """The shared collector that gathers SecureShop defensive-check results."""
    return ChecksCollector()


@pytest.fixture()
def record_finding(findings: FindingsCollector, request: pytest.FixtureRequest):
    """Return a function tests call to record a :class:`Finding` (Juice Shop)."""
    def _record(finding: Finding) -> Finding:
        if not finding.test_id:
            finding.test_id = request.node.nodeid
        return findings.add(finding)

    return _record


@pytest.fixture()
def record_check(checks: ChecksCollector, request: pytest.FixtureRequest):
    """Return a function tests call to record a :class:`Check` (SecureShop defense)."""
    def _record(check: Check) -> Check:
        if not check.test_id:
            check.test_id = request.node.nodeid
        return checks.add(check)

    return _record


@pytest.fixture(scope="session", autouse=True)
def _attach_collectors(request: pytest.FixtureRequest, findings: FindingsCollector, checks: ChecksCollector) -> None:
    request.config._secureqa_findings = findings  # type: ignore[attr-defined]
    request.config._secureqa_checks = checks  # type: ignore[attr-defined]


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    """At the end of the session, write the combined HTML dashboard and JSON file."""
    findings: FindingsCollector | None = getattr(session.config, "_secureqa_findings", None)
    checks: ChecksCollector | None = getattr(session.config, "_secureqa_checks", None)
    if findings is None and checks is None:
        return
    reports_dir = PROJECT_ROOT / "reports"
    html_path, json_path = write_report(
        findings.findings if findings else [],
        checks.checks if checks else [],
        reports_dir,
    )
    reporter = session.config.pluginmanager.get_plugin("terminalreporter")
    if reporter is not None:
        reporter.write_line("")
        reporter.write_line(
            f"[SecureQA] SecureShop checks={len(checks) if checks else 0}  "
            f"Juice Shop findings={len(findings) if findings else 0}"
        )
        reporter.write_line(f"[SecureQA] report: {html_path}")
        reporter.write_line(f"[SecureQA] json:   {json_path}")


# --------------------------------------------------------------------------- login helpers
@pytest.fixture()
def login_page(page, base_url: str):
    """A ready :class:`~secureqa.pages.LoginPage` bound to the test ``page``."""
    from secureqa.pages import LoginPage

    return LoginPage(page, base_url)


@pytest.fixture()
def as_user(page, base_url: str):
    """Log the browser ``page`` in and return the :class:`LoginPage`."""
    from secureqa.config import SELCUK
    from secureqa.pages import LoginPage

    def _login(username: str = SELCUK.username, password: str = SELCUK.password):
        login = LoginPage(page, base_url)
        login.login(username, password)
        return login

    return _login


@pytest.fixture()
def api_logged_in(api, base_url: str):
    """Return a function that logs the ``api`` session in as a given user.

    SecureShop protects the login POST with a CSRF token, so we fetch one first.
    (TR: SecureShop girişte CSRF token ister; önce onu alıp sonra giriş yaparız.)
    """
    from secureqa.config import SELCUK
    from secureqa.security import csrf

    def _login(username: str = SELCUK.username, password: str = SELCUK.password):
        csrf.post(api, base_url, "/login", {"username": username, "password": password})
        return api

    return _login
