# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Sovereign Dialect-Bridge is an AI-powered public complaint platform for Indonesian citizens. Citizens submit complaints in any of 12 regional dialects; an NLP pipeline auto-detects dialect, translates to Indonesian, summarizes, extracts entities, classifies category, and scores urgency — all in a background thread. Government admins review and resolve complaints via a separate dashboard.

## Development Commands

### Code Style Requirements

Semua notebook dan code mengikuti konvensi berikut:

- **Clean code**: setiap fungsi punya satu tanggung jawab yang jelas
- **Reusable**: helper atau function didefinisikan sekali, dipanggil berkali-kali — bukan inline copy-paste
- **Minimalis**: tidak ada code yang tidak dipakai; tidak ada abstraksi prematur
- **Beginner-friendly**: nama variabel deskriptif; alur code linear, mudah diikuti dari atas ke bawah
- **Komentar seperlunya**: tulis komentar hanya untuk sesuatu yang tidak obvious dari nama variabel/fungsi itu sendiri
- **Tanpa emotikon di code**: jangan gunakan emoji di dalam code cell maupun string output

### Backend (Django)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in values
python manage.py migrate
python manage.py runserver    # http://localhost:8000
```

Run tests:
```bash
cd backend
pytest                        # all tests
pytest accounts/tests.py      # single file
pytest -k "test_login"        # single test by name
```

Create superuser:
```bash
python manage.py createsuperuser
```

### Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev    # http://localhost:3000
npm run build
npm run lint
```

## Architecture

### Monorepo Layout

```
backend/    Django API (Render)
  accounts/     auth: register, login, JWT, profile
  complaints/   complaint CRUD, admin ops, map data, dashboard stats
  nlp/          NLP pipeline (disabled — packages dihapus dari requirements.txt)
  config/       Django settings, root URLs

frontend/   Next.js 14 (Vercel)
  src/app/
    (auth)/         login, register pages
    (main)/         dashboard, submit, complaint/[id], admin/*, map
  src/components/   auth/, complaint/, layout/, map/, shared/
  src/hooks/        useAuth, useComplaints (data fetching hooks)
  src/lib/
    api.ts     Axios singleton — all API calls go through here
    auth.ts    JWT localStorage helpers (getAccessToken, decodeJwt, etc.)
    types.ts   Shared TypeScript types (Complaint, User, ApiResponse, etc.)

render.yaml     Konfigurasi deploy Render (root repo)
docs/           Deployment runbook + API contract (lokal saja, di-gitignore)
experiment/     NLP dataset dan notebooks (lokal saja, di-gitignore)
```

### API Contract

All backend responses follow a universal envelope:
```json
{ "success": true, "data": ..., "message": "..." }
{ "success": false, "data": null, "message": "...", "errors": {...} }
```

Endpoint prefixes:
- `/api/auth/` — register, login, logout, token/refresh, profile, change-password
- `/api/complaints/` — list/create, detail/patch/delete
  - Query params (list): `status`, `urgency`, `category`, `dialect`, `date_from`, `date_to`, `search`, `sort` (whitelist: `created_at`, `urgency_level`, `status`, `wilayah`, optionally with `-` prefix)
- `/api/complaints/map/` — public, returns lat/lng + status/urgency/category/created_at, filterable by `urgency`, `category`, `status`
- `/api/categories/` — category list (public)
- `/api/dashboard/stats/` — admin stats. Response includes: `total`, `by_status` dict, `by_urgency` dict, `by_category` top 8 list, `by_province` top 10 list, `by_dialect` dict, `weekly_trend` 8-week array, plus flat aliases (`pending`, `in_review`, `in_progress`, `resolved`, `critical`, `high`)
- `/api/admin/users/` — list (`GET`) + `PATCH /<id>/` (`role`, `is_active`)

### Authentication Flow

JWT (SimpleJWT): access token 1 hour, refresh 7 days with rotation + blacklist.

