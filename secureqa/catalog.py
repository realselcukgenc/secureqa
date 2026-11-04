"""A catalog (knowledge base) of every vulnerability the test-suite knows about.

Each entry is a :class:`VulnInfo` "template": the title, severity, OWASP category, CWE and the
remediation text are written ONCE here. A test only has to add the URL and the evidence::

    from secureqa import catalog

    finding = catalog.XSS_REFLECTED.finding(url=page.url, evidence="alert() fired")

(TR: Her zafiyetin başlığı, önemi, OWASP/CWE bilgisi ve çözüm önerisi burada bir kez yazılır.
Testler sadece URL ve kanıt ekler. Böylece tekrar eden metin olmaz.)
"""

from __future__ import annotations

from dataclasses import dataclass, replace

from secureqa.findings import Finding


@dataclass(frozen=True)
class VulnInfo:
    """Static information about one vulnerability type (TR: bir zafiyet türünün sabit bilgileri)."""

    id: str
    title_tr: str
    title_en: str
    severity: str
    owasp: str
    cwe: str
    description_tr: str
    description_en: str
    remediation_tr: str
    remediation_en: str

    def finding(self, url: str, evidence: str, test_id: str = "") -> Finding:
        """Create a concrete :class:`Finding` from this template.

        Args:
            url: Where the vulnerability was observed.
            evidence: Proof (response snippet, header, ...). Long text is shortened.
            test_id: Optional pytest node id (the collector fills it in automatically).
        """
        return Finding(
            id=self.id,
            title_tr=self.title_tr,
            title_en=self.title_en,
            severity=self.severity,
            owasp=self.owasp,
            cwe=self.cwe,
            url=url,
            evidence=shorten(evidence),
            remediation_tr=self.remediation_tr,
            remediation_en=self.remediation_en,
            description_tr=self.description_tr,
            description_en=self.description_en,
            test_id=test_id,
        )


def shorten(text: str, limit: int = 1500) -> str:
    """Cut very long evidence so the report stays readable (TR: çok uzun kanıtı kısaltır)."""
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n... [{len(text) - limit} more characters / karakter daha]"


# OWASP 2021 category strings (TR: OWASP 2021 kategori metinleri)
A01 = "A01:2021-Broken Access Control"
A02 = "A02:2021-Cryptographic Failures"
A03 = "A03:2021-Injection"
A05 = "A05:2021-Security Misconfiguration"
A07 = "A07:2021-Identification and Authentication Failures"


# --------------------------------------------------------------------------- A03 Injection
XSS_REFLECTED = VulnInfo(
    id="XSS-REFLECTED",
    title_tr="Yansıtılmış XSS (ürün arama)",
    title_en="Reflected XSS (product search)",
    severity="high",
    owasp=A03,
    cwe="CWE-79",
    description_tr="Arama terimi HTML'e kodlanmadan yazılıyor. Saldırgan hazırladığı bir bağlantıyla kurbanın "
    "tarayıcısında JavaScript çalıştırabilir (oturum çalma, sahte form).",
    description_en="The search term is written into the HTML without encoding. An attacker can craft a link that "
    "runs JavaScript in the victim's browser (session theft, fake forms).",
    remediation_tr="Kullanıcı girdisini HTML bağlamına göre kodlayın (Jinja2 otomatik kaçışını kapatmayın, "
    "'|safe' / Markup kullanmayın). Ek savunma olarak katı bir Content-Security-Policy ekleyin.",
    remediation_en="Context-aware output encoding (keep Jinja2 autoescape on, never use '|safe' / Markup on user "
    "input). Add a strict Content-Security-Policy as defense in depth.",
)

XSS_STORED = VulnInfo(
    id="XSS-STORED",
    title_tr="Kalıcı (Stored) XSS (ürün yorumları)",
    title_en="Stored XSS (product reviews)",
    severity="high",
    owasp=A03,
    cwe="CWE-79",
    description_tr="Yorum metni veritabanına kaydediliyor ve kodlanmadan gösteriliyor. Sayfayı açan HER kullanıcının "
    "tarayıcısında saldırganın kodu çalışır.",
    description_en="Review text is stored and later rendered without encoding. The attacker's script runs for EVERY "
    "visitor of the product page.",
    remediation_tr="Yorumları gösterirken HTML kodlaması yapın; zengin metin gerekiyorsa izin listesi tabanlı bir "
    "temizleyici (ör. bleach) kullanın. CSP ile satır içi script'leri engelleyin.",
    remediation_en="HTML-encode reviews on output; if rich text is needed use an allow-list sanitizer (e.g. bleach). "
    "Block inline scripts with CSP.",
)

