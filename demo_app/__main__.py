"""Run SecureShop with ``python -m demo_app`` (TR: uygulamayı başlatır).

Host/port come from environment variables (first match wins):

* host: ``SHOP_HOST`` → ``VULNSHOP_HOST`` → ``127.0.0.1``
* port: ``SHOP_PORT`` → ``VULNSHOP_PORT`` → ``5000``

SECURITY: we bind to 127.0.0.1 (this computer only) by default and NEVER enable Flask's
debug mode — the interactive debugger would let anyone who can reach the page run Python code.
"""

from __future__ import annotations

import os

from . import create_app
from .security import QuietRequestHandler


def main() -> None:
    """Create the app and serve it with Flask's built-in (development) server."""
    host = os.environ.get("SHOP_HOST") or os.environ.get("VULNSHOP_HOST") or "127.0.0.1"
    port = int(os.environ.get("SHOP_PORT") or os.environ.get("VULNSHOP_PORT") or "5000")
    app = create_app()
    print(f" * SecureShop running on http://{host}:{port}  (Ctrl+C to stop)")
    if app.config.get("ENABLE_RESET"):
        print(" * Test mode: POST /__reset is enabled")
    app.run(host=host, port=port, debug=False, use_reloader=False, threaded=True,
            request_handler=QuietRequestHandler)


if __name__ == "__main__":
    main()
