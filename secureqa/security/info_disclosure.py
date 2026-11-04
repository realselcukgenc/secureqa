"""Helpers for information-disclosure checks (TR: bilgi ifşası kontrolleri).

Covers the ``/debug`` endpoint, verbose error pages (stack traces) and the simulated
command-injection "network tool".
"""

from __future__ import annotations

from urllib.parse import quote

import requests

# Signs that a page is leaking internal details (a stack trace, config, secrets).
# TR: İç bilgilerin (traceback, ayar, gizli anahtar) sızdığını gösteren işaretler.
DEBUG_SIGNS: tuple[str, ...] = ("traceback", "secret_key", "werkzeug", "debug", "config")
STACKTRACE_SIGNS: tuple[str, ...] = ("Traceback (most recent call last)", "File \"", "line ")

# The fake output the simulated command-injection endpoint returns when it "runs" id.
# TR: Simüle komut enjeksiyonunun döndürdüğü sahte çıktı.
COMMAND_OUTPUT_MARKER = "uid=33(www-data)"


def debug_endpoint_exposed(session: requests.Session, base_url: str) -> tuple[bool, str]:
    """True when ``GET /debug`` returns 200 and leaks internal details."""
    response = session.get(base_url + "/debug", timeout=5)
    body_lower = response.text.lower()
    leaks = [sign for sign in DEBUG_SIGNS if sign in body_lower]
    vulnerable = response.status_code == 200 and len(leaks) > 0
    evidence = f"HTTP {response.status_code}; leaked keywords: {leaks or 'none'}"
    return vulnerable, evidence


def verbose_error_leaks_stack(session: requests.Session, url: str) -> tuple[bool, str]:
    """Trigger an error at ``url`` and check whether a Python stack trace is shown."""
    response = session.get(url, timeout=5)
    body = response.text
    found = [sign for sign in STACKTRACE_SIGNS if sign in body]
    vulnerable = len(found) >= 2  # several signs together = a real traceback page
    snippet = body[:200].replace("\n", " ")
    evidence = f"HTTP {response.status_code}; stacktrace signs: {found}; starts: {snippet!r}"
    return vulnerable, evidence


def command_injection_simulated(
    session: requests.Session, base_url: str, payload: str
) -> tuple[bool, str]:
    """Send a shell-metacharacter payload to ``/tools/ping`` and look for the fake id output.

    The demo app never runs a real shell; it returns :data:`COMMAND_OUTPUT_MARKER` to
    demonstrate the risk. Seeing that marker means the input was treated as a command.
    (TR: Gerçek kabuk çalışmaz; işaret görünürse girdi komut gibi işlenmiş demektir.)
    """
    url = f"{base_url}/tools/ping?host={quote(payload, safe='')}"
    response = session.get(url, timeout=5)
    vulnerable = COMMAND_OUTPUT_MARKER in response.text
    evidence = f"payload={payload!r} -> {'fake id output present' if vulnerable else 'no command output'}"
    return vulnerable, evidence
