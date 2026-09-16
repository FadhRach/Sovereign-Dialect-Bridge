# Backend — Sovereign Dialect-Bridge

Django REST API untuk platform pengaduan publik multidialek Indonesia, di-deploy sebagai serverless function di Vercel.

Model neural (translate/summarize/NER) tidak jalan di proses ini — dipindah ke layanan Modal terpisah (`../nlp-service/`) karena Vercel serverless tidak muat torch/transformers (~3.8GB model, butuh persistent disk & background thread yang tidak tersedia di serverless). Backend memicu Modal lewat trigger HTTP, hasilnya diterima balik lewat callback:

```
POST /api/complaints/ (submit aduan)
   │
   ▼ detect_dialect (lokal)   ← joblib LogReg (4.7 MB) → langdetect → "xx"
   ▼ trigger Modal /start     ← non-blocking, Modal proses translate+summarize+NER di background
   │                            (gagal/timeout → fallback lokal langsung: deep_translator → TextRank → regex)
   ▼ ... beberapa detik kemudian ...
   ▼ Modal callback ke /api/internal/nlp-callback/
   ▼ classify_category (lokal, keyword matching)
   ▼ score_urgency (lokal, weighted keyword scoring)
   ▼ extract_keywords (lokal, frekuensi + stopword filter)
   ▼
Complaint tersimpan: {dialect, translated, summary, entities, category, urgency, keywords}
```

Kalau Modal tidak terjangkau, pipeline lokal (fallback) langsung mengambil alih secara síncron — aduan tetap selesai, hanya kualitas hasil sedikit menurun.

---

## 1. Prasyarat

| Tool | Versi Minimum |
|------|--------------|
| Python | 3.11+ |

Database sudah di-host di Supabase — tidak perlu install Postgres lokal. Model neural jalan di Modal (`../nlp-service/`), bukan di proses backend ini — tidak perlu RAM/disk besar untuk develop backend secara lokal.

---

## 2. Setup Lokal

### 2.1 Virtual environment + install

```bash
cd backend
python3 -m venv venv
source venv/bin/activate    # macOS/Linux
# venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

### 2.2 Konfigurasi `.env`

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Cara |
|----------|------|
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DATABASE_URL` | Supabase Dashboard → Database → Session Pooler URI |
| `MODAL_START_URL` / `MODAL_HEALTH_URL` / `MODAL_SHARED_SECRET` | Isi setelah deploy `../nlp-service/` (lihat README di sana). Kosongkan untuk develop dengan fallback lokal saja |
| `NLP_CALLBACK_URL` | URL publik endpoint callback backend ini — isi setelah backend live |
| `CRON_SECRET` | Untuk endpoint keepalive Supabase, `python -c "import secrets; print(secrets.token_urlsafe(32))"` |

### 2.3 Migrate + runserver

```bash
python manage.py migrate
python manage.py runserver   # → http://localhost:8000
```

Kalau `MODAL_START_URL` kosong, submit aduan otomatis pakai pipeline lokal (fallback) — tidak perlu Modal untuk develop fitur non-NLP.

---

## 3. Arsitektur NLP

### 3.1 Struktur folder

```
backend/nlp/
├── __init__.py
├── config.py        ← Konstanta: dialek mapping, stopword, keyword urgency/kategori
├── models.py        ← Lazy loader dialect detector (satu-satunya model lokal)
├── pipeline.py       ← Pipeline lokal (fallback): translate/summarize/NER tanpa torch
└── modal_client.py   ← Trigger HTTP ke layanan Modal (../../nlp-service/)
```

### 3.2 Trigger + callback ke Modal

Model neural (NLLB, mT5/IndoT5, IndoBERT NER) jalan di `../nlp-service/` (Modal App), bukan di proses ini — Vercel serverless tidak muat torch/transformers (~3.8GB, butuh persistent disk & background thread yang tidak tersedia di serverless).

Alur submit aduan (`ComplaintListCreateView.post`, lihat `complaints/views.py`):
1. Deteksi dialek lokal (`detect_dialect`, joblib — cepat, tidak butuh Modal).
2. `nlp.modal_client.trigger_modal_processing(...)` — POST ke Modal `/start`, non-blocking di sisi Modal (Modal langsung `spawn()` dan balas cepat).
3. Kalau trigger gagal (network error/timeout) → pipeline lokal (`run_pipeline()`) langsung jalan síncron sebagai fallback, aduan tetap selesai.
4. Kalau trigger berhasil → Modal proses translate+summarize+NER di background, lalu `POST` hasilnya ke `NLPCallbackView` (`/api/internal/nlp-callback/`). Callback ini yang menjalankan `classify_category`/`score_urgency`/`extract_keywords` dan menyimpan hasil akhir.

