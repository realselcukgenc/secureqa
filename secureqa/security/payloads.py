"""Test payloads used by the security checks (TR: güvenlik testlerinde kullanılan girdiler).

A *payload* is a crafted input we send to the application to see how it reacts.
These are the classic, well-known teaching examples. They are harmless against the
local demo app (which simulates command injection and sandboxes file access).
"""

from __future__ import annotations

# A unique marker we can search for in a response. If we see it UN-encoded inside a
# <script> context, the application is vulnerable to script injection.
# TR: Yanıtta ararız; kodlanmadan görünüyorsa zafiyet var demektir.
XSS_MARKER = "sqa7x9"

# Strings that should appear ENCODED (e.g. &lt;script&gt;) in a safe application.
# TR: Güvenli uygulamada bunlar kodlanmış görünmeli.
XSS_PAYLOADS: list[str] = [
    f"<script>sqaMark('{XSS_MARKER}')</script>",
    f"<img src=x onerror=sqaMark('{XSS_MARKER}')>",
    f"\"><svg onload=sqaMark('{XSS_MARKER}')>",
]

# A tiny payload we can inject into a stored field (a product review).
XSS_STORED_PAYLOAD = f"<script>window.__sqa_stored='{XSS_MARKER}'</script>"

# SQL probes. A single quote should NOT cause a database error in a safe app.
# TR: Tek tırnak güvenli uygulamada veritabanı hatası vermemeli.
SQLI_PROBE = "'"
SQLI_TRUE = "' OR '1'='1"
SQLI_COMMENT = "' OR '1'='1' --"

# Payloads that try to log in without a valid password.
# TR: Parola bilmeden giriş denemek için kullanılan kullanıcı adları.
SQLI_LOGIN_PAYLOADS: list[str] = [
    "admin' --",
    "admin' OR '1'='1' --",
    "admin'/*",
]

# Shell metacharacters for the (simulated) command-injection tool.
# TR: Simüle komut enjeksiyonu için kabuk karakterleri.
COMMAND_INJECTION_INPUTS: list[str] = [
    "127.0.0.1; id",
    "127.0.0.1 && id",
    "127.0.0.1 | id",
]

# Path-traversal sequences for the download endpoint.
# TR: Dosya indirme uç noktası için dizin atlatma dizileri.
TRAVERSAL_PAYLOADS: list[str] = [
    "../secret.txt",
    "../../secret.txt",
    "....//secret.txt",
    "..%2fsecret.txt",
]

# External targets that an open-redirect should refuse.
# TR: Açık yönlendirmenin reddetmesi gereken dış hedefler.
OPEN_REDIRECT_TARGETS: list[str] = [
    "https://evil.example.com",
    "//evil.example.com",
    "https:evil.example.com",
]
