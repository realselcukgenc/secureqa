#!/usr/bin/env python3
"""SecureQA command-line entry point (TR: komut satırı arayüzü).

Run ``python run.py --help`` to see everything. Common commands::

    python run.py app                      # start SecureShop (Ctrl+C to stop)
    python run.py test                     # functional + defensive checks vs SecureShop
    python run.py juiceshop                # attack Juice Shop (needs JUICE_SHOP_URL)
    python run.py report                   # locate / open the HTML report
    python run.py compare                  # build the SecureShop-vs-Juice-Shop page
    python run.py all                      # run everything, then build comparison

Two targets (TR: iki hedef):
  * SecureShop  — our securely-built demo app; defensive checks should PASS.
  * Juice Shop  — OWASP's vulnerable app; findings are EXPECTED.

This is a thin wrapper around pytest and the demo server, kept simple on purpose so a
Python beginner can read it top to bottom.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
REPORTS_DIR = PROJECT_ROOT / "reports"


def cmd_app(args: argparse.Namespace) -> int:
    """Start the SecureShop demo app and keep it running until Ctrl+C."""
    from secureqa.server import DemoServer

    server = DemoServer(port=args.port or 5000)
    print(f"Starting SecureShop at {server.base_url} — press Ctrl+C to stop.")
    server.start()
    print(f"SecureShop is up. Log file: {server.log_file}")
    try:
        server.wait()
    except KeyboardInterrupt:
        print("\nStopping SecureShop...")
    finally:
        server.stop()
    return 0


def _run_pytest(extra: list[str], label: str) -> int:
    """Run pytest with extra args and return its exit code (0 = all passed)."""
    command = [sys.executable, "-m", "pytest", *extra]
    print(f"\n=== {label}: pytest {' '.join(extra)} ===")
    return subprocess.call(command, cwd=PROJECT_ROOT)


def cmd_test(args: argparse.Namespace) -> int:
    """Run the SecureShop suites (functional + defensive security regression checks)."""
    extra = ["-m", "functional or security", *(args.pytest_args or [])]
    return _run_pytest(extra, "SecureShop")


def cmd_juiceshop(args: argparse.Namespace) -> int:
    """Run the Juice Shop attack suite. Requires JUICE_SHOP_URL to be set.

    If it is not set, the tests skip; we remind the user how to enable them.
    """
    if not os.environ.get("JUICE_SHOP_URL"):
        print("JUICE_SHOP_URL is not set — Juice Shop tests will skip.")
        print("Start Juice Shop on 127.0.0.1:3000 and run:")
        print("  JUICE_SHOP_URL=http://127.0.0.1:3000 python run.py juiceshop")
    extra = ["-m", "juiceshop", "--no-server", *(args.pytest_args or [])]
    return _run_pytest(extra, "Juice Shop")


def cmd_report(args: argparse.Namespace) -> int:
    """Point the user at the generated HTML report (and open it if possible)."""
    html_path = REPORTS_DIR / "security-report.html"
    if not html_path.exists():
        print("No report yet. Run:  python run.py test")
        return 1
    print(f"Report: {html_path}")
    if args.open:
        import webbrowser

        webbrowser.open(html_path.as_uri())
    return 0


def cmd_compare(args: argparse.Namespace) -> int:
    """Build the side-by-side SecureShop-vs-Juice-Shop comparison HTML."""
    from secureqa.report.generator import write_comparison_report

    try:
        out = write_comparison_report(REPORTS_DIR)
    except FileNotFoundError as error:
        print(str(error))
        return 1
    print(f"Comparison report: {out}")
    return 0


def cmd_all(args: argparse.Namespace) -> int:
    """Run the SecureShop suites and the Juice Shop suite, then build the comparison."""
    extra = args.pytest_args or []
    cmd_test(argparse.Namespace(pytest_args=extra))
    cmd_juiceshop(argparse.Namespace(pytest_args=extra))
    return cmd_compare(args)


def build_parser() -> argparse.ArgumentParser:
    """Create the argparse command-line parser."""
    parser = argparse.ArgumentParser(prog="run.py", description="SecureQA CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    p_app = sub.add_parser("app", help="start the SecureShop demo app")
    p_app.add_argument("--port", type=int, default=None, help="TCP port (default 5000)")
    p_app.set_defaults(func=cmd_app)

    p_test = sub.add_parser("test", help="run SecureShop functional + security checks")
    p_test.add_argument("pytest_args", nargs="*", help="extra args passed straight to pytest")
    p_test.set_defaults(func=cmd_test)

    p_juice = sub.add_parser("juiceshop", help="attack Juice Shop (needs JUICE_SHOP_URL)")
    p_juice.add_argument("pytest_args", nargs="*", help="extra args passed straight to pytest")
    p_juice.set_defaults(func=cmd_juiceshop)

    p_report = sub.add_parser("report", help="locate / open the last HTML report")
    p_report.add_argument("--open", action="store_true", help="open it in a browser")
    p_report.set_defaults(func=cmd_report)

    p_compare = sub.add_parser("compare", help="build SecureShop-vs-Juice-Shop comparison")
    p_compare.set_defaults(func=cmd_compare)

    p_all = sub.add_parser("all", help="run everything, then build comparison")
    p_all.add_argument("pytest_args", nargs="*", help="extra args passed straight to pytest")
    p_all.set_defaults(func=cmd_all)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
