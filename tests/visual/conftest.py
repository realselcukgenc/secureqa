"""Local fixtures + helpers for the visual / responsive suite.

This file deliberately does NOT start a second server or a second browser. It reuses:
  * the session SecureShop server via the ``base_url`` fixture (root ``tests/conftest.py``),
  * the one shared Playwright instance (``_playwright``) and browser (``_browser``).

All it adds is *viewport parametrization* (phone / tablet / desktop) and the small set of
helpers the screenshot tests need (page preparation, stabilization, a Pillow comparator).

Beginners (TR: yeni başlayanlar):
  * A *viewport* is the visible window size. We test three: a phone, a tablet and a desktop.
  * A *baseline* is a reference screenshot we trust. New screenshots are compared to it.
  * A *fixture* is a ready-made object pytest hands a test when it names it as an argument.
"""

from __future__ import annotations

import io
import os
import warnings
from pathlib import Path
from typing import Callable, Iterator

import pytest

# --------------------------------------------------------------------------- locations
# Where reference screenshots live (committed) and where diffs are written (gitignored).
# TR: Referans ekran görüntüleri burada (depoda); farklar diffs/ altına yazılır (yok sayılır).
VISUAL_DIR: Path = Path(__file__).resolve().parent
BASELINE_DIR: Path = VISUAL_DIR / "baseline"
DIFFS_DIR: Path = VISUAL_DIR / "diffs"


# --------------------------------------------------------------------------- what we test
# The SecureShop pages we exercise. Keys are short, file-safe names used in screenshot
# filenames; values are URL paths. Some pages need a logged-in user and/or a non-empty cart
# (see ``prepare_page`` below). TR: Test edilen sayfalar ve URL yolları.
PAGES: dict[str, str] = {
    "home": "/",
    "products": "/products",
    "product": "/product/1",
    "cart": "/cart",
    "checkout": "/checkout",
    "login": "/login",
    "admin": "/admin",
}

# Pages that can only be rendered while signed in (so ``prepare_page`` logs in as admin).
# The logged-in header carries extra controls (user pill + logout), which matters for the
# overflow check at the narrow tablet breakpoint. TR: yalnızca giriş yapınca görünen sayfalar.
LOGIN_REQUIRED_PAGES: frozenset[str] = frozenset({"admin", "checkout"})

# The three viewports. "phone" uses a real device profile (iPhone 12) through
# ``playwright.devices`` so user-agent / touch / mobile flags are realistic; "tablet" and
# "desktop" are plain window sizes. We force ``device_scale_factor=1`` everywhere so the
# screenshots are deterministic and reasonably sized (a phone at scale 3 would be 3x bigger).
# TR: Üç görüntü boyutu — telefon (gerçek cihaz profili), tablet ve masaüstü.
VIEWPORTS: tuple[str, ...] = ("phone", "tablet", "desktop")

# Pixels of slack allowed when checking "no horizontal overflow". Sub-pixel rounding in the
# browser can make scrollWidth a hair larger than clientWidth; a tiny tolerance avoids flakes.
# TR: Yatay taşma kontrolünde izin verilen küçük pay (yuvarlama hatalarına karşı).
OVERFLOW_TOLERANCE_PX: int = 2

# Visual-diff knobs. A pixel counts as "different" only if its brightness change exceeds
# PER_PIXEL_TOLERANCE (ignores faint anti-aliasing noise). A page FAILS only if more than
# DIFF_THRESHOLD_PCT of the pixels differ. TR: Piksel farkı eşikleri.
PER_PIXEL_TOLERANCE: int = 20
DIFF_THRESHOLD_PCT: float = 2.0


def update_baseline_requested() -> bool:
    """True when ``UPDATE_VISUAL_BASELINE`` is set to a truthy value (refresh references)."""
    return os.environ.get("UPDATE_VISUAL_BASELINE", "").strip().lower() in ("1", "true", "yes", "on")


# --------------------------------------------------------------------------- viewport fixture
@pytest.fixture(params=VIEWPORTS)
def viewport_name(request: pytest.FixtureRequest) -> str:
    """Parametrized viewport name: every test that uses it runs once per viewport.

    (TR: Bu fixture'ı kullanan her test, her görüntü boyutu için bir kez çalışır.)
    """
    return request.param