SQLI_SEARCH = VulnInfo(
    id="SQLI-SEARCH",
    title_tr="SQL Enjeksiyonu (ürün arama)",
    title_en="SQL Injection (product search)",
    severity="critical",
    owasp=A03,
    cwe="CWE-89",
    description_tr="Arama terimi SQL sorgusuna string birleştirme ile ekleniyor. Saldırgan sorguyu değiştirip "
    "veritabanındaki tüm verileri (kullanıcılar, parola özetleri) okuyabilir.",
    description_en="The search term is concatenated into the SQL query. An attacker can change the query and read "
    "the whole database (users, password hashes).",
    remediation_tr="Parametreli sorgular kullanın: cursor.execute('... LIKE ?', (f'%{q}%',)). Asla f-string ile SQL "
    "oluşturmayın. Veritabanı kullanıcısına en az yetki verin.",
    remediation_en="Use parameterized queries: cursor.execute('... LIKE ?', (f'%{q}%',)). Never build SQL with "
    "f-strings. Give the DB account least privilege.",
)

SQLI_LOGIN = VulnInfo(
    id="SQLI-LOGIN",
    title_tr="SQL Enjeksiyonu (giriş formu)",
    title_en="SQL Injection (login form)",
    severity="critical",
    owasp=A03,
    cwe="CWE-89",
    description_tr="Kullanıcı adı alanındaki tek tırnak (') SQL sözdizimini bozuyor ve veritabanı hatası "
    "oluşuyor. Bu, girdinin doğrudan sorguya eklendiğinin kanıtıdır.",
    description_en="A single quote (') in the username field breaks the SQL syntax and causes a database error. "
    "This proves the input is pasted directly into the query.",
    remediation_tr="Giriş sorgusunu parametreli yapın ve parolayı veritabanında değil uygulamada güvenli bir "
    "özet fonksiyonuyla (werkzeug check_password_hash / bcrypt) doğrulayın.",
    remediation_en="Parameterize the login query and verify the password in the application with a safe hash "
    "function (werkzeug check_password_hash / bcrypt), not inside SQL.",
)

SQLI_API = VulnInfo(
    id="SQLI-API",
    title_tr="SQL Enjeksiyonu (ürün API'si)",
    title_en="SQL Injection (products API)",
    severity="critical",
    owasp=A03,
    cwe="CWE-89",
    description_tr="/api/products?q= uç noktası SQL enjeksiyonuna açık. UNION tabanlı bir sorgu ile başka "
    "tablolardaki veriler JSON olarak dışarı sızdırılabiliyor.",
    description_en="The /api/products?q= endpoint is injectable. A UNION based payload leaks data from other "
    "tables as JSON.",
    remediation_tr="API katmanında da parametreli sorgular kullanın; girdiyi doğrulayın (uzunluk, karakter "
    "kümesi) ve hata mesajlarını istemciye göndermeyin.",
    remediation_en="Use parameterized queries in the API layer too; validate input (length, charset) and do not "
    "return database errors to the client.",
)

COMMAND_INJECTION = VulnInfo(
    id="CMDI-PING",
    title_tr="Komut Enjeksiyonu (ping aracı — simüle)",
    title_en="Command Injection (ping tool — simulated)",
    severity="critical",
    owasp=A03,
    cwe="CWE-78",
    description_tr="'host' parametresindeki ';', '&&' veya '|' karakterleri ek işletim sistemi komutlarının "
    "çalışmasına izin veriyor (demo uygulamada simüle edilir, gerçek komut çalışmaz).",
    description_en="';', '&&' or '|' in the 'host' parameter lets extra OS commands run (simulated in the demo "
    "app — no real command is executed).",
    remediation_tr="Kabuk (shell) kullanmayın: subprocess.run(['ping', '-c', '1', host], shell=False). 'host' "
    "değerini izin listesiyle (IP/alan adı regex) doğrulayın.",
    remediation_en="Never use a shell: subprocess.run(['ping', '-c', '1', host], shell=False). Validate 'host' "
    "against an allow-list (IP / hostname regex).",
)

