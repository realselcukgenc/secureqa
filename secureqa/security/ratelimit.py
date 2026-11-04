"""Helper to check for login rate limiting (TR: giriş hız sınırı kontrolü)."""

from __future__ import annotations

import requests

from secureqa.security import csrf


def hammer_login(
    session: requests.Session, base_url: str, attempts: int = 12
) -> tuple[bool, str]:
    """Send many wrong-password logins quickly and see if any get blocked.

    A safe app should start answering with HTTP 429 (Too Many Requests) or lock the
    account. If every single attempt is accepted and simply "wrong password", there is
    no rate limiting.

    We send a valid CSRF token so each request actually reaches the login logic (an app
    that protects POSTs would otherwise reject us at the CSRF layer before any counting).
    (TR: Her istek giriş mantığına ulaşsın diye geçerli CSRF token'ı gönderiyoruz.)

    Returns:
        ``(is_vulnerable, evidence)`` — vulnerable means *no* throttling was seen.
    """
    token = csrf.fetch_token(session, base_url, "/login")
    headers = {"X-CSRF-Token": token} if token else {}
    statuses: list[int] = []
    blocked = False
    for index in range(attempts):
        data = {"username": "selcuk", "password": f"wrong-{index}"}
        if token:
            data["csrf_token"] = token
        response = session.post(
            base_url + "/login",
            data=data,
            headers=headers,
            timeout=5,
            allow_redirects=False,
        )
        statuses.append(response.status_code)
        # 429 is the standard "slow down" status; some apps use a lockout message.
        if response.status_code == 429 or "too many" in response.text.lower():
            blocked = True
            break
    vulnerable = not blocked
    evidence = f"{len(statuses)} rapid attempts, statuses={statuses}; throttled={blocked}"
    return vulnerable, evidence
