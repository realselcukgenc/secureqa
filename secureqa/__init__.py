"""SecureQA — a small security test-automation framework (SecureShop + OWASP Juice Shop targets).

Public pieces you will use most often::

    from secureqa.config import settings
    from secureqa.findings import Finding, FindingsCollector
    from secureqa.juiceshop import JuiceShopClient  # Juice Shop challenge client
    from secureqa.server import DemoServer  # start/stop SecureShop

See ``SPEC.md`` for the full project description (Turkish + English).
"""

from __future__ import annotations

__version__ = "1.0.0"
__author__ = "Selçuk Genç"