# ------------------------------------------------------------------ A07 Authentication
AUTH_BYPASS = VulnInfo(
    id="AUTH-BYPASS",
    title_tr="Kimlik Doğrulama Atlatma (SQLi ile admin girişi)",
    title_en="Authentication Bypass (admin login via SQLi)",
    severity="critical",
    owasp=A07,
    cwe="CWE-287",
    description_tr="Parola bilinmeden \"admin' --\" gibi bir kullanıcı adıyla yönetici olarak oturum açılabiliyor.",
    description_en="It is possible to log in as administrator without knowing the password, using a username such "
    "as \"admin' --\".",
    remediation_tr="Parametreli sorgu kullanın; kullanıcıyı ada göre bulun, ardından parola özetini uygulamada "
    "doğrulayın. Yönetici hesapları için MFA ekleyin.",
    remediation_en="Use parameterized queries; look the user up by name, then verify the password hash in code. "
    "Add MFA for administrator accounts.",
)

USER_ENUMERATION = VulnInfo(
    id="AUTH-ENUM",
    title_tr="Kullanıcı Adı Tespiti (User Enumeration)",
    title_en="User Enumeration",
    severity="medium",
    owasp=A07,
    cwe="CWE-204",
    description_tr="Giriş sayfası 'kullanıcı bulunamadı' ve 'parola yanlış' için farklı mesajlar gösteriyor. "
    "Saldırgan geçerli kullanıcı adlarının listesini çıkarabilir.",
    description_en="The login page shows different messages for 'user not found' and 'wrong password'. An "
    "attacker can build a list of valid usernames.",
    remediation_tr="Her iki durumda da aynı genel mesajı gösterin: 'Kullanıcı adı veya parola hatalı'. Yanıt "
    "süresini de eşitleyin.",
    remediation_en="Return the same generic message in both cases: 'Invalid username or password'. Keep response "
    "times similar too.",
)

NO_RATE_LIMIT = VulnInfo(
    id="AUTH-RATELIMIT",
    title_tr="Giriş Denemelerinde Hız Sınırı Yok (Brute-force)",
    title_en="No Rate Limiting on Login (brute force)",
    severity="high",
    owasp=A07,
    cwe="CWE-307",
    description_tr="Kısa sürede yapılan çok sayıda hatalı giriş denemesi engellenmiyor. Parola tahmin (brute-force) "
    "ve credential stuffing saldırıları mümkün.",
    description_en="Many failed login attempts in a short time are not blocked. Password guessing (brute force) "
    "and credential stuffing are possible.",
    remediation_tr="IP ve hesap bazlı hız sınırı uygulayın (ör. 5 deneme/dakika, sonra HTTP 429), artan bekleme "
    "süresi veya CAPTCHA ekleyin; şüpheli denemeleri loglayın.",
    remediation_en="Rate-limit per IP and per account (e.g. 5 attempts/minute, then HTTP 429), add progressive "
    "delays or CAPTCHA; log suspicious attempts.",
)

WEAK_PASSWORD = VulnInfo(
    id="AUTH-WEAKPWD",
    title_tr="Zayıf Parola Politikası",
    title_en="Weak Password Policy",
    severity="medium",
    owasp=A07,
    cwe="CWE-521",
    description_tr="Kayıt formu '1' gibi tek karakterli parolaları kabul ediyor.",
    description_en="The registration form accepts one-character passwords such as '1'.",
    remediation_tr="En az 8-12 karakter zorunlu tutun, sık kullanılan / sızdırılmış parolaları reddedin "
    "(NIST SP 800-63B) ve parola gücü göstergesi ekleyin.",
    remediation_en="Require at least 8-12 characters, reject common / breached passwords (NIST SP 800-63B) and "
    "show a strength meter.",
)

