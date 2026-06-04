FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps untuk psycopg2-binary (butuh libpq) dan build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collectstatic di build time — SECRET_KEY dan DATABASE_URL dummy hanya untuk
# pass Django checks. Nilai asli diset di HF Space Secrets saat runtime.
RUN SECRET_KEY=build-only DEBUG=True DATABASE_URL=sqlite:///tmp.db \
    python manage.py collectstatic --noinput

EXPOSE 7860

# Migrate jalan duluan agar schema selalu sync dengan Supabase.
CMD python manage.py migrate --noinput && \
    gunicorn config.wsgi:application \
    --bind 0.0.0.0:7860 \
    --workers 2 \
    --threads 2 \
    --timeout 120 \
    --access-logfile -