Frontend `src/lib/api.ts` is the single Axios instance. Its response interceptor handles 401s with a **single-flight refresh** pattern — parallel 401s share one refresh promise to avoid race conditions. On refresh failure it clears tokens and redirects to `/login`.

Tokens are stored in `localStorage` (keys: `access_token`, `refresh_token`). `src/lib/auth.ts` decodes the JWT payload client-side to read `role`, `email`, `full_name` without an extra API call.

### Role System

`CustomUser.role` is either `"user"` (citizen) or `"admin"` (government official). Custom `IsAdminUser` and `IsOwnerOrAdmin` DRF permission classes live in `accounts/permissions.py`. Complaint list/detail views enforce ownership filtering for non-admins.

### NLP Pipeline

`backend/nlp/pipeline.py` runs `run_pipeline(raw_text)` → `NLPResult`. Called via `threading.Thread(daemon=True)` immediately after complaint creation — the complaint is saved first, NLP fields are backfilled later. The frontend `useComplaintDetail` hook polls every 3 seconds while `summary` is null.

Pipeline stages (all have graceful fallbacks if a library/model is unavailable):
1. `detect_dialect` — langdetect → ISO 639-1 code; guard `len(text)<10 → "xx"`
2. `translate_to_indonesian(text, src_lang)` — NLLB-200-distilled-600M (`facebook/nllb-200-distilled-600M`) → deep_translator → googletrans → return raw text
3. `summarize` — mT5-base (prefix `"ringkas: "`, beams=4) → TextRank (sumy) fallback → 2 first sentences
4. `extract_entities` — `cahya/bert-base-indonesian-NER` (score>0.6, len>1, dedup) → regex (Jalan/Desa/Dinas/PLN/Puskesmas/Bapak/Ibu)
5. `classify_category` — keyword matching against **8 categories** (Infrastruktur, Kesehatan, Pendidikan, Keamanan, Lingkungan, Sosial, Administrasi, Umum)
6. `score_urgency` — **weighted scoring** (critical=100, high=60, medium=30, low=10 per match); sum ≥100 → critical, ≥60 → high, ≥30 → medium, else low
7. `extract_keywords(text, top_n=5)` — tokenize → filter STOPWORDS_ID → sort by (freq DESC, length DESC)
8. `confidence` — 0.9 if NLLB loaded, 0.7 if summarizer/NER only, 0.5 if all fallbacks

NLP models (`_summarizer`, `_ner_pipeline`, `_translator_pipeline`) are loaded once at Django startup via `ComplaintsConfig.ready()` into module-level globals, with `RUN_MAIN` guard to avoid double-load via Django reloader.

`DIALECT_TO_NLLB` mapping covers 12 dialects: jv→jav_Latn, su→sun_Latn, min→min_Latn, id→ind_Latn, ms→zsm_Latn, bbc, ban, bug, mad, bjn, ace, bew.

### Database

Configured via `DATABASE_URL` env var (django-environ parses it). Both local dev and production use Supabase Postgres via **Session Pooler** URL (`aws-0-REGION.pooler.supabase.com:5432`). Direct connection (`db.PROJECT.supabase.co`) tidak dipakai — tidak stabil di free tier.

Key models:
- `CustomUser` — email-based auth, role (`user`/`admin`), `is_active`, full Indonesian address fields
- `Complaint` — input text + NLP output fields + 5-state status (`pending`/`in_review`/`in_progress`/`resolved`/`rejected`) + geolocation + photo_url
- `Category` — autocreated by NLP `classify_category` via `get_or_create`
- `AdminNote` — many per complaint, created on each PATCH with a note
- `StatusHistory` — audit trail, created on each PATCH that changes status

### Environment Variables

Backend (`.env`):
- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `DATABASE_URL`
- `CORS_ALLOWED_ORIGINS` (comma-separated; regex for `*.vercel.app` already active in settings)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (optional; Cloudinary only activates if `CLOUD_NAME` is set)