# --------------------------------------------------------------- A01 Broken Access Control
IDOR_ORDERS = VulnInfo(
    id="IDOR-ORDERS",
    title_tr="IDOR — Başka kullanıcının siparişi görüntülenebiliyor",
    title_en="IDOR — Other users' orders are visible",
    severity="high",
    owasp=A01,
    cwe="CWE-639",
    description_tr="/orders/<id> adresindeki sayı değiştirilerek başka bir müşterinin siparişi (adres, ürünler, "
    "tutar) görüntülenebiliyor.",
    description_en="Changing the number in /orders/<id> reveals another customer's order (address, items, total).",
    remediation_tr="Her istekte nesnenin sahibini kontrol edin: order.user_id == current_user.id değilse 403/404 "
    "döndürün. Tahmin edilemeyen kimlikler (UUID) ek savunmadır.",
    remediation_en="Check ownership on every request: if order.user_id != current_user.id return 403/404. "
    "Unguessable ids (UUID) are defense in depth.",
)

IDOR_API_USERS = VulnInfo(
    id="IDOR-API",
    title_tr="IDOR — Kimlik doğrulamasız kullanıcı API'si",
    title_en="IDOR — Unauthenticated user API",
    severity="high",
    owasp=A01,
    cwe="CWE-639",
    description_tr="/api/users/<id> oturum açmadan herhangi bir kullanıcının kaydını döndürüyor.",
    description_en="/api/users/<id> returns any user's record without authentication.",
    remediation_tr="API'yi oturum/token ile koruyun ve kullanıcının yalnızca kendi kaydına (veya admin ise "
    "yetkili olduğu kayıtlara) erişmesine izin verin.",
    remediation_en="Protect the API with a session/token and allow users to access only their own record (or "
    "records they are authorized for as admin).",
)

ADMIN_COOKIE_BYPASS = VulnInfo(
    id="BAC-ADMIN-COOKIE",
    title_tr="Bozuk Erişim Kontrolü — 'role=admin' çerezi ile yönetici paneli",
    title_en="Broken Access Control — admin panel via 'role=admin' cookie",
    severity="critical",
    owasp=A01,
    cwe="CWE-565",
    description_tr="Yönetici paneli yetkiyi sunucu tarafı oturumdan değil, istemcinin değiştirebildiği 'role' "
    "çerezinden okuyor. Herkes kendini admin yapabilir.",
    description_en="The admin panel reads the role from a client-controlled 'role' cookie instead of the server "
    "side session. Anyone can make themselves admin.",
    remediation_tr="Rol bilgisini yalnızca sunucu tarafında (imzalı oturum / veritabanı) tutun ve her yönetici "
    "isteğinde kontrol edin (@admin_required dekoratörü).",
    remediation_en="Keep the role only on the server (signed session / database) and check it on every admin "
    "request (an @admin_required decorator).",
)

CSRF = VulnInfo(
    id="CSRF-EMAIL",
    title_tr="CSRF — E-posta değiştirme (ve yorum) isteklerinde token yok",
    title_en="CSRF — No token on email change (and review) requests",
    severity="high",
    owasp=A01,
    cwe="CWE-352",
    description_tr="Başka bir siteden gönderilen sahte bir form, oturum açmış kullanıcının e-posta adresini "
    "değiştirebiliyor. Bu da hesap ele geçirmeye (parola sıfırlama) yol açar.",
    description_en="A forged form from another site can change the logged-in user's email address, which leads to "
    "account takeover (via password reset).",
    remediation_tr="Durum değiştiren her POST isteğinde CSRF token doğrulayın (Flask-WTF CSRFProtect) ve oturum "
    "çerezine SameSite=Lax/Strict ekleyin.",
    remediation_en="Validate a CSRF token on every state-changing POST (Flask-WTF CSRFProtect) and set "
    "SameSite=Lax/Strict on the session cookie.",
)

