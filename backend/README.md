# Backend — Sovereign Dialect-Bridge

Django REST API + NLP pipeline lokal untuk platform pengaduan publik multidialek Indonesia.

```
input pengaduan
   │
   ▼ detect_dialect         ← joblib LogReg (4.7 MB) → langdetect → "xx"
   ▼ translate_to_indonesian ← NLLB-200-distilled (1.2 GB) → deep_translator → raw text
   ▼ summarize              ← mT5-base NusaSum (2.2 GB, custom) → TextRank → 2 kalimat
   ▼ extract_entities       ← Cahya BERT NER (440 MB) → regex
   ▼ classify_category      ← keyword matching (no model)
   ▼ score_urgency          ← weighted keyword scoring (no model)
   ▼ extract_keywords       ← frekuensi + stopword filter
   ▼
output: {dialect, translated, summary, entities, category, urgency, keywords}
```

Setiap stage punya **fallback chain** — pipeline tidak akan crash kalau model neural gagal load.

---

## 1. Prasyarat

| Tool | Versi Minimum |
|------|--------------|
| Python | 3.11+ |
| RAM (lokal, NLP_ENABLED=true) | 8 GB minimum, 12 GB rekomendasi |
| Disk (model cache) | ~5 GB |

Database sudah di-host di Supabase — tidak perlu install Postgres lokal.

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

> Install pertama download ~2 GB (torch CPU + transformers + tokenizers). 5-10 menit.

### 2.2 Konfigurasi `.env`

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Cara |
|----------|------|
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DATABASE_URL` | Supabase Dashboard → Database → Session Pooler URI |
| `NLP_ENABLED` | `false` untuk dev cepat (fallback mode), `true` untuk full pipeline |
| `MT5_MODEL_PATH` | (opsional) Path lokal atau HF Hub repo. Default: `backend/models/mt5base/` kalau ada |

### 2.3 Migrate + runserver

```bash
python manage.py migrate
python manage.py runserver   # → http://localhost:8000
```

**Boot time:**
- `NLP_ENABLED=false` (default): **<1 detik**, semua stage pakai fallback (akurasi sedikit menurun)
- `NLP_ENABLED=true`: **<1 detik** untuk listen port, model load di background thread (~30-90 detik warmup). Request pertama yang butuh model tunggu sampai loaded; berikutnya instant.

---

## 3. Arsitektur NLP Pipeline

### 3.1 Struktur folder

```
backend/nlp/
├── __init__.py
├── config.py     ← Konstanta: dialek mapping, stopword, keyword urgency/kategori
├── models.py     ← Lazy loader (thread-safe, background warmup, fallback graceful)
└── pipeline.py   ← Orchestrator: run_pipeline() + stage functions
```

### 3.2 Lazy loading model

`nlp.models.loader` adalah **singleton** dengan strategi:

1. **`loader.start_warmup()`** dipanggil dari `complaints/apps.py.ready()` saat Django boot.
   Spawn 1 background thread → load model satu per satu.
2. **`loader.get(ModelKind.MT5)`** dipanggil dari pipeline saat request.
   - Kalau model sudah loaded → return instance, instant.
   - Kalau belum (warmup belum sampai) → ambil lock, load di thread ini (blocking).
   - Kalau `NLP_ENABLED=false` → return `None` → pipeline auto-pakai fallback.
3. Idempoten — `start_warmup()` aman dipanggil berkali-kali (Django autoreload, gunicorn preload).

### 3.3 Fallback chain per stage

| Stage | Primary | Fallback 1 | Fallback 2 | Final |
|-------|---------|------------|------------|-------|
| Dialect | joblib LogReg (12 dialek) | langdetect | — | `"xx"` |
| Translate | NLLB lokal (Flores-200) | deep_translator (Google) | googletrans | raw text |
| Summarize | mT5-base NusaSum custom | TextRank (sklearn+networkx) | — | 2 kalimat pertama |
| NER | Cahya BERT IndoBERT | regex (Jalan/Desa/Dinas/dll) | — | `[]` |
| Category | keyword matching 8 kategori | — | — | `"Umum"` |
| Urgency | weighted keyword scoring | — | — | `"low"` |
| Keywords | frekuensi + stopword filter | — | — | — |

Pipeline **TIDAK pernah crash**. Worst case: pakai fallback chain → confidence turun jadi 0.4.

### 3.4 Mapping dialek → NLLB Flores-200

| Dialek lokal | NLLB code | Catatan |
|--------------|-----------|---------|
| id | ind_Latn | Bahasa Indonesia (target) |
| jv | jav_Latn | Jawa |
| su | sun_Latn | Sunda |
| min | min_Latn | Minangkabau |
| ace | ace_Latn | Aceh |
| ban | ban_Latn | Bali |
| bjn | bjn_Latn | Banjar |
| bug | bug_Latn | Bugis |
| mad | (NLLB miss) | fallback ke deep_translator |
| nij | (NLLB miss) | fallback |
| bbc | (NLLB miss) | fallback |

---

## 4. Hosting Model untuk Production

mT5-base custom fine-tuned NusaSum **TIDAK boleh** di-commit ke git (2.2 GB).
Strategi: upload ke **Hugging Face Hub** (gratis, unlimited public model repo).

### 4.1 Upload mT5 ke HF Hub (sekali saja)

```bash
# 1. Generate HF token: https://huggingface.co/settings/tokens (Write access)
# 2. Login lokal
huggingface-cli login   # paste token

