# Visual + responsive UI tests (`tests/visual/`)

Mobile/responsive layout checks and a pixel visual-regression suite for the **SecureShop**
app. Everything here is marked with the `visual` pytest marker.

TR: SecureShop için duyarlı (mobil) yerleşim testleri ve görsel regresyon (ekran görüntüsü
karşılaştırma) testleri. Hepsi `visual` işaretini taşır.

## Run it

```bash
# The shared venv + bundled Chromium (sandbox). In CI, PW_CHROMIUM_PATH is unset.
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium \
  python -m pytest -m "visual" -q
```

The suite reuses the SecureShop server and browser started by the root `tests/conftest.py`
(no second server). This folder's `conftest.py` only adds **viewport parametrization**
(phone / tablet / desktop) and the screenshot/baseline helpers.

## What is covered

Pages: **home, products, product detail, cart, checkout, login, admin**.
Viewports: **phone** (iPhone 12, 390x844, via `playwright.devices`), **tablet** (768x1024),
**desktop** (1280x800). All at `device_scale_factor=1` for small, deterministic images.

* `test_responsive.py` — layout behaviours that *should* hold: no horizontal overflow, the
  mobile hamburger menu opens on a phone, inline nav on wider screens, the theme/language/cart
  controls stay visible and clickable, the search box is usable, add-to-cart is reachable, and
  headline text is not clipped. Assertions use small tolerances so they are robust, not flaky.
* `test_visual_regression.py` — full-page screenshots compared to committed baselines.

### Known issue recorded as `xfail`

On tablet width (768px) the **signed-in** header (admin/checkout) keeps its nav inline and the
controls are too crowded, pushing the page ~34px wider. This is a real SecureShop layout issue,
so the overflow check records those two cases as `xfail` (expected failure). The suite stays
green and will turn into a normal pass automatically if the app's tablet breakpoint is fixed.

## How the visual comparison works

* Screenshots are made **deterministic** first (see `conftest.stabilize`): light colour scheme
  and `reduced_motion` are set on the browser context (SecureShop's own CSS then disables all
  animations/transitions), timed toast notifications are removed, focus is dropped (no blinking
  caret), and the only volatile text — seeded relative dates in product reviews and the admin
  "recent orders" table — is frozen to a placeholder so baselines never age.
  (SecureShop sends a strict `Content-Security-Policy`, so we cannot inject a `<style>` tag;
  stabilization is done with CSP-safe DOM edits via `page.evaluate`.)
* Comparison uses **Pillow**: pad both images to a common size, take the per-pixel difference,
  and count pixels whose brightness change exceeds a small per-pixel tolerance (ignores
  anti-aliasing noise). A page **fails only if more than 2% of pixels differ**
  (`DIFF_THRESHOLD_PCT` in `conftest.py`).
* On a mismatch, a brightened diff image and the actual screenshot are written to
  `tests/visual/diffs/` (gitignored) for inspection.

## Updating baselines

Baselines live in `tests/visual/baseline/` and **are committed** (they are the reference).

* **Missing baseline** (e.g. a brand-new page): the first run creates it and passes with a note.
* **Intentional UI change**: regenerate and re-commit the references:

  ```bash
  UPDATE_VISUAL_BASELINE=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium \
    python -m pytest -m "visual" -q
  git add tests/visual/baseline
  ```

  Always review the regenerated PNGs (`git diff --stat`) before committing — only update when
  the new look is the intended one.