OPEN_REDIRECT = VulnInfo(
    id="OPEN-REDIRECT",
    title_tr="Açık Yönlendirme (Open Redirect)",
    title_en="Open Redirect",
    severity="medium",
    owasp=A01,
    cwe="CWE-601",
    description_tr="/redirect?next= herhangi bir dış siteye yönlendiriyor. Oltalama (phishing) bağlantıları güvenilir "
    "alan adınızla başlıyormuş gibi görünür.",
    description_en="/redirect?next= sends users to any external site. Phishing links look like they start with "
    "your trusted domain.",
    remediation_tr="Yalnızca göreli yollara ('/' ile başlayan, '//' ile başlamayan) veya izin listesindeki alan "
    "adlarına yönlendirin.",
    remediation_en="Only redirect to relative paths (starting with '/' but not '//') or to allow-listed hosts.",
)

PATH_TRAVERSAL = VulnInfo(
    id="PATH-TRAVERSAL",
    title_tr="Dizin Atlatma (Path Traversal) — dosya indirme",
    title_en="Path Traversal — file download",
    severity="high",
    owasp=A01,
    cwe="CWE-22",
    description_tr="'file' parametresindeki '../' dizinler arasında gezinmeye izin veriyor; izin verilen klasör "
    "dışındaki gizli dosyalar (secret.txt) okunabiliyor.",
    description_en="'../' in the 'file' parameter allows walking up directories; secret files outside the allowed "
    "folder (secret.txt) can be read.",
    remediation_tr="flask.send_from_directory veya werkzeug.utils.safe_join kullanın; çözülen yolun izin verilen "
    "klasörün içinde kaldığını kontrol edin (Path.resolve().is_relative_to()).",
    remediation_en="Use flask.send_from_directory or werkzeug.utils.safe_join; verify the resolved path stays inside "
    "the allowed folder (Path.resolve().is_relative_to()).",
)

# ------------------------------------------------------------- A02 Cryptographic Failures
SENSITIVE_DATA = VulnInfo(
    id="DATA-EXPOSURE",
    title_tr="Hassas Veri İfşası (parola özeti ve e-posta)",
    title_en="Sensitive Data Exposure (password hash and email)",
    severity="high",
    owasp=A02,
    cwe="CWE-200",
    description_tr="Kullanıcı API'si 'password_hash' ve e-posta gibi alanları döndürüyor. Parola özetleri "
    "çevrimdışı kırılabilir.",
    description_en="The user API returns fields such as 'password_hash' and email. Password hashes can be cracked "
    "offline.",
    remediation_tr="API yanıtlarında yalnızca gerekli alanları döndürün (izin listesi / DTO). Parola özetini asla "
    "dışarı vermeyin; bcrypt/argon2 gibi yavaş özet fonksiyonları kullanın.",
    remediation_en="Return only the fields that are needed (allow-list / DTO). Never expose password hashes; use slow "
    "hashes such as bcrypt/argon2.",
)

# ---------------------------------------------------------- A05 Security Misconfiguration
DEBUG_ENDPOINT = VulnInfo(
    id="INFO-DEBUG",
    title_tr="Bilgi İfşası — /debug sayfası açık",
    title_en="Information Disclosure — /debug page exposed",
    severity="high",
    owasp=A05,
    cwe="CWE-215",
    description_tr="/debug sayfası yapılandırma, sürüm ve gizli anahtar gibi iç bilgileri herkese gösteriyor.",
    description_en="The /debug page shows internal details such as configuration, versions and secret keys to "
    "everyone.",
    remediation_tr="Hata ayıklama uç noktalarını üretimde tamamen kaldırın (DEBUG=False) ve gizli anahtarları "
    "ortam değişkeninden okuyun.",
    remediation_en="Remove debug endpoints in production (DEBUG=False) and load secrets from environment "
    "variables.",
)

VERBOSE_ERRORS = VulnInfo(
    id="INFO-ERRORS",
    title_tr="Ayrıntılı Hata Mesajları (stack trace)",
    title_en="Verbose Error Messages (stack trace)",
    severity="medium",
    owasp=A05,
    cwe="CWE-209",
    description_tr="Hata sayfası Python traceback'i, dosya yollarını ve SQL sorgusunu gösteriyor. Bu bilgiler "
    "saldırganın işini kolaylaştırır.",
    description_en="The error page shows the Python traceback, file paths and the SQL query. This helps attackers.",
    remediation_tr="Kullanıcıya genel bir hata sayfası gösterin, ayrıntıları yalnızca sunucu loguna yazın "
    "(@app.errorhandler(500)).",
    remediation_en="Show a generic error page to users and write details only to the server log "
    "(@app.errorhandler(500)).",
)

