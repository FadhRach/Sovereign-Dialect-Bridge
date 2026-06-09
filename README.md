# Sovereign Dialect-Bridge

Platform pengaduan publik berbasis AI untuk warga Indonesia yang mendukung **12 dialek bahasa daerah**. Warga submit aduan dalam bahasa daerah → AI auto-detect dialek, translate ke BI, ringkas, ekstrak entitas, klasifikasi kategori, & skor urgensi — semua di background thread agar UX tetap cepat. Admin pemerintah review & tindak lanjut via dashboard terpisah.

## Contributors

- Fadhlan Nur Rachman (2802491690)
- Dian Rakhmawati Lestari (2802539085) ERROR NY SAMA
- Matthew Ken Susanto (2802407736)
- Nasauramecca Nour Haqqanshah Shodiqin (2802541921)

## Tech Stack

| Layer    | Teknologi                              | Deploy              |
| -------- | -------------------------------------- | ------------------- |
| Backend  | Django 4.2 + DRF + SimpleJWT           | Hugging Face Spaces |
| Frontend | Next.js 14 + TypeScript + Tailwind CSS | Vercel              |
| Database | PostgreSQL (Supabase)                  | Supabase            |
| Storage  | Cloudinary (opsional)                  | Cloudinary          |
| NLP      | NLLB-200 + mT5-base + IndoBERT NER + langdetect | *(graceful fallback aktif)* |
| Map      | Leaflet.js + leaflet.markercluster     | OpenStreetMap tiles |

## Status Fitur

| # | Fitur Inti | Status |
|---|-----------|--------|
| 1 | Autentikasi JWT (register, login, refresh, profile) | ✅ |
| 2 | Submit & Tracking Pengaduan (wizard 3-step, polling) | ✅ |
| 3 | NLP Pipeline (dialect → translate → summarize → NER → urgency → category) | ✅ |
| 4 | Dashboard Admin + QuickReview slide-in panel | ✅ |
| 5 | Peta Sebaran Aduan (marker cluster + filter overlay) | ✅ |

| # | Keunggulan Unik | Status |
|---|----------------|--------|
| K1 | Multi-Dialek (12 bahasa daerah) + DialectBadge | ✅ |
| K2 | Urgency Scoring + visual triage (strip warna + badge) | ✅ |
| K3 | NER otomatis (LOC / PER / ORG grouped) | ✅ |
| K4 | Status Audit Trail (timeline + waktu relatif) | ✅ |

Detail acceptance criteria & status per item → `docs/FEATURES_FLOW.md`.

## Fitur per Role

**Warga (`role=user`):**
- Dashboard pribadi dengan banner sapaan + 4 stat card
- Wizard submit 3-step: cerita → wilayah/koordinat/foto → review
- Detail aduan: cerita asli, hasil AI (dialek, ringkasan, terjemahan, NER, keyword, confidence), timeline status
- Polling otomatis hasil NLP setiap 3 detik

**Admin (`role=admin`):**
- Sidebar tetap (Dashboard / Peta / Pengguna / Keluar)
- 5 stat card klikable → langsung filter tabel
- Bar chart 8-minggu trend + donut chart distribusi kategori
- Filter status + urgency + dialect + search (combinable)
- Tabel sortable per kolom; klik row → QuickReview slide-in (ubah status + catatan tanpa pindah halaman)
- Detail aduan dengan AdminActionPanel sticky
- Peta marker cluster, marker teardrop warna per urgensi, popup link detail
- Manajemen user: toggle role + toggle aktif/nonaktif

## Halaman

| Path | Akses | Deskripsi |
|------|-------|-----------|
| `/` | Public | Landing page (hero batik + cara kerja + statistik) |
| `/login` | Public | Two-panel: brand navy+batik / form login |
| `/register` | Public | Two-panel wizard 3-step (identitas → alamat → password) |
| `/dashboard` | user | Stat + tabs + daftar aduan milik sendiri |
| `/submit` | user | Wizard submit aduan 3-step |
| `/complaint/[id]` | user / admin | Detail aduan; admin dapat sticky action panel |
| `/admin` | admin | Dashboard utama + QuickReview slide-in |
| `/admin/map` | admin | Peta Leaflet + filter overlay |
| `/admin/users` | admin | Tabel + modal toggle role/status |

