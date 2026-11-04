"""HTTP security headers, cache rules and a tiny in-memory rate limiter.

Every response passes through ``add_security_headers`` (an ``after_request`` hook), so no
page can "forget" its headers. Each header below is explained where it is set.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from flask import Flask, Response, g, request
from werkzeug.serving import WSGIRequestHandler

# SECURITY: Content-Security-Policy (CSP) tells the browser where scripts, styles, images ...
# may come from. ``script-src 'self'`` means: only <script src="/static/..."> files from our
# own origin. Inline <script> blocks and onclick="..." attributes are REFUSED, so even if an
# attacker managed to inject HTML, their script would not run (XSS defence in depth).
# Therefore this app has no inline JS and no inline style="" attributes at all.
CONTENT_SECURITY_POLICY = "; ".join([
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",        # no Flash/Java plugins
    "base-uri 'none'",          # injected <base href> cannot redirect relative URLs
    "form-action 'self'",       # forms may only submit to us
    "frame-ancestors 'none'",   # nobody may put us in an <iframe> (clickjacking)
])

SECURITY_HEADERS: dict[str, str] = {
    "Content-Security-Policy": CONTENT_SECURITY_POLICY,
    # Old-browser equivalent of frame-ancestors 'none' (clickjacking protection).
    "X-Frame-Options": "DENY",
    # Do not "guess" content types: a .txt is never executed as JavaScript.
    "X-Content-Type-Options": "nosniff",
    # Send only our origin (not full URLs with ids/queries) to other sites.
    "Referrer-Policy": "strict-origin-when-cross-origin",
    # We need no camera, microphone, location ... switch them off.
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    # Isolate our window from pop-ups opened by other origins.
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
}


def add_security_headers(response: Response) -> Response:
    """``after_request`` hook: attach the security headers to every response."""
    for name, value in SECURITY_HEADERS.items():
        response.headers.setdefault(name, value)
    # SECURITY: hide the exact server software/version (default is "Werkzeug/x.y Python/3.z").
    # Version banners help attackers pick a matching exploit (information disclosure).
    response.headers["Server"] = "SecureShop"
    # SECURITY: pages shown to a logged-in user may contain personal data — tell browsers
    # and proxies not to store them (the "back button on a shared computer" problem).
    if g.get("user") is not None and not request.path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-store"
    return response


class QuietRequestHandler(WSGIRequestHandler):
    """Dev-server request handler that does not announce "Werkzeug/x.y Python/3.z".

    Python's http.server always sends its own ``Server`` banner first; we drop exactly that
    one, so only our neutral ``Server: SecureShop`` header (set above) reaches the client.
    """

    def send_header(self, keyword: str, value: str) -> None:
        if keyword.lower() == "server" and value == self.version_string():
            return
        super().send_header(keyword, value)


class RateLimiter:
    """Sliding-window rate limiter kept in memory: at most ``limit`` hits per ``window`` seconds.

    Example::

        limiter = RateLimiter(limit=5, window=60)
        if limiter.is_limited("127.0.0.1|admin"):
            ...  # answer 429 Too Many Requests
        limiter.hit("127.0.0.1|admin")   # record one failed login

    Good enough for one process. A real deployment with several workers would keep these
    counters in a shared store such as Redis.
    """

    def __init__(self, limit: int, window: float) -> None:
        self.limit = limit
        self.window = window
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()  # the dev server handles requests in threads

    def _prune(self, key: str, now: float) -> deque[float]:
        hits = self._hits[key]
        while hits and now - hits[0] > self.window:
            hits.popleft()
        return hits

    def hit(self, key: str) -> None:
        """Record one event for ``key`` (e.g. one failed login)."""
        with self._lock:
            now = time.monotonic()
            self._prune(key, now).append(now)

    def is_limited(self, key: str) -> bool:
        """True when ``key`` already used up its allowance in the current window."""
        with self._lock:
            return len(self._prune(key, time.monotonic())) >= self.limit

    def retry_after(self, key: str) -> int:
        """Seconds until the oldest recorded hit leaves the window (for ``Retry-After``)."""
        with self._lock:
            hits = self._prune(key, time.monotonic())
            if not hits:
                return 0
            return max(1, int(self.window - (time.monotonic() - hits[0])) + 1)

    def reset(self, key: str | None = None) -> None:
        """Forget one key, or everything when ``key`` is None."""
        with self._lock:
            if key is None:
                self._hits.clear()
            else:
                self._hits.pop(key, None)


def get_login_limiters(app: Flask) -> tuple[RateLimiter, RateLimiter]:
    """Return (per_account_limiter, per_ip_limiter) stored on the app."""
    return app.extensions["login_limiter"], app.extensions["login_ip_limiter"]


def init_app(app: Flask) -> None:
    """Install the header hook and create the login rate limiters."""
    app.after_request(add_security_headers)
    limit = int(app.config["LOGIN_RATE_LIMIT"])
    window = float(app.config["LOGIN_RATE_WINDOW"])
    # SECURITY (OWASP A07): two limits against password guessing.
    #   * per IP + username: max 5 failed logins per minute for one account
    #   * per IP alone: max 6x that, against "try one password on many accounts"
    app.extensions["login_limiter"] = RateLimiter(limit, window)
    app.extensions["login_ip_limiter"] = RateLimiter(limit * 6, window)