# 3. Upload pakai script helper
cd backend
python scripts/upload_mt5_to_hf.py <hf-username> sovereign-mt5-nusasum
# Estimasi: 5-15 menit (2.2 GB upload)
```

Selesai → model live di `https://huggingface.co/<username>/sovereign-mt5-nusasum`.

### 4.2 Set HF Space pakai model dari Hub

HF Space → Settings → Secrets → tambah:
```
MT5_MODEL_PATH = <username>/sovereign-mt5-nusasum
NLP_ENABLED    = true
```

Saat boot pertama, pipeline auto-pull model dari HF Hub ke `/data/huggingface` (persistent cache). Boot berikutnya pakai cache → fast.

### 4.3 Model lain (auto dari HF Hub)

| Model | HF Hub ID | Size | Override env var |
|-------|-----------|------|------------------|
| NLLB | `facebook/nllb-200-distilled-600M` | 1.2 GB | `NLLB_MODEL_ID` |
| NER | `cahya/bert-base-indonesian-NER` | 440 MB | `NER_MODEL_ID` |
| Dialect | (local file `models/dialect_detector/`) | 4.7 MB | (di-bundle) |

Total disk cache di production: **~3.8 GB** di `/data/huggingface`. HF Space free tier 50 GB → ample.

---

## 5. Smoke Test NLP

### 5.1 Fallback mode (cepat, tanpa torch)

```bash
NLP_ENABLED=false python manage.py shell -c "
from nlp.pipeline import run_pipeline
r = run_pipeline('Dalane rusak banget wis suwe ora dibenahi, tolong cepat diperbaiki sebelum ada korban')
print('dialect:', r.dialect, '(', r.dialect_confidence, ')')
print('summary:', r.summary[:120])
print('category:', r.category_name, '| urgency:', r.urgency_level)
print('keywords:', r.keywords)
print('confidence:', r.confidence)
"
```

Expected: `urgency=critical`, `category=Infrastruktur`. Summary fallback ke 2 kalimat pertama.

### 5.2 Full pipeline mode (semua model neural)

```bash
NLP_ENABLED=true python manage.py shell -c "
from nlp.pipeline import run_pipeline
from nlp.models import loader
r = run_pipeline('Dalane ning omah rusak banget tolong cepat diperbaiki sebelum ada korban kecelakaan')
print('translated:', r.translated_text[:120])
print('summary:', r.summary[:120])
print('Model status:', loader.status())
"
```

Pertama kali jalan: ~30-90 detik (download model dari HF Hub).
Kedua dan seterusnya: ~5-15 detik (mT5 inference CPU).

---

## 6. Perintah Umum

```bash
python manage.py createsuperuser   # akun admin untuk /admin/
python manage.py makemigrations    # setelah ubah model
pytest                              # semua test
pytest accounts/tests.py -v         # test spesifik
```

---

## 7. Troubleshooting

| Gejala | Sebab + Fix |
|--------|-------------|
| `migrate` gagal | Supabase pause? Cek dashboard, restore project |
| `psycopg2` install gagal di macOS | `brew install libpq && pip install psycopg2-binary --no-cache` |
| Boot lama walau `NLP_ENABLED=false` | `import torch` masih ke-trigger di file lain? Pastikan torch di-import lazy di `nlp/pipeline.py` |
| OOM saat load mT5 di Mac 8 GB | Set `NLP_ENABLED=false` + tutup VSCode/Chrome. Mac 8 GB tidak cukup untuk full pipeline + dev tools |
| HF Hub download lambat | Set `HF_TOKEN` env var (gratis, dari huggingface.co/settings/tokens) → rate limit naik |
| `MT5_MODEL_PATH` salah | Cek `python -c "from nlp.config import MT5_MODEL_PATH; print(MT5_MODEL_PATH)"` |
| Model status `failed: true` | Cek log di console — biasanya OOM / network / disk full. Pipeline tetap jalan pakai fallback |

---

## 8. Deploy ke HF Spaces

Singkat:
1. Upload mT5 ke HF Hub (§4.1)
2. Buat HF Space (Docker SDK)
3. Push isi folder `backend/` ke repo Space
4. Set Secrets: `SECRET_KEY`, `DATABASE_URL`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `NLP_ENABLED=true`, `MT5_MODEL_PATH=<username>/<repo>`
5. **Enable persistent storage** (HF Space → Settings → Persistent storage) → model cache survive antar cold start

Runbook lengkap: [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).
