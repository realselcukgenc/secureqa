"""Visual-regression tests: full-page screenshots compared to committed baselines.

How it works (TR: nasıl çalışır):
  1. For each page x viewport we take a full-page screenshot of SecureShop.
  2. The first time (or when ``UPDATE_VISUAL_BASELINE=1``), we SAVE it as the baseline and
     pass with a note. The baseline PNGs under ``tests/visual/baseline/`` are committed.
  3. On later runs we COMPARE the fresh screenshot to the baseline with Pillow and fail only
     if more than ``DIFF_THRESHOLD_PCT`` of the pixels differ (``conftest.compare_png``).

The screenshots are made deterministic in ``conftest.stabilize`` (light theme, reduced
motion, animations disabled, timed toasts hidden, volatile dates frozen) so the same UI
produces the same pixels every run. When a comparison fails, a diff image and the actual
screenshot are written to ``tests/visual/diffs/`` (gitignored) for inspection.
"""

from __future__ import annotations

import os

import pytest

from tests.visual.conftest import PAGES, prepare_page

# Pixel-level baselines are environment-specific: fonts and anti-aliasing differ between the
# machine where baselines were captured and a CI runner, so the same UI yields slightly
# different pixels. We therefore run the screenshot comparison LOCALLY (where the baselines
# were made) and skip it on CI, where the portable responsive checks (test_responsive.py)
# still run. Refresh baselines on your own machine with UPDATE_VISUAL_BASELINE=1.
# (TR: Piksel referansları ortama özeldir; CI'da atlanır, yerelde çalışır.)
_IN_CI = os.environ.get("CI") == "true" or os.environ.get("GITHUB_ACTIONS") == "true"

pytestmark = [
    pytest.mark.visual,
    pytest.mark.skipif(
        _IN_CI,
        reason="Screenshot baselines are environment-specific; run locally. "
        "Responsive checks still run in CI.",
    ),
]


@pytest.mark.parametrize("page_name", list(PAGES))
def test_visual_regression(visual_page, base_url, viewport_name, page_name, assert_visual_match) -> None:
    """Each SecureShop page looks the same as its committed baseline at each viewport.

    (TR: Her SecureShop sayfası, her görüntü boyutunda referans görüntüsüyle aynı görünmeli.)
    """
    prepare_page(visual_page, base_url, page_name)
    assert_visual_match(visual_page, page_name, viewport_name)
