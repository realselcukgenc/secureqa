"""Tiny dictionary-based translations: Turkish (default) and English.

How the language is chosen (TR: dil seçimi):

1. ``?lang=tr`` or ``?lang=en`` in the URL → used now AND remembered in a ``lang`` cookie;
2. otherwise the ``lang`` cookie;
3. otherwise Turkish.

In templates: ``{{ t('nav_home') }}`` or with placeholders ``{{ t('n_results', n=3) }}``.
SECURITY: the language value is checked against an allow-list (``SUPPORTED``), so a crafted
``?lang=<script>`` can never end up in the cookie or in ``<html lang="...">``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from urllib.parse import urlencode

from flask import Flask, Response, g, has_request_context, request

SUPPORTED = ("tr", "en")
DEFAULT_LANG = "tr"
COOKIE_NAME = "lang"
COOKIE_MAX_AGE = 60 * 60 * 24 * 365  # one year

# key -> {"tr": ..., "en": ...}. Placeholders use str.format: "{n} ürün".
TRANSLATIONS: dict[str, dict[str, str]] = {
    # --- general / layout ---------------------------------------------------
    "tagline": {"tr": "Anadolu'nun lezzetleri, güvenle", "en": "Flavours of Anatolia, securely"},
    "meta_description": {"tr": "SecureShop — güvenli kodlama örneği olan demo e-ticaret sitesi.",
                         "en": "SecureShop — a demo e-commerce site built with secure coding practices."},
    "demo_banner": {"tr": "Demo mağaza · Gerçek ödeme alınmaz, gerçek kart bilgisi girmeyin.",
                    "en": "Demo store · No real payments — never enter real card details."},
    "skip_to_content": {"tr": "İçeriğe geç", "en": "Skip to content"},
    "nav_main": {"tr": "Ana menü", "en": "Main menu"},
    "nav_home": {"tr": "Ana Sayfa", "en": "Home"},
    "nav_products": {"tr": "Ürünler", "en": "Products"},
    "nav_admin": {"tr": "Yönetim", "en": "Admin"},
    "nav_account": {"tr": "Hesabım", "en": "My account"},
    "nav_cart": {"tr": "Sepet", "en": "Cart"},
    "nav_login": {"tr": "Giriş yap", "en": "Sign in"},
    "nav_logout": {"tr": "Çıkış yap", "en": "Sign out"},
    "menu": {"tr": "Menü", "en": "Menu"},
    "language": {"tr": "Dil", "en": "Language"},
    "toggle_theme": {"tr": "Koyu/açık tema", "en": "Toggle dark/light theme"},
    "close": {"tr": "Kapat", "en": "Close"},
    "search_label": {"tr": "Ürün ara", "en": "Search products"},
    "search_placeholder": {"tr": "Baklava, kahve, çini…", "en": "Baklava, coffee, tiles…"},
    "search_btn": {"tr": "Ara", "en": "Search"},
    "optional": {"tr": "isteğe bağlı", "en": "optional"},
    "save": {"tr": "Kaydet", "en": "Save"},
    "update": {"tr": "Güncelle", "en": "Update"},
    "remove": {"tr": "Kaldır", "en": "Remove"},
    "details": {"tr": "Detay", "en": "Details"},
    "back_home": {"tr": "Ana sayfaya dön", "en": "Back to home"},
    "footer_about": {"tr": "Güvenli yazılım geliştirme ve test otomasyonu için hazırlanmış örnek mağaza.",
                     "en": "A sample store built to showcase secure development and test automation."},
    "footer_shop": {"tr": "Mağaza", "en": "Shop"},
    "footer_security": {"tr": "Güvenlik", "en": "Security"},
    "footer_ratelimit": {"tr": "Giriş hız sınırı", "en": "Login rate limit"},
    "footer_demo": {"tr": "Eğitim amaçlı demo", "en": "Demo for training"},
    # --- home -----------------------------------------------------------------
    "hero_eyebrow": {"tr": "Yeni sezon · El yapımı & yöresel", "en": "New season · Handmade & regional"},
    "hero_title_1": {"tr": "Anadolu'nun en güzel lezzetleri,", "en": "The finest flavours of Anatolia,"},
    "hero_title_2": {"tr": "kapınızda.", "en": "at your door."},
    "hero_sub": {"tr": "Antep baklavasından İznik çinisine, ustalarından özenle seçilmiş ürünler. Üstelik güvenli kodla yazılmış bir mağazada.",
                 "en": "From Gaziantep baklava to Iznik tiles — carefully chosen goods from master makers, in a store written with secure code."},
    "hero_cta": {"tr": "Alışverişe başla", "en": "Start shopping"},
    "hero_cta_2": {"tr": "Nasıl güvenli?", "en": "Why it's secure"},
    "hero_stat_products": {"tr": "ürün", "en": "products"},
    "hero_stat_rating": {"tr": "ortalama puan", "en": "avg. rating"},
    "hero_stat_cities": {"tr": "ile kargo", "en": "provinces shipped"},
    "perk_ship": {"tr": "Ücretsiz kargo", "en": "Free shipping"},
    "perk_ship_sub": {"tr": "Tüm siparişlerde, 1-3 iş günü", "en": "On every order, 1–3 business days"},
    "perk_secure": {"tr": "Güvenli alışveriş", "en": "Secure shopping"},
    "perk_secure_sub": {"tr": "CSRF korumalı formlar, güvenli oturum", "en": "CSRF-protected forms, safe sessions"},
    "perk_hand": {"tr": "Usta işi", "en": "Master-made"},
    "perk_hand_sub": {"tr": "Yöresel üreticilerden", "en": "From regional producers"},
    "perk_return": {"tr": "Kolay iade", "en": "Easy returns"},
    "perk_return_sub": {"tr": "14 gün içinde ücretsiz iade", "en": "Free returns within 14 days"},
    "shop_by_category": {"tr": "Kategoriler", "en": "Shop by category"},
    "n_products": {"tr": "{n} ürün", "en": "{n} products"},
    "featured": {"tr": "Öne çıkanlar", "en": "Featured"},
    "see_all": {"tr": "Tümünü gör", "en": "See all"},
    "sec_eyebrow": {"tr": "Tasarımdan güvenli", "en": "Secure by design"},
    "sec_title": {"tr": "Bu mağaza güvenlik testleri için yapıldı", "en": "This store is built to be security-tested"},
    "sec_sub": {"tr": "SecureQA test paketi her sürümde bu kontrolleri otomatik doğrular.",
                "en": "The SecureQA test suite verifies these controls automatically on every build."},
    "sec_csp": {"tr": "Güvenlik başlıkları", "en": "Security headers"},
    "sec_csp_sub": {"tr": "CSP, X-Frame-Options, nosniff, Referrer-Policy", "en": "CSP, X-Frame-Options, nosniff, Referrer-Policy"},
    "sec_csrf": {"tr": "CSRF token", "en": "CSRF tokens"},
    "sec_csrf_sub": {"tr": "Her formda oturuma bağlı gizli anahtar", "en": "A per-session secret in every form"},
    "sec_sqli": {"tr": "Parametreli sorgular", "en": "Parameterized queries"},
    "sec_sqli_sub": {"tr": "SQL enjeksiyonuna karşı", "en": "No SQL injection"},
    "sec_xss": {"tr": "Çıktı kaçışlama", "en": "Output escaping"},
    "sec_xss_sub": {"tr": "Jinja autoescape ile XSS koruması", "en": "XSS protection via Jinja autoescape"},
    "sec_authz": {"tr": "Yetki kontrolü", "en": "Access control"},
    "sec_authz_sub": {"tr": "Rol sunucuda, veritabanından okunur", "en": "Roles are checked on the server, from the DB"},
    "sec_rate": {"tr": "Hız sınırı", "en": "Rate limiting"},
    "sec_rate_sub": {"tr": "Dakikada 5 hatalı giriş denemesi", "en": "5 failed logins per minute"},
    # --- categories / sorting ---------------------------------------------------
    "cat_sweets": {"tr": "Tatlı & Kuruyemiş", "en": "Sweets & Snacks"},
    "cat_coffee": {"tr": "Kahve", "en": "Coffee"},
    "cat_tea": {"tr": "Çay", "en": "Tea"},
    "cat_kitchen": {"tr": "Mutfak", "en": "Kitchen"},
    "cat_home": {"tr": "Ev & Dekor", "en": "Home & Decor"},
    "all_categories": {"tr": "Tümü", "en": "All"},
    "all_products": {"tr": "Tüm ürünler", "en": "All products"},
    "sort_label": {"tr": "Sırala", "en": "Sort"},
    "sort_popular": {"tr": "En popüler", "en": "Most popular"},
    "sort_price_asc": {"tr": "Fiyat: artan", "en": "Price: low to high"},
    "sort_price_desc": {"tr": "Fiyat: azalan", "en": "Price: high to low"},
    "sort_rating": {"tr": "En yüksek puan", "en": "Top rated"},
    "sort_newest": {"tr": "En yeni", "en": "Newest"},
    # --- products ---------------------------------------------------------------
    "products_title": {"tr": "Ürünler", "en": "Products"},
    "products_sub": {"tr": "Yöresel lezzetler ve el işi ürünler.", "en": "Regional delicacies and handmade goods."},
    "results_for": {"tr": "Arama sonuçları:", "en": "Results for:"},
    "n_results": {"tr": "{n} ürün bulundu", "en": "{n} products found"},
    "no_results": {"tr": "Sonuç bulunamadı", "en": "No results"},
    "no_results_sub": {"tr": "Farklı bir kelime deneyin, örneğin “kahve”.", "en": "Try another word, e.g. “coffee”."},
    "add_to_cart": {"tr": "Sepete ekle", "en": "Add to cart"},
    "out_of_stock": {"tr": "Tükendi", "en": "Sold out"},
    "in_stock": {"tr": "Stokta", "en": "In stock"},
    "low_stock": {"tr": "Son {n} ürün!", "en": "Only {n} left!"},
    "quantity": {"tr": "Adet", "en": "Quantity"},
    "rating_sr": {"tr": "5 üzerinden {rating} puan", "en": "Rated {rating} out of 5"},
    "n_reviews": {"tr": "{n} değerlendirme", "en": "{n} reviews"},
    "reviews": {"tr": "Değerlendirmeler", "en": "Reviews"},
    "no_reviews": {"tr": "Henüz değerlendirme yok. İlk yorumu siz yazın!", "en": "No reviews yet. Be the first!"},
    "write_review": {"tr": "Değerlendirme yaz", "en": "Write a review"},
    "your_rating": {"tr": "Puanınız", "en": "Your rating"},
    "your_review": {"tr": "Yorumunuz", "en": "Your review"},
    "review_placeholder": {"tr": "Ürün hakkında ne düşünüyorsunuz?", "en": "What do you think about this product?"},
    "send_review": {"tr": "Gönder", "en": "Submit"},
    "login_to_review": {"tr": "Değerlendirme yazmak için giriş yapın.", "en": "Sign in to write a review."},
    "review_saved": {"tr": "Değerlendirmeniz eklendi, teşekkürler!", "en": "Thanks — your review was added!"},
    "review_len_error": {"tr": "Yorum 3 ile {max} karakter arasında olmalı.", "en": "A review must be 3 to {max} characters long."},
    "review_rating_error": {"tr": "Puan 1 ile 5 arasında olmalı.", "en": "Rating must be between 1 and 5."},
    "related": {"tr": "Bunları da beğenebilirsiniz", "en": "You may also like"},
    # --- cart / checkout -----------------------------------------------------------
    "cart_title": {"tr": "Sepetim", "en": "Your cart"},
    "cart_empty": {"tr": "Sepetiniz boş", "en": "Your cart is empty"},
    "cart_empty_sub": {"tr": "Beğendiğiniz ürünleri sepete ekleyin.", "en": "Add the products you like to your cart."},
    "added_to_cart": {"tr": "“{name}” sepete eklendi", "en": "“{name}” added to cart"},
    "removed_from_cart": {"tr": "Ürün sepetten çıkarıldı", "en": "Item removed from cart"},
    "cannot_add": {"tr": "Bu ürün şu anda sepete eklenemiyor.", "en": "This product can't be added right now."},
    "step_cart": {"tr": "Sepet", "en": "Cart"},
    "step_checkout": {"tr": "Ödeme", "en": "Checkout"},
    "step_done": {"tr": "Onay", "en": "Done"},
    "order_summary": {"tr": "Sipariş özeti", "en": "Order summary"},
    "subtotal": {"tr": "Ara toplam", "en": "Subtotal"},
    "shipping": {"tr": "Kargo", "en": "Shipping"},
    "free": {"tr": "Ücretsiz", "en": "Free"},
    "total": {"tr": "Toplam", "en": "Total"},
    "n_items": {"tr": "{n} ürün", "en": "{n} items"},
    "items": {"tr": "Ürün", "en": "Items"},
    "to_checkout": {"tr": "Güvenli ödemeye geç", "en": "Proceed to secure checkout"},
    "continue_shopping": {"tr": "Alışverişe devam et", "en": "Continue shopping"},
    "checkout_title": {"tr": "Ödeme", "en": "Checkout"},
    "shipping_address": {"tr": "Teslimat adresi", "en": "Shipping address"},
    "full_name": {"tr": "Ad Soyad", "en": "Full name"},
    "address": {"tr": "Adres", "en": "Address"},
    "city": {"tr": "Şehir", "en": "City"},
    "phone": {"tr": "Telefon", "en": "Phone"},
    "payment": {"tr": "Ödeme bilgileri", "en": "Payment"},
    "demo_payment_note": {"tr": "Bu bir DEMO ödeme formudur. Gerçek kart bilgisi girmeyin — yalnızca test kartı 4242 4242 4242 4242 kabul edilir, kart bilgisi saklanmaz.",
                          "en": "This is a DEMO payment form. Never enter a real card — only the test card 4242 4242 4242 4242 is accepted and no card data is stored."},
    "card_number": {"tr": "Kart numarası", "en": "Card number"},
    "test_card": {"tr": "test kartı", "en": "test card"},
    "card_exp": {"tr": "Son kullanma (AA/YY)", "en": "Expiry (MM/YY)"},
    "place_order": {"tr": "Siparişi tamamla", "en": "Place order"},
    "no_real_payment": {"tr": "Demo: kartınızdan para çekilmez.", "en": "Demo: no money is charged."},
    "err_name": {"tr": "Ad soyad 2-80 karakter olmalı.", "en": "Full name must be 2–80 characters."},
    "err_address": {"tr": "Adres 5-200 karakter olmalı.", "en": "Address must be 5–200 characters."},
    "err_city": {"tr": "Şehir 2-60 karakter olmalı.", "en": "City must be 2–60 characters."},
    "err_card": {"tr": "Demo mağazada yalnızca test kartı 4242 4242 4242 4242 kabul edilir.",
                 "en": "This demo store only accepts the test card 4242 4242 4242 4242."},
    "err_exp": {"tr": "Son kullanma tarihi geçersiz (AA/YY).", "en": "Invalid expiry date (MM/YY)."},
    "err_cvc": {"tr": "CVC 3 veya 4 haneli olmalı.", "en": "CVC must be 3 or 4 digits."},
    "order_thanks": {"tr": "Teşekkürler, siparişiniz alındı!", "en": "Thank you, your order is confirmed!"},
    "order_placed": {"tr": "Sipariş numaranız: #{id}", "en": "Your order number: #{id}"},
    "order_demo_note": {"tr": "Bu bir demo siparişidir; ürün gönderilmez, ödeme alınmaz.",
                        "en": "This is a demo order — nothing is shipped or charged."},
    "demo_card": {"tr": "test kartı", "en": "test card"},
    # --- auth -----------------------------------------------------------------------
    "login_title": {"tr": "Tekrar hoş geldiniz", "en": "Welcome back"},
    "login_sub": {"tr": "Hesabınıza giriş yapın", "en": "Sign in to your account"},
    "username": {"tr": "Kullanıcı adı", "en": "Username"},
    "password": {"tr": "Şifre", "en": "Password"},
    "email": {"tr": "E-posta", "en": "Email"},
    "show_password": {"tr": "Şifreyi göster", "en": "Show password"},
    "login_btn": {"tr": "Giriş yap", "en": "Sign in"},
    "login_error": {"tr": "Kullanıcı adı veya şifre hatalı.", "en": "Invalid username or password."},
    "login_rate_limited": {"tr": "Çok fazla başarısız deneme. Lütfen {s} saniye sonra tekrar deneyin.",
                           "en": "Too many failed attempts. Please try again in {s} seconds."},
    "no_account": {"tr": "Hesabınız yok mu?", "en": "No account yet?"},
    "register_link": {"tr": "Hemen kaydolun", "en": "Create one"},
    "have_account": {"tr": "Zaten hesabınız var mı?", "en": "Already have an account?"},
    "demo_accounts": {"tr": "Demo hesapları", "en": "Demo accounts"},
    "demo_accounts_sub": {"tr": "Tıklayınca form doldurulur.", "en": "Click to fill the form."},
    "welcome_back": {"tr": "Hoş geldin, {name}!", "en": "Welcome back, {name}!"},
    "logged_out": {"tr": "Çıkış yaptınız.", "en": "You have been signed out."},
    "register_title": {"tr": "Hesap oluştur", "en": "Create an account"},
    "register_sub": {"tr": "Birkaç saniyede üye olun", "en": "It only takes a few seconds"},
    "register_btn": {"tr": "Kaydol", "en": "Sign up"},
    "username_hint": {"tr": "3-20 karakter: harf, rakam, . _ -", "en": "3–20 characters: letters, digits, . _ -"},
    "username_invalid": {"tr": "Kullanıcı adı 3-20 karakter olmalı ve yalnızca harf, rakam, . _ - içermeli.",
                         "en": "Username must be 3–20 characters: letters, digits, . _ - only."},
    "username_taken": {"tr": "Bu kullanıcı adı alınmış.", "en": "This username is taken."},
    "email_invalid": {"tr": "Geçerli bir e-posta adresi girin.", "en": "Please enter a valid email address."},
    "pw_rule_length": {"tr": "Şifre en az 8 karakter olmalı.", "en": "Password must be at least 8 characters."},
    "pw_rule_max": {"tr": "Şifre en fazla 128 karakter olabilir.", "en": "Password can be at most 128 characters."},
    "pw_rule_letter": {"tr": "Şifre en az bir harf içermeli.", "en": "Password must contain a letter."},
    "pw_rule_digit": {"tr": "Şifre en az bir rakam içermeli.", "en": "Password must contain a digit."},
    "pw_rule_username": {"tr": "Şifre kullanıcı adıyla aynı olamaz.", "en": "Password must not equal the username."},
    "pw_rule_common": {"tr": "Bu şifre çok yaygın, başka bir şifre seçin.", "en": "This password is too common."},
    "register_ok": {"tr": "Aramıza hoş geldin, {name}!", "en": "Welcome aboard, {name}!"},
    # --- account --------------------------------------------------------------------------
    "account_title": {"tr": "Hesabım", "en": "My account"},
    "account_sub": {"tr": "Profiliniz ve siparişleriniz", "en": "Your profile and orders"},
    "member_since": {"tr": "Üyelik", "en": "Member since"},
    "role": {"tr": "Rol", "en": "Role"},
    "role_admin": {"tr": "Yönetici", "en": "Administrator"},
    "role_user": {"tr": "Müşteri", "en": "Customer"},
    "change_email": {"tr": "E-posta adresini değiştir", "en": "Change email address"},
    "new_email": {"tr": "Yeni e-posta adresi", "en": "New email address"},
    "email_saved": {"tr": "E-posta adresiniz güncellendi.", "en": "Your email address was updated."},
    "my_orders": {"tr": "Siparişlerim", "en": "My orders"},
    "no_orders": {"tr": "Henüz siparişiniz yok.", "en": "No orders yet."},
    "order_no": {"tr": "Sipariş", "en": "Order"},
    "date": {"tr": "Tarih", "en": "Date"},
    "status": {"tr": "Durum", "en": "Status"},
    "status_paid": {"tr": "Ödendi", "en": "Paid"},
    "status_shipped": {"tr": "Kargoda", "en": "Shipped"},
    # --- admin ----------------------------------------------------------------------------
    "admin_only": {"tr": "Yalnızca yöneticiler", "en": "Admins only"},
    "admin_title": {"tr": "Yönetim paneli", "en": "Admin dashboard"},
    "admin_sub": {"tr": "Merhaba {name}, mağazanın genel durumu.", "en": "Hi {name}, here's how the store is doing."},
    "stat_revenue": {"tr": "Toplam ciro", "en": "Revenue"},
    "stat_orders": {"tr": "Sipariş", "en": "Orders"},
    "stat_users": {"tr": "Kullanıcı", "en": "Users"},
    "stat_products": {"tr": "Ürün", "en": "Products"},
    "revenue_by_category": {"tr": "Kategoriye göre ciro", "en": "Revenue by category"},
    "low_stock_title": {"tr": "Azalan stok", "en": "Low stock"},
    "recent_orders": {"tr": "Son siparişler", "en": "Recent orders"},
    "customer": {"tr": "Müşteri", "en": "Customer"},
    "users": {"tr": "Kullanıcılar", "en": "Users"},
    # --- errors -----------------------------------------------------------------------------
    "err_400_title": {"tr": "Geçersiz istek", "en": "Bad request"},
    "err_400_msg": {"tr": "İsteğiniz işlenemedi.", "en": "Your request could not be processed."},
    "err_csrf_msg": {"tr": "Güvenlik anahtarı (CSRF token) eksik veya geçersiz. Sayfayı yenileyip tekrar deneyin.",
                     "en": "The security token (CSRF token) is missing or invalid. Reload the page and try again."},
    "err_403_title": {"tr": "Erişim engellendi", "en": "Access denied"},
    "err_403_msg": {"tr": "Bu sayfayı görüntüleme yetkiniz yok.", "en": "You don't have permission to view this page."},
    "err_404_title": {"tr": "Sayfa bulunamadı", "en": "Page not found"},
    "err_404_msg": {"tr": "Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.", "en": "The page you're looking for doesn't exist."},
    "err_405_title": {"tr": "Yönteme izin verilmiyor", "en": "Method not allowed"},
    "err_405_msg": {"tr": "Bu adres bu istek türünü desteklemiyor.", "en": "This address doesn't support that request method."},
    "err_413_title": {"tr": "İstek çok büyük", "en": "Request too large"},
    "err_413_msg": {"tr": "Gönderilen veri izin verilen boyutu aşıyor.", "en": "The submitted data is too large."},
    "err_429_title": {"tr": "Çok fazla istek", "en": "Too many requests"},
    "err_429_msg": {"tr": "Lütfen biraz bekleyip tekrar deneyin.", "en": "Please wait a moment and try again."},
    "err_500_title": {"tr": "Bir şeyler ters gitti", "en": "Something went wrong"},
    "err_500_msg": {"tr": "Beklenmeyen bir hata oluştu. Ekibimiz bilgilendirildi.", "en": "An unexpected error occurred. We've been notified."},
}

_MONTHS = {
    "tr": ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
    "en": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
}


def get_lang() -> str:
    """The language of the current request ("tr" or "en")."""
    if has_request_context():
        return g.get("lang", DEFAULT_LANG)
    return DEFAULT_LANG


def t(key: str, **kwargs: Any) -> str:
    """Translate ``key`` into the current language and fill in ``{placeholders}``.

    Unknown keys are returned unchanged, which makes a missing translation easy to spot.
    """
    entry = TRANSLATIONS.get(key)
    if entry is None:
        return key
    text = entry.get(get_lang()) or entry[DEFAULT_LANG]
    return text.format(**kwargs) if kwargs else text


def money(kurus: int | None) -> str:
    """Format an amount in kuruş as Turkish lira: TR "1.249,90 ₺", EN "₺1,249.90"."""
    value = (kurus or 0) / 100
    english = f"{value:,.2f}"  # 1,249.90
    if get_lang() == "en":
        return f"₺{english}"
    turkish = english.replace(",", "_").replace(".", ",").replace("_", ".")  # 1.249,90
    return f"{turkish} ₺"


def format_date(value: str | None) -> str:
    """Format an SQLite timestamp "2026-11-04 10:00:00" as "4 Kasım 2026" / "4 Nov 2026"."""
    if not value:
        return ""
    try:
        d = datetime.fromisoformat(str(value))
    except ValueError:
        return str(value)
    return f"{d.day} {_MONTHS[get_lang()][d.month - 1]} {d.year}"


def lang_url(code: str) -> str:
    """URL of the current page in another language (keeps the other query parameters)."""
    args = request.args.to_dict()
    args["lang"] = code
    return f"{request.path}?{urlencode(args)}"


def select_language() -> None:
    """``before_request`` hook: decide the language and store it on ``g.lang``."""
    from_query = request.args.get("lang")
    from_cookie = request.cookies.get(COOKIE_NAME)
    if from_query in SUPPORTED:
        g.lang = from_query
        g.set_lang_cookie = from_query != from_cookie
    elif from_cookie in SUPPORTED:
        g.lang = from_cookie
    else:
        g.lang = DEFAULT_LANG


def remember_language(response: Response) -> Response:
    """``after_request`` hook: save a newly chosen language in a cookie.

    SECURITY: even harmless cookies get HttpOnly + SameSite (JS does not need to read it).
    """
    if g.get("set_lang_cookie"):
        response.set_cookie(COOKIE_NAME, g.lang, max_age=COOKIE_MAX_AGE, httponly=True,
                            samesite="Lax", secure=bool(request.is_secure))
    response.headers.setdefault("Content-Language", g.get("lang", DEFAULT_LANG))
    return response


def init_app(app: Flask) -> None:
    """Register hooks, the ``t`` function and the ``money``/``date`` filters."""
    app.before_request(select_language)
    app.after_request(remember_language)
    app.jinja_env.globals.update(t=t, lang_url=lang_url)
    app.jinja_env.filters["money"] = money
    app.jinja_env.filters["date"] = format_date

    @app.context_processor
    def inject_lang() -> dict[str, str]:
        return {"lang": get_lang()}
