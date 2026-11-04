"""Reusable REST API security checks for SecureShop's JSON API.

(TR: SecureShop'un JSON API'si için tekrar kullanılabilir güvenlik kontrolleri.)

This package is the API-level mirror of :mod:`secureqa.security`. Where that package
checks a *browser* app (pages, cookies, forms), this one checks the **JSON API**
(``/api/products``, ``/api/me``, the login/session endpoints, CSRF-protected writes ...).

Against a securely-built API these checks are expected to **PASS** — each one records a
defensive :class:`~secureqa.checks.Check` (the opposite of a Juice Shop *finding*).

Every check is labelled with its **OWASP API Security Top 10 (2023)** category, e.g.
``API1:2023 BOLA``. Those labels live in :data:`OWASP_API_2023` and are stamped into the
check ``id`` (``APISEC-API1-...``) and ``detail`` so the HTML report shows them.

Beginner's note (TR: yeni başlayanlar için):
    An *API check* is just an HTTP request plus an assertion about the answer. We reuse the
    building blocks from :mod:`secureqa.security` (``headers``, ``csrf``, ``ratelimit``)
    wherever the same technique already exists, instead of re-writing it here.
"""

from __future__ import annotations

from secureqa.apisec.checks import (
    OWASP_API_2023,
    api_label,
    authentication_required,
    cors_is_permissive,
    is_json_response,
    looks_like_html,
    method_restrictions,
    no_idor_on_resource,
    no_sensitive_fields,
    register_ignores_extra_fields,
)

__all__ = [
    "OWASP_API_2023",
    "api_label",
    "authentication_required",
    "cors_is_permissive",
    "is_json_response",
    "looks_like_html",
    "method_restrictions",
    "no_idor_on_resource",
    "no_sensitive_fields",
    "register_ignores_extra_fields",
]
