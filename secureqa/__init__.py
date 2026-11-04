"""SecureQA — a small security test-automation framework around a vulnerable demo app.

Public pieces you will use most often::

    from secureqa.config import settings
    from secureqa.findings import Finding, FindingsCollector
    from secureqa import catalog           # ready-made vulnerability templates
    from secureqa.server import DemoServer  # start/stop the demo app

See ``SPEC.md`` for the full project description (Turkish + English).
"""

from __future__ import annotations

__version__ = "1.0.0"
__author__ = "Selçuk Genç"