Kedua endpoint (trigger dari Django, callback dari Modal) diverifikasi pakai `MODAL_SHARED_SECRET` yang sama di kedua arah.

### 3.3 Fallback chain lokal (dipakai saat Modal tidak terjangkau)

| Stage | Lokal (fallback) |
|-------|-------------------|
| Dialect | joblib LogReg (12 dialek) → langdetect → `"xx"` (selalu lokal, bukan fallback Modal) |
| Translate | deep_translator (Google Translate) → googletrans → raw text |
| Summarize | TextRank (TF-IDF + PageRank) → 2 kalimat pertama |
| NER | regex (Jalan/Desa/Dinas/dll) |
| Category | keyword matching 8 kategori |
| Urgency | weighted keyword scoring |
| Keywords | frekuensi + stopword filter |

Pipeline lokal **tidak pernah crash** — worst case confidence turun ke ~0.4-0.55. Lihat `../nlp-service/README.md` untuk detail model neural (NLLB/mT5/IndoT5/NER) yang jadi jalur utama saat Modal reachable.

---

## 4. Smoke Test

### 4.1 Pipeline lokal (tanpa Modal)

```bash
python manage.py shell -c "
from nlp.pipeline import run_pipeline
r = run_pipeline('Dalane rusak banget wis suwe ora dibenahi, tolong cepat diperbaiki sebelum ada korban')
print('dialect:', r.dialect, '(', r.dialect_confidence, ')')
print('summary:', r.summary[:120])
print('category:', r.category_name, '| urgency:', r.urgency_level)
print('keywords:', r.keywords)
print('confidence:', r.confidence)
"
```

Expected: `urgency=critical`, `category=Infrastruktur`.

### 4.2 Trigger Modal end-to-end

Set `MODAL_START_URL`/`MODAL_HEALTH_URL`/`MODAL_SHARED_SECRET`/`NLP_CALLBACK_URL` di `.env` (lihat `../nlp-service/README.md` untuk cara deploy Modal-nya), lalu submit aduan lewat `POST /api/complaints/` dan cek `processing_stage` berubah dari `queued` ke `done` setelah callback Modal masuk.

---

## 5. Perintah Umum

```bash
python manage.py createsuperuser   # akun admin untuk /admin/
python manage.py makemigrations    # setelah ubah model
pytest                              # semua test
pytest accounts/tests.py -v         # test spesifik
```

---

## 6. Troubleshooting

| Gejala | Sebab + Fix |
|--------|-------------|
| `migrate` gagal | Supabase pause? Cek dashboard, restore project. Kalau sering terjadi, pastikan cron keepalive (`/api/system/keepalive/`) aktif |
| `psycopg2` install gagal di macOS | `brew install libpq && pip install psycopg2-binary --no-cache` |
| Aduan selalu pakai hasil fallback (bukan neural) | Cek `MODAL_START_URL`/`MODAL_SHARED_SECRET` terisi benar, dan `../nlp-service/` sudah di-deploy (`modal deploy app.py`) |
| Callback Modal tidak pernah sampai | `NLP_CALLBACK_URL` harus URL publik yang bisa diakses dari luar (bukan `localhost` kecuali pakai tunnel seperti ngrok saat develop) |
| `401 Unauthorized` di callback/keepalive | `MODAL_SHARED_SECRET` atau `CRON_SECRET` di backend tidak sama dengan yang dipakai pemanggil |

---

## 7. Deploy ke Vercel

Ringkasan (detail lengkap di root `README.md` dan `../nlp-service/README.md`):

1. Deploy `../nlp-service/` dulu (`modal deploy app.py`) — catat `MODAL_START_URL`/`MODAL_HEALTH_URL`.
2. Buat project Vercel baru, root directory `backend/`.
3. Set environment variables: `SECRET_KEY`, `DATABASE_URL`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `MODAL_START_URL`, `MODAL_HEALTH_URL`, `MODAL_SHARED_SECRET`, `NLP_CALLBACK_URL`, `CRON_SECRET`, kredensial email/Cloudinary/Google yang sudah dipakai.
4. Migrate database dari lokal: `DATABASE_URL=<supabase-url> python manage.py migrate`.
5. Deploy (`vercel --prod` atau lewat Git integration). `vercel.json` sudah menyertakan `buildCommand` (collectstatic) dan cron harian untuk `/api/system/keepalive/`.
6. Update `NLP_CALLBACK_URL` ke domain Vercel yang sebenarnya setelah deploy pertama, lalu redeploy.