def _context_options(playwright, viewport_name: str) -> dict:
    """Build ``new_context`` keyword arguments for one viewport.

    We always pin a light colour scheme and reduced motion so rendering is deterministic.
    (TR: Belirli bir görüntü boyutu için tarayıcı bağlamı ayarlarını üretir.)
    """
    options: dict = {
        "ignore_https_errors": True,
        "color_scheme": "light",          # pin the theme (no dark-mode surprises)
        "reduced_motion": "reduce",        # the app's CSS disables animations under this
    }
    if viewport_name == "phone":
        device = dict(playwright.devices["iPhone 12"])  # 390x844, mobile UA, touch
        device.pop("default_browser_type", None)        # not a context option
        device["device_scale_factor"] = 1               # keep screenshots 1x (deterministic/small)
        options.update(device)
    elif viewport_name == "tablet":
        options.update(viewport={"width": 768, "height": 1024}, device_scale_factor=1)
    else:  # desktop
        options.update(viewport={"width": 1280, "height": 800}, device_scale_factor=1)
    return options


@pytest.fixture()
def visual_page(_playwright, _browser, settings, viewport_name: str) -> Iterator:
    """A fresh page sized for the current viewport, from the SHARED session browser.

    Reuses the session browser (no new browser, no new server). A new *context* per test
    keeps cookies/localStorage isolated, exactly like the root ``page`` fixture does.
    (TR: Oturumdaki ortak tarayıcıdan, seçili görüntü boyutunda yeni bir sayfa verir.)
    """
    context = _browser.new_context(**_context_options(_playwright, viewport_name))
    context.set_default_timeout(settings.timeout_ms)
    page = context.new_page()
    try:
        yield page
    finally:
        context.close()


# --------------------------------------------------------------------------- page preparation
def _login(page, base_url: str, username: str, password: str) -> None:
    """Log in through the real login form (TR: gerçek giriş formuyla oturum açar)."""
    page.goto(base_url + "/login")
    page.fill("#username", username)
    page.fill("#password", password)
    with page.expect_navigation():
        page.click("#login-btn")


def _add_to_cart(page, base_url: str, product_id: int = 1) -> None:
    """Add one product to the cart from the product page.

    The buy-box form is progressively enhanced (class ``js-add-to-cart``): with JavaScript it
    POSTs via ``fetch`` and updates the ``#cart-count`` badge *without* navigating. So we
    click, then wait for the badge to leave its empty state. TR: Sepete bir ürün ekler.
    """
    page.goto(base_url + f"/product/{product_id}")
    page.wait_for_load_state("networkidle")   # ensure the deferred app.js handler is attached
    page.click("#add-to-cart-btn")
    page.wait_for_function(
        "() => { const c = document.querySelector('#cart-count'); "
        "return c && !c.classList.contains('is-empty'); }"
    )


def prepare_page(page, base_url: str, page_name: str) -> None:
    """Put the browser into the right state and navigate to ``page_name``.

    ``/admin`` needs an admin login; ``/checkout`` needs a login AND a non-empty cart; the
    ``/cart`` page is shown with one item so it is not just the empty state.
    The database is reset before each test by the root ``_reset_db`` fixture, so the seeded
    data (and therefore the rendering) is identical every run.
    (TR: Sayfayı doğru duruma getirir: gerekiyorsa giriş yapar ve sepete ürün ekler.)
    """
    from secureqa.config import ADMIN

    if page_name in ("admin", "checkout"):
        _login(page, base_url, ADMIN.username, ADMIN.password)
    if page_name in ("cart", "checkout"):
        _add_to_cart(page, base_url, product_id=1)
    page.goto(base_url + PAGES[page_name])
    page.wait_for_load_state("networkidle")


# --------------------------------------------------------------------------- stabilization
# SecureShop ships a strict Content-Security-Policy (``style-src 'self'``) so we CANNOT inject
# a <style> tag. Instead, animations/transitions are already disabled because every context
# is created with ``reduced_motion="reduce"`` and the app's own CSS honours that media query.
# The remaining volatility is handled below with CSP-safe DOM edits via ``page.evaluate``.
#
# Selectors whose text is a seeded, relative date (e.g. "4 Kasım 2026") and therefore changes
# with the calendar. We replace the text with a fixed placeholder so the committed baseline
# stays valid on any future date. TR: Tarih içeren oynak alanlar sabitlenir.
_VOLATILE_DATE_SELECTORS = [
    ".review-date",                                     # product detail reviews
    '[data-testid="admin-order-row"] td:nth-child(4)',  # admin "recent orders" date column
]

_STABILIZE_JS = """
(selectors) => {
  // 1. Remove the toast stack: flash notifications fade on a timer -> volatile pixels.
  document.querySelectorAll('#toast-stack, [data-testid="toast-stack"]').forEach((e) => e.remove());
  // 2. Freeze seeded relative dates so the baseline never ages.
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => { el.textContent = '—'; });
  }
  // 3. Drop focus so no blinking text caret is captured (e.g. an autofocused login field).
  if (document.activeElement && document.activeElement.blur) { document.activeElement.blur(); }
}
"""


