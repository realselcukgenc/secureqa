# 🚀 SecureShop — Canlı Demo Dağıtımı · Live Demo Deployment

SecureShop demo mağazasını ücretsiz, herkese açık bir adreste yayına almak için adım adım
kılavuz. · A step-by-step guide to hosting the SecureShop demo for free on a public URL.

[🇹🇷 Türkçe](#-türkçe) · [🇬🇧 English](#-english)

---

## 🇹🇷 Türkçe

### Bu nedir, yayınlamak güvenli mi?

SecureShop, **sahte ödemeli** bir e-ticaret demo uygulamasıdır (Flask). Gerçek bir açık
(vulnerability) **yoktur**, gerçek para **alınmaz**, gerçek kart işlenmez — ödeme formu
yalnızca test kartı `4242 4242 4242 4242` kabul eder ve sahte bir sipariş onayı gösterir.
Bu yüzden internette herkese açık yayınlamak güvenlidir. Tek dikkat edilecek şey: tohum
(seed) giriş bilgileri **bilerek herkese açıktır** (aşağıdaki tablo), çünkü bu bir demodur.
Oturumların güvenli olması için **mutlaka kendi `SHOP_SECRET_KEY` değerinizi ayarlayın** —
böylece oturum çerezleri sizin gizli anahtarınızla imzalanır.

Tohum (demo) kullanıcıları — herkese açık, demo amaçlıdır:

| Kullanıcı | Parola | Rol |
|---|---|---|
| `admin` | `admin123` | admin |
| `selcuk` | `Selcuk!2026` | kullanıcı |
| `ayse` | `ayse2026` | kullanıcı |

### Ortam değişkenleri (environment variables)

| Değişken | Ne işe yarar | Üretimde |
|---|---|---|
| `SHOP_SECRET_KEY` | Oturum çerezini imzalayan gizli anahtar. Bilen kişi oturum sahteleyebilir. | **Zorunlu.** Uzun ve rastgele olsun. Boş bırakılırsa otomatik üretilir ama her yeniden başlatmada oturumlar düşer. |
| `PORT` | Sunucunun dinleyeceği port. Çoğu host bunu kendisi atar. | Host atar; elle ayarlamaya gerek yok (varsayılan 8000). |
| `SHOP_DB` | SQLite veritabanı dosyasının yolu. İlk açılışta otomatik oluşturulur ve demo verisiyle doldurulur. | Varsayılan `/tmp/secureshop.sqlite` (yazılabilir, ama kalıcı değil — her açılışta yeniden tohumlanır). |
| `SHOP_SECURE_COOKIES` | `1` ise çerezler yalnızca HTTPS üzerinden gönderilir. | HTTPS arkasında `1` (varsayılan). |

Güçlü bir anahtar üretmek için:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Seçenek 1 — Render (önerilen, en kolay)

Render ücretsiz bir "web service" sunar ve bu repodaki `render.yaml` dosyasını otomatik okur.

1. Bu repoyu **GitHub'a** gönderin (henüz göndermediyseniz).
2. [render.com](https://render.com) hesabı açın ve GitHub hesabınızı bağlayın.
3. Dashboard'da **New → Blueprint** deyin ve bu repoyu seçin.
4. Render `render.yaml`'ı okur: `secureshop` adında ücretsiz bir Docker web servisi,
   otomatik üretilen bir `SHOP_SECRET_KEY` ve `/healthz` sağlık kontrolüyle kurar.
   **Apply / Create** deyin.
5. İlk derleme (build) birkaç dakika sürer. Bitince Render size
   `https://secureshop-XXXX.onrender.com` gibi bir canlı adres verir — paylaşabilirsiniz.

> Ücretsiz katman boştayken uykuya geçer; ilk istek onu ~30 sn içinde uyandırır (ilk açılış
> yavaş olabilir, normaldir). `SHOP_SECRET_KEY` Render tarafından bir kez üretilip saklandığı
> için oturumlar kalıcıdır.

### Seçenek 2 — Fly.io

1. Fly CLI'yi kurun ve giriş yapın: `fly auth login`.
2. Repo kökünde app adını ayırın (deploy etmeden): `fly launch --copy-config --no-deploy`.
   (`fly.toml` içindeki `app = "secureshop-demo"` adını küresel olarak benzersiz yapın.)
3. Gizli anahtarı ayarlayın:
   ```bash
   fly secrets set SHOP_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
   ```
4. Dağıtın: `fly deploy`. Bitince `fly open` canlı adresi tarayıcıda açar.

### Seçenek 3 — Docker (yerelde, canlıyla birebir aynı)

Render/Fly ile **tam olarak aynı** imajı kendi bilgisayarınızda çalıştırın:

```bash
docker build -t secureshop .
docker run -p 8000:8000 secureshop
```

Sonra tarayıcıda açın: <http://localhost:8000>

Kendi gizli anahtarınızla:

```bash
docker run -p 8000:8000 -e SHOP_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))") secureshop
```

### Docker olmadan yerelde (gunicorn)

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt -r requirements-deploy.txt
PORT=8000 SHOP_SECRET_KEY=degistir gunicorn demo_app.wsgi:app -b 0.0.0.0:8000
```

---

## 🇬🇧 English

### What is this, and is it safe to host?

SecureShop is an e-commerce demo app (Flask) with a **fake checkout**. It has **no real
vulnerabilities**, takes **no real payments**, and processes no real cards — the checkout form
only accepts the test card `4242 4242 4242 4242` and shows a fake order confirmation. That
makes it safe to host publicly. One thing to note: the seed login credentials are **public by
design** (table below), because this is a demo. For sessions to be secure you **must set your
own `SHOP_SECRET_KEY`** so session cookies are signed with your private key.

Seed (demo) users — public, for demo purposes:

| User | Password | Role |
|---|---|---|
| `admin` | `admin123` | admin |
| `selcuk` | `Selcuk!2026` | user |
| `ayse` | `ayse2026` | user |

### Environment variables

| Variable | What it does | In production |
|---|---|---|
| `SHOP_SECRET_KEY` | Secret key that signs the session cookie. Whoever knows it can forge sessions. | **Required.** Make it long and random. If unset it is auto-generated, but sessions drop on every restart. |
| `PORT` | Port the server listens on. Most hosts set this for you. | Set by the host; no need to set it manually (default 8000). |
| `SHOP_DB` | Path to the SQLite DB file. Auto-created and seeded with demo data on first boot. | Defaults to `/tmp/secureshop.sqlite` (writable but ephemeral — re-seeded on each boot). |
| `SHOP_SECURE_COOKIES` | `1` sends cookies only over HTTPS. | `1` behind HTTPS (the default). |

Generate a strong key with:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Option 1 — Render (recommended, easiest)

Render offers a free "web service" and automatically reads the `render.yaml` in this repo.

1. Push this repo to **GitHub** (if you haven't already).
2. Create an account at [render.com](https://render.com) and connect your GitHub account.
3. In the dashboard choose **New → Blueprint** and select this repo.
4. Render reads `render.yaml`: it provisions a free Docker web service named `secureshop`,
   an auto-generated `SHOP_SECRET_KEY`, and a `/healthz` health check. Click **Apply / Create**.
5. The first build takes a few minutes. When it finishes, Render gives you a live URL like
   `https://secureshop-XXXX.onrender.com` — share that link.

> The free tier sleeps when idle; the first request wakes it within ~30 s (the first load can
> be slow — that's normal). Because Render generates and stores `SHOP_SECRET_KEY` once,
> sessions persist across restarts.

### Option 2 — Fly.io

1. Install the Fly CLI and log in: `fly auth login`.
2. From the repo root reserve the app name (without deploying): `fly launch --copy-config --no-deploy`.
   (Make `app = "secureshop-demo"` in `fly.toml` globally unique.)
3. Set the secret key:
   ```bash
   fly secrets set SHOP_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
   ```
4. Deploy: `fly deploy`. When it finishes, `fly open` opens the live URL.

### Option 3 — Docker (locally, identical to the live version)

Run the **exact same** image Render/Fly runs, on your own machine:

```bash
docker build -t secureshop .
docker run -p 8000:8000 secureshop
```

Then open <http://localhost:8000> in your browser.

With your own secret key:

```bash
docker run -p 8000:8000 -e SHOP_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))") secureshop
```

### Locally without Docker (gunicorn)

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt -r requirements-deploy.txt
PORT=8000 SHOP_SECRET_KEY=changeme gunicorn demo_app.wsgi:app -b 0.0.0.0:8000
```
