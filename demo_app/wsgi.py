"""Production WSGI entrypoint for SecureShop (TR: üretim giriş noktası).

Run it with a real WSGI server, e.g.::

    gunicorn demo_app.wsgi:app            # serves on $PORT (default 8000)

``demo_app/__main__.py`` (``python -m demo_app``) is the *development* server and binds to
127.0.0.1. This module is the *production* path: it exposes a module-level ``app`` object,
picks writable defaults so a brand-new host can boot with zero configuration, and wraps the
app in a reverse-proxy fixer so HTTPS is detected correctly behind Render/Fly's TLS proxy.
"""

from __future__ import annotations

import os

from werkzeug.middleware.proxy_fix import ProxyFix

from . import create_app


def _apply_production_defaults() -> None:
    """Fill in safe defaults for a fresh public host (only when not already set).

    We use ``setdefault`` so an explicit environment variable always wins — the user can
    still override any of these from their host's dashboard.
    """
    # Many hosts give the container a writable but *ephemeral* filesystem. The repo's
    # ``instance/`` folder may be read-only in a packaged image, so default the SQLite file
    # to a guaranteed-writable location. The DB is auto-created and seeded on first boot
    # (see ``demo_app.db.init_app`` -> ``init_db``), so a cold start just works.
    os.environ.setdefault("SHOP_DB", "/tmp/secureshop.sqlite")

    # SECURITY: in production the app sits behind a TLS-terminating proxy (Render/Fly), so the
    # session cookie MUST carry the ``Secure`` flag (send only over HTTPS). ProxyFix below lets
    # Flask see the real https scheme so this flag does not break http->https on first request.
    os.environ.setdefault("SHOP_SECURE_COOKIES", "1")


_apply_production_defaults()

app = create_app()

# SECURITY: trust the reverse proxy's forwarded headers (ONE proxy hop).
#   X-Forwarded-Proto  -> Flask knows the original request was HTTPS, so:
#                           * ``SESSION_COOKIE_SECURE`` cookies are actually sent,
#                           * ``url_for(..., _external=True)`` builds https:// URLs,
#                           * any http->https redirect logic sees the right scheme.
#   X-Forwarded-For    -> the client's real IP reaches the login rate limiter instead of the
#                         proxy's single IP (otherwise one proxy IP would rate-limit everyone).
# We trust exactly 1 hop because Render/Fly put exactly one proxy in front of the app. Trusting
# more than really exists would let a client spoof these headers.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)


if __name__ == "__main__":  # pragma: no cover - convenience for `python -m demo_app.wsgi`
    port = int(os.environ.get("PORT") or "8000")
    app.run(host="0.0.0.0", port=port)
