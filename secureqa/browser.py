"""Helpers to launch a Playwright browser with the framework settings.

If the environment variable ``PW_CHROMIUM_PATH`` is set we use that Chromium binary
(useful in sandboxes without the Playwright download). Otherwise Playwright uses its own
bundled browser (installed in CI with ``playwright install --with-deps chromium``).
(TR: PW_CHROMIUM_PATH tanımlıysa o Chromium kullanılır, yoksa Playwright'ın kendi tarayıcısı.)
"""

from __future__ import annotations

from typing import Any

from playwright.sync_api import Browser, Playwright

from secureqa.config import Settings


def launch_options(settings: Settings) -> dict[str, Any]:
    """Build the keyword arguments for ``browser_type.launch(**options)``."""
    options: dict[str, Any] = {"headless": settings.headless}
    if settings.browser == "chromium" and settings.chromium_path:
        options["executable_path"] = settings.chromium_path
    return options


def launch_browser(playwright: Playwright, settings: Settings) -> Browser:
    """Launch the browser chosen in ``settings.browser`` (chromium / firefox / webkit)."""
    browser_type = getattr(playwright, settings.browser)
    return browser_type.launch(**launch_options(settings))