def stabilize(page) -> None:
    """Make the page deterministic right before a screenshot (CSP-safe, no style injection).

    Removes timed toasts, freezes volatile date text and drops focus. Motion is already off
    via the context's ``reduced_motion="reduce"``. Then waits a beat for layout to settle.
    TR: Ekran görüntüsü öncesi sayfayı belirli (deterministik) yapar.
    """
    page.evaluate(_STABILIZE_JS, _VOLATILE_DATE_SELECTORS)
    page.wait_for_timeout(200)  # let the DOM changes settle


# --------------------------------------------------------------------------- comparator
def _load_rgb(data: bytes | Path):
    """Open PNG bytes or a file path as an RGB Pillow image."""
    from PIL import Image

    if isinstance(data, (bytes, bytearray)):
        return Image.open(io.BytesIO(data)).convert("RGB")
    return Image.open(data).convert("RGB")


def _pad_to(image, width: int, height: int):
    """Return ``image`` placed top-left on a white canvas of ``width`` x ``height``.

    Padding (instead of a hard size-mismatch failure) makes the comparator robust to a page
    that is a few pixels taller/shorter than its baseline. TR: Boyut farklarına dayanıklılık.
    """
    from PIL import Image

    if image.size == (width, height):
        return image
    canvas = Image.new("RGB", (width, height), (255, 255, 255))
    canvas.paste(image, (0, 0))
    return canvas


def compare_png(baseline_path: Path, candidate_bytes: bytes):
    """Compare a new screenshot to the baseline.

    Returns a tuple ``(percent_different, diff_image, baseline_size, candidate_size)`` where
    ``percent_different`` is the share of pixels whose brightness change exceeds
    ``PER_PIXEL_TOLERANCE``. ``diff_image`` is a brightened difference map for humans.
    (TR: Yeni ekran görüntüsünü referansla karşılaştırır; farklı piksel yüzdesini döndürür.)
    """
    from PIL import ImageChops

    baseline = _load_rgb(baseline_path)
    candidate = _load_rgb(candidate_bytes)
    width = max(baseline.width, candidate.width)
    height = max(baseline.height, candidate.height)
    b_pad = _pad_to(baseline, width, height)
    c_pad = _pad_to(candidate, width, height)

    rgb_diff = ImageChops.difference(b_pad, c_pad)
    # Collapse to one channel = how much each pixel changed, then threshold it.
    gray = rgb_diff.convert("L")
    mask = gray.point(lambda v: 255 if v > PER_PIXEL_TOLERANCE else 0)
    different_pixels = mask.histogram()[255]
    total_pixels = width * height
    percent = 100.0 * different_pixels / total_pixels if total_pixels else 0.0

    # Brighten the raw difference so faint changes are visible in the saved diff image.
    diff_image = rgb_diff.point(lambda v: min(255, v * 5))
    return percent, diff_image, baseline.size, candidate.size


@pytest.fixture()
def assert_visual_match(base_url: str) -> Callable[[object, str, str], None]:
    """Return a helper that screenshots the current page and checks it against the baseline.

    First run (or ``UPDATE_VISUAL_BASELINE=1``, or a missing baseline) *creates* the baseline
    and passes with a warning note. Later runs compare and fail only when the difference is
    above ``DIFF_THRESHOLD_PCT``. TR: İlk çalıştırmada referansı oluşturur, sonra karşılaştırır.
    """
    def _check(page, page_name: str, viewport_name: str) -> None:
        BASELINE_DIR.mkdir(parents=True, exist_ok=True)
        name = f"{page_name}-{viewport_name}.png"
        baseline_path = BASELINE_DIR / name

        stabilize(page)
        shot = page.screenshot(full_page=True)

        if update_baseline_requested() or not baseline_path.exists():
            action = "refreshed" if baseline_path.exists() else "created"
            baseline_path.write_bytes(shot)
            warnings.warn(
                f"[visual] baseline {action}: {baseline_path.name} "
                f"({len(shot) // 1024} KiB) — pass without comparison on this run.",
                stacklevel=2,
            )
            return

        percent, diff_image, base_size, cand_size = compare_png(baseline_path, shot)
        if percent > DIFF_THRESHOLD_PCT:
            DIFFS_DIR.mkdir(parents=True, exist_ok=True)
            diff_path = DIFFS_DIR / f"{page_name}-{viewport_name}.diff.png"
            got_path = DIFFS_DIR / f"{page_name}-{viewport_name}.actual.png"
            diff_image.save(diff_path)
            got_path.write_bytes(shot)
            pytest.fail(
                f"Visual regression on '{page_name}' @ {viewport_name}: "
                f"{percent:.3f}% of pixels differ (> {DIFF_THRESHOLD_PCT}% threshold). "
                f"baseline={base_size} candidate={cand_size}. "
                f"Diff: {diff_path}  Actual: {got_path}  "
                f"(run with UPDATE_VISUAL_BASELINE=1 to accept the new look.)"
            )

    return _check
