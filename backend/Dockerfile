FROM python:3.11-slim

# ─────────────────────────────────────────────────────────────────────────────
# Runtime env defaults
# ─────────────────────────────────────────────────────────────────────────────
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=7860 \
    WEB_CONCURRENCY=1 \
    GUNICORN_THREADS=4 \
    GUNICORN_TIMEOUT=180 \
    \
    # ── HF Hub & Transformers ───────────────────────────────────────────────
    # HF_HOME ke /data → persistent storage HF Space. Model di-cache di sini,
    # tidak hilang saat Space sleep/wake. Set di HF Space → Settings → Persistent storage.
    HF_HOME=/data/huggingface \
    TRANSFORMERS_CACHE=/data/huggingface/transformers \
    HF_HUB_DISABLE_TELEMETRY=1 \
    \
    # ── PyTorch ─────────────────────────────────────────────────────────────
    # Single-threaded BLAS supaya gunicorn worker tidak rebut CPU.
    OMP_NUM_THREADS=2 \
    MKL_NUM_THREADS=2 \
    TOKENIZERS_PARALLELISM=false

WORKDIR /app

# ─────────────────────────────────────────────────────────────────────────────
# System deps: libpq untuk psycopg2 + curl untuk HEALTHCHECK
# ─────────────────────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ─────────────────────────────────────────────────────────────────────────────
# Python deps (layer cache: install duluan supaya cache hit saat code change)
# Install torch CPU-only wheel — 2× lebih kecil dari default GPU build.
# ─────────────────────────────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir torch==2.4.1+cpu --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# ─────────────────────────────────────────────────────────────────────────────
# Project code
# ─────────────────────────────────────────────────────────────────────────────
COPY . .

# ─────────────────────────────────────────────────────────────────────────────
# Collectstatic di build time — env var dummy hanya untuk pass Django check.
# Nilai asli diset di HF Space Secrets saat runtime.
# ─────────────────────────────────────────────────────────────────────────────
RUN SECRET_KEY=build-only DEBUG=True DATABASE_URL=sqlite:///tmp.db NLP_ENABLED=false \
    python manage.py collectstatic --noinput

EXPOSE 7860

# ─────────────────────────────────────────────────────────────────────────────
# Health probe — endpoint ringan, tidak trigger model load.
# start-period 60s supaya container punya waktu boot Django + parse env.
# ─────────────────────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
    CMD curl -fsS http://127.0.0.1:${PORT}/health/ || exit 1

# ─────────────────────────────────────────────────────────────────────────────
# Boot: migrate → gunicorn dengan preload supaya model di-share antar worker.
# - --preload: model di-load di master process, fork ke worker (efisien RAM)
# - --workers: 1 untuk HF Space free tier (RAM ketat); naikkan kalau upgrade
# - --threads: 4 untuk handle concurrent request (model inference di GIL-free C++)
# ─────────────────────────────────────────────────────────────────────────────
CMD python manage.py migrate --noinput && \
    gunicorn config.wsgi:application \
    --bind 0.0.0.0:${PORT} \
    --workers ${WEB_CONCURRENCY} \
    --threads ${GUNICORN_THREADS} \
    --timeout ${GUNICORN_TIMEOUT} \
    --worker-tmp-dir /dev/shm \
    --preload \
    --access-logfile -
