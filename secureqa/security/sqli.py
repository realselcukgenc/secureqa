"""Helpers to detect SQL injection (TR: SQL enjeksiyonu tespiti).

Two simple techniques are used here, both easy to explain:

1. **Error based** — send a single quote ``'``. If the app pastes it straight into the
   SQL text, the database raises a syntax error whose message leaks into the response.
2. **Boolean based** — a payload like ``' OR '1'='1`` makes a ``WHERE`` clause always
   true, so a search returns far more rows than a normal search would.
"""

from __future__ import annotations

import requests

# Words that commonly appear in SQLite / SQL error messages.
# TR: SQL hata mesajlarında sık geçen kelimeler.
SQL_ERROR_SIGNS: tuple[str, ...] = (
    "sqlite3",
    "sql syntax",
    "syntax error",
    "unrecognized token",
    "near \"",
    "OperationalError",
    "no such column",
    "incomplete input",
)


def looks_like_sql_error(text: str) -> bool:
    """True when the text contains a tell-tale database error message."""
    lowered = text.lower()
    return any(sign.lower() in lowered for sign in SQL_ERROR_SIGNS)


def probe_error_based(session: requests.Session, url: str) -> tuple[bool, str]:
    """Send the URL (already containing a ``'``) and report whether a SQL error leaked.

    Returns:
        ``(is_vulnerable, evidence)`` where evidence is the snippet around the error.
    """
    response = session.get(url, timeout=5)
    body = response.text
    if looks_like_sql_error(body):
        return True, _snippet_around_error(body)
    return False, f"HTTP {response.status_code}, no SQL error text in response."


def _snippet_around_error(text: str) -> str:
    """Return a short slice of text around the first error sign (for the evidence field)."""
    lowered = text.lower()
    for sign in SQL_ERROR_SIGNS:
        index = lowered.find(sign.lower())
        if index != -1:
            start = max(0, index - 60)
            return text[start : index + 140]
    return text[:200]