## Struktur Project

```
Sovereign-Dialect-Bridge/
├── backend/                       Django REST API (Docker → HF Spaces port 7860)
│   ├── accounts/                  Auth: CustomUser, JWT, throttle, IsAdminUser
│   ├── complaints/                Complaint CRUD, admin ops, dashboard stats, map
│   ├── nlp/                       NLP pipeline (NLLB / mT5 / IndoBERT + fallback)
│   ├── config/                    Django settings, root URLs, WSGI
│   ├── Dockerfile                 Image untuk HF Spaces (port 7860)
│   └── requirements.txt           Python deps (NLP berat di-skip — fallback aktif)
│
├── frontend/                      Next.js 14 (App Router) + Tailwind
│   └── src/
│       ├── app/(auth)/            login, register
│       ├── app/(main)/            dashboard, submit, complaint, admin/*
│       ├── components/
│       │   ├── auth/              AuthProvider, RegisterForm, FormField
│       │   ├── complaint/         ComplaintCard, ComplaintForm, NLPResultCard,
│       │   │                      StatusBadge, StatusTimeline
│       │   ├── layout/            Navbar, Sidebar
│       │   ├── map/               ComplaintMap (dynamic, ssr:false)
│       │   └── shared/            LoadingSpinner, ErrorAlert, DialectBadge,
│       │                          UrgencyIndicator, SkeletonCard
│       ├── hooks/                 useAuth, useComplaints, useComplaintDetail
│       └── lib/                   api.ts, auth.ts, types.ts
│
└── docs/                          FEATURES_FLOW, API_CONTRACT, DEPLOYMENT (di-gitignore)
```

## Setup Lokal

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                # isi SECRET_KEY + DATABASE_URL
python manage.py migrate
python manage.py runserver                          # http://localhost:8000

# Frontend (terminal baru)
cd frontend
npm install
cp .env.local.example .env.local                    # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                                         # http://localhost:3000
```

> Jika frontend dipakai di port selain 3000, tambahkan ke `CORS_ALLOWED_ORIGINS` di `backend/.env`.

## Akun Tes Lokal

| Role | Email | Password |
|------|-------|----------|
| Admin | `admintest@dialect.test` | `Admin12345!` |
| User  | `wargatest@dialect.test` | `Warga12345!` |

> Akun ini dibuat manual via Django shell saat testing — bukan migrasi. Aman dihapus.

## Catatan Penting

- **NLP berat sengaja off** — packages `torch`, `transformers`, `langdetect` dihapus dari `requirements.txt` (>1 GB RAM, tidak muat di free tier HF Spaces). Pipeline tetap berjalan via **fallback graceful**: TextRank summarize, regex NER, deep_translator translate, langdetect→`xx` jika library tidak ada. Hasil akhir tetap valid (confidence=0.5).
- **Cloudinary off** — env Cloudinary kosong → upload foto di-skip silently. Foto tetap preview di FE tapi tidak terupload ke storage. Lengkapi `CLOUDINARY_*` di `backend/.env` untuk mengaktifkan.
- Default port frontend `:3000`. Jika dipakai port lain, update CORS backend.

## Deploy

- **Backend** → Hugging Face Spaces (Docker SDK, port `7860`). Repo HF Space = isi folder `backend/` saja.
- **Frontend** → Vercel. Root directory `frontend/`. Set `NEXT_PUBLIC_API_URL` ke domain HF Space.
- **Database** → Supabase via **Session Pooler URI**.

Runbook lengkap: `docs/DEPLOYMENT.md`.

Made with ❤ Group 7