Frontend (`.env.local`):
- `NEXT_PUBLIC_API_URL` — backend base URL (default: `http://localhost:8000`)

### Throttling

Three throttle scopes: `anon` (30/min), `user` (120/min), `auth` (10/min). Auth throttle (`AuthThrottle` in `accounts/throttles.py`) is applied to login and register. Test files override rates to 10000/min with `@override_settings(THROTTLE_OFF)` and flush cache between tests.

### NLP Pipeline Runtime

`backend/nlp/pipeline.py` exists tapi **NLP packages sengaja dihapus dari `requirements.txt`** (torch, transformers, langdetect, sumy — terlalu berat untuk free tier, butuh >1 GB RAM). Pipeline code tetap ada dengan graceful fallback. Untuk aktifkan NLP nanti: tambahkan packages kembali ke requirements, atau ganti dengan API eksternal (Gemini/OpenAI).

Untuk verifikasi acceptance criteria fitur NLP, jalankan dari `backend/`:
```bash
source venv/bin/activate
python manage.py shell -c "from nlp.pipeline import score_urgency, classify_category, run_pipeline; \
print(score_urgency('ada kebakaran darurat')); \
print(classify_category('jalan berlubang rusak parah')); \
print(run_pipeline('Dalane rusak banget wis suwe ora dibenahi'))"
```

### Frontend Key Components (untuk reuse)

- `complaint/ComplaintCard.tsx` — list item dengan urgency strip kiri + dialect badge inline
- `complaint/NLPResultCard.tsx` — full NLP result display (dialect, summary, translation collapsible, NER grouped, keywords, confidence bar). Skeleton state otomatis saat `complaint.summary` masih null
- `complaint/StatusBadge.tsx` — exports `StatusBadge`, `UrgencyBadge`, `STATUS_LABEL`, `STATUS_ICON`
- `complaint/StatusTimeline.tsx` — vertical timeline merging `status_history` + `admin_notes` + creation event, waktu relatif ID
- `complaint/ComplaintForm.tsx` — wizard 3-step submit
- `shared/DialectBadge.tsx` — 12 dialek mapped to name + color per rumpun
- `shared/UrgencyIndicator.tsx` — variants `badge` / `strip` / `full`, exports `URGENCY_HEX`
- `shared/SkeletonCard.tsx` — exports `Skeleton`, `SkeletonCard`, `SkeletonRow`
- `map/ComplaintMap.tsx` — leaflet.markercluster + divIcon teardrop colored by urgency. WAJIB `dynamic({ ssr: false })`

### Frontend Design Tokens

- Navy: `#1E2A4A` (text & dark surfaces)
- Blue: `#2563EB` (primary), `#1D4ED8` (hover), `#60A5FA` (accent)
- Surface: `#F4F5F7` (app bg), `#EFF6FF` (subtle blue tint)
- Urgency hex: critical `#E24B4A`, high `#EF9F27`, medium `#D4A12E`, low `#888780`
- Batik kawung SVG sebagai inline data URL — dipakai di hero landing, banner dashboard, auth left panel, semua di `opacity-[0.06]` agar tetap minimalis

### Deployment

Stack: **Supabase** (Postgres) → **Hugging Face Spaces** (backend, Docker) → **Vercel** (frontend).
- HF Space adalah repo git terpisah — isinya adalah isi folder `backend/`, bukan seluruh monorepo
- App wajib listen di port **7860** (HF Spaces requirement) — sudah dikonfigurasi di `backend/Dockerfile`
- HF Space `README.md` wajib ada frontmatter `sdk: docker` + `app_port: 7860`
- Environment variables diset via HF Space → Settings → Repository secrets
- `whitenoise` serves static files
- Healthcheck endpoint: `GET /api/categories/` (return 200, public)
- `backend/railway.json` masih ada di repo tapi tidak dipakai
- Full runbook: `docs/DEPLOYMENT.md` (lokal saja, tidak di-push ke GitHub)