SERVER_BANNER = VulnInfo(
    id="INFO-SERVER-BANNER",
    title_tr="Sunucu Sürüm Bilgisi İfşası (Server başlığı)",
    title_en="Server Version Disclosure (Server header)",
    severity="low",
    owasp=A05,
    cwe="CWE-200",
    description_tr="'Server' başlığı yazılım adını ve sürümünü açıkça bildiriyor; saldırgan bilinen açıkları "
    "hedefleyebilir.",
    description_en="The 'Server' header reveals the software name and version, so attackers can target known "
    "vulnerabilities.",
    remediation_tr="Server başlığını kaldırın veya sürüm içermeyen genel bir değer kullanın (ters vekil/proxy "
    "üzerinde de).",
    remediation_en="Remove the Server header or use a generic value without a version (also on the reverse proxy).",
)

MISSING_HEADER = VulnInfo(
    id="HDR-MISSING",
    title_tr="Eksik Güvenlik Başlığı",
    title_en="Missing Security Header",
    severity="medium",
    owasp=A05,
    cwe="CWE-693",
    description_tr="Tarayıcının sunduğu koruma mekanizmaları (CSP, clickjacking koruması, MIME sniffing koruması) "
    "kullanılmıyor.",
    description_en="Browser protection mechanisms (CSP, clickjacking protection, MIME sniffing protection) are not "
    "used.",
    remediation_tr="Tüm yanıtlara güvenlik başlıklarını ekleyin (ör. @app.after_request veya Flask-Talisman): "
    "Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy.",
    remediation_en="Add security headers to every response (e.g. @app.after_request or Flask-Talisman): "
    "Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy.",
)

INSECURE_COOKIE = VulnInfo(
    id="COOKIE-FLAGS",
    title_tr="Güvensiz Oturum Çerezi Bayrakları",
    title_en="Insecure Session Cookie Flags",
    severity="medium",
    owasp=A05,
    cwe="CWE-1004",
    description_tr="Oturum çerezinde HttpOnly ve/veya SameSite bayrağı yok. XSS ile çerez çalınabilir, CSRF "
    "kolaylaşır.",
    description_en="The session cookie is missing HttpOnly and/or SameSite. XSS can steal it and CSRF becomes "
    "easier.",
    remediation_tr="SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax' ayarlayın; HTTPS üzerinde "
    "SESSION_COOKIE_SECURE=True kullanın.",
    remediation_en="Set SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax'; on HTTPS also "
    "SESSION_COOKIE_SECURE=True.",
)


# Every template in one list — handy for documentation and for the report legend.
# TR: Tüm şablonların listesi.
ALL: list[VulnInfo] = [
    XSS_REFLECTED, XSS_STORED, SQLI_SEARCH, SQLI_LOGIN, SQLI_API, COMMAND_INJECTION,
    AUTH_BYPASS, USER_ENUMERATION, NO_RATE_LIMIT, WEAK_PASSWORD,
    IDOR_ORDERS, IDOR_API_USERS, ADMIN_COOKIE_BYPASS, CSRF, OPEN_REDIRECT, PATH_TRAVERSAL,
    SENSITIVE_DATA,
    DEBUG_ENDPOINT, VERBOSE_ERRORS, SERVER_BANNER, MISSING_HEADER, INSECURE_COOKIE,
]


def missing_header(header_name: str, severity: str = "medium") -> VulnInfo:
    """Return a copy of :data:`MISSING_HEADER` with the header name in the id and titles.

    ``dataclasses.replace`` creates a new frozen object with some fields changed.
    (TR: Başlık adını içeren yeni bir şablon üretir — her eksik başlık ayrı bir bulgu olur.)
    """
    short = header_name.upper().replace("-", "")
    return replace(
        MISSING_HEADER,
        id=f"HDR-{short}",
        title_tr=f"Eksik Güvenlik Başlığı: {header_name}",
        title_en=f"Missing Security Header: {header_name}",
        severity=severity,
    )
