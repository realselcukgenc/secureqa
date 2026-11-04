# SecureShop demo — production image (TR: üretim imajı).
# Build:  docker build -t secureshop .
# Run:    docker run -p 8000:8000 secureshop   ->  http://localhost:8000
#
# Multi-stage: the "builder" stage compiles/collects wheels, the final stage is a slim
# runtime with only what is needed to serve the app (smaller, fewer moving parts).

# ---- Stage 1: build dependencies into wheels -------------------------------------------
FROM python:3.13-slim AS builder

WORKDIR /build

# Copy only the requirement files first so Docker can cache this layer when code changes.
COPY requirements.txt requirements-deploy.txt ./

# Build wheels for all runtime + deploy deps.
RUN pip install --no-cache-dir --upgrade pip \
 && pip wheel --no-cache-dir --wheel-dir=/wheels -r requirements.txt -r requirements-deploy.txt

# ---- Stage 2: the runtime image --------------------------------------------------------
FROM python:3.13-slim

# SECURITY: run as a non-root user — if the app is ever compromised, it has no root in the
# container. We also give it a home so Flask's instance dir / caches are writable.
RUN useradd --create-home --uid 10001 appuser

WORKDIR /app

# Install the pre-built wheels (no network, no compilers needed in the final image).
COPY --from=builder /wheels /wheels
COPY requirements.txt requirements-deploy.txt ./
RUN pip install --no-cache-dir --no-index --find-links=/wheels \
        -r requirements.txt -r requirements-deploy.txt \
 && rm -rf /wheels

# Copy the application code. (.dockerignore keeps tests, venv, reports etc. out.)
COPY demo_app ./demo_app

# Runtime configuration.
#   PORT               -> the port gunicorn binds to (hosts often inject their own).
#   SHOP_DB            -> writable SQLite path (auto-created + seeded on first boot).
#   SHOP_SECURE_COOKIES-> on: the app sits behind HTTPS in production (see wsgi.py/ProxyFix).
# SECURITY: SHOP_SECRET_KEY is intentionally NOT baked in. Set it at deploy time so session
# cookies cannot be forged with a key that is public in the image. See DEPLOY.md.
ENV PORT=8000 \
    SHOP_DB=/tmp/secureshop.sqlite \
    SHOP_SECURE_COOKIES=1 \
    PYTHONUNBUFFERED=1

USER appuser

EXPOSE 8000

# Serve the production WSGI app. `sh -c` is used so $PORT is expanded at runtime.
# 2 workers is plenty for a demo; --timeout keeps slow clients from holding a worker forever.
CMD ["sh", "-c", "exec gunicorn demo_app.wsgi:app --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 60 --access-logfile - --error-logfile -"]
