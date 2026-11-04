"""Draw simple charts as inline SVG strings (TR: grafikleri satır içi SVG olarak çizer).

No chart library and no CDN: we build the SVG markup by hand. This keeps the report a
single self-contained file and is a nice teaching example of basic trigonometry.
"""

from __future__ import annotations

import math

# Colour per severity. One hue family, stepping down in intensity, so the chart reads as
# one system in both light and dark themes. (TR: önem derecesine göre renkler.)
SEVERITY_COLORS: dict[str, str] = {
    "critical": "#b4232a",
    "high": "#e4572e",
    "medium": "#e8a93b",
    "low": "#3a7ca5",
    "info": "#7a8699",
}


def donut_chart(counts: dict[str, int], size: int = 220, thickness: int = 34) -> str:
    """Return an SVG string: a donut showing how many findings fall in each severity.

    Args:
        counts: e.g. ``{"critical": 2, "high": 5, "medium": 1, "low": 0, "info": 0}``.
        size: Width/height of the square SVG in pixels.
        thickness: Width of the ring.
    """
    total = sum(counts.values())
    radius = (size - thickness) / 2
    center = size / 2
    circumference = 2 * math.pi * radius

    if total == 0:
        # Empty state: a soft grey ring and a "0" in the middle. (TR: bulgu yoksa boş halka.)
        return (
            f'<svg viewBox="0 0 {size} {size}" class="donut" role="img" '
            f'aria-label="No findings">'
            f'<circle cx="{center}" cy="{center}" r="{radius}" fill="none" '
            f'stroke="var(--ring-empty)" stroke-width="{thickness}"/>'
            f'<text x="{center}" y="{center}" class="donut-total" text-anchor="middle" '
            f'dominant-baseline="central">0</text></svg>'
        )

    segments: list[str] = []
    offset = 0.0
    # Draw each coloured arc as a dash on top of the ring, rotated to start at the top.
    for severity, color in SEVERITY_COLORS.items():
        value = counts.get(severity, 0)
        if value == 0:
            continue
        length = circumference * (value / total)
        segments.append(
            f'<circle cx="{center}" cy="{center}" r="{radius}" fill="none" '
            f'stroke="{color}" stroke-width="{thickness}" '
            f'stroke-dasharray="{length:.3f} {circumference - length:.3f}" '
            f'stroke-dashoffset="{-offset:.3f}" '
            f'transform="rotate(-90 {center} {center})">'
            f'<title>{severity}: {value}</title></circle>'
        )
        offset += length

    return (
        f'<svg viewBox="0 0 {size} {size}" class="donut" role="img" '
        f'aria-label="Findings by severity">'
        f'<circle cx="{center}" cy="{center}" r="{radius}" fill="none" '
        f'stroke="var(--ring-empty)" stroke-width="{thickness}"/>'
        + "".join(segments)
        + f'<text x="{center}" y="{center}" class="donut-total" text-anchor="middle" '
        f'dominant-baseline="central">{total}</text></svg>'
    )


def bar_chart(counts: dict[str, int], labels: dict[str, str], width: int = 460, bar_h: int = 26) -> str:
    """Return an SVG string: a horizontal bar chart of findings per OWASP category.

    Args:
        counts: ``{"A01:2021": 3, ...}`` (zeros are skipped to keep the chart tidy).
        labels: ``{"A01:2021": "Broken Access Control"}`` for the bar labels.
        width: Total SVG width.
        bar_h: Height of each bar.
    """
    rows = [(code, value) for code, value in counts.items() if value > 0]
    if not rows:
        return '<p class="muted">—</p>'

    gap = 14
    label_w = 148
    chart_w = width - label_w - 56
    max_value = max(value for _, value in rows)
    height = len(rows) * (bar_h + gap) + gap

    parts: list[str] = [f'<svg viewBox="0 0 {width} {height}" class="bars" role="img" aria-label="Findings by OWASP category">']
    y = gap
    for code, value in rows:
        bar_len = max(6, chart_w * (value / max_value))
        label = labels.get(code, code)
        parts.append(
            f'<text x="0" y="{y + bar_h / 2}" class="bar-label" dominant-baseline="central">{code}</text>'
        )
        parts.append(
            f'<rect x="{label_w}" y="{y}" width="{bar_len:.1f}" height="{bar_h}" rx="5" '
            f'class="bar-rect"><title>{code} {label}: {value}</title></rect>'
        )
        parts.append(
            f'<text x="{label_w + bar_len + 8:.1f}" y="{y + bar_h / 2}" class="bar-value" '
            f'dominant-baseline="central">{value}</text>'
        )
        y += bar_h + gap
    parts.append("</svg>")
    return "".join(parts)
