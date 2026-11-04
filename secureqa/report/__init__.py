"""Custom bilingual HTML report generator (TR: özel iki dilli HTML rapor üretici).

Call :func:`secureqa.report.generator.write_report` with a list of findings; it writes a
single self-contained ``security-report.html`` (no CDNs) plus ``findings.json``.
"""

from secureqa.report.generator import (
    build_report_html,
    write_comparison_report,
    write_report,
)

__all__ = ["write_report", "write_comparison_report", "build_report_html"]
