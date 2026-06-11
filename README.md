# Sovereign Dialect-Bridge

Platform pengaduan publik berbasis AI untuk warga Indonesia yang mendukung **12 dialek bahasa daerah**. Warga submit aduan dalam bahasa daerahnya → AI auto-detect dialek, terjemahkan ke Bahasa Indonesia, ringkas, ekstrak entitas, klasifikasi kategori, & skor urgensi — semua di background thread agar UX tetap cepat. Admin pemerintah review & tindak lanjut via dashboard terpisah.

## Contributors

- Fadhlan Nur Rachman (2802491690)
- Dian Rakhmawati Lestari (2802539085)
- Matthew Ken Susanto (2802407736)
- Nasauramecca Nour Haqqanshah Shodiqin (2802541921)
- Bintang Nur Fadhlillah (2802536083)

## Akun Tes Lokal

| Role  | Email                    | Password      |
|-------|--------------------------|---------------|
| Admin | `admintest@dialect.test` | `Admin12345!` |
| User  | `wargatest@dialect.test` | `Warga12345!` |

## Tech Stack

| Layer    | Teknologi                                            | Deploy              |
|----------|------------------------------------------------------|---------------------|
| Backend  | Django 4.2 + DRF + SimpleJWT                         | Hugging Face Spaces |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + Framer Motion | Vercel              |
| Database | PostgreSQL (Supabase, Session Pooler)                | Supabase            |
| Storage  | Cloudinary (opsional, foto aduan)                    | Cloudinary          |
| NLP      | NLLB-200 + mT5/IndoT5 NusaSum + IndoBERT NER + langdetect | HF Hub (auto-pull) |
| Map      | Leaflet.js + leaflet.markercluster + OpenStreetMap   | —                   |
| Auth     | JWT (1h access / 7d refresh, rotation + blacklist) + Google Sign-In | — |


## Halaman

| Path                | Akses        | Deskripsi |
|---------------------|--------------|-----------|
| `/`                 | Public       | Landing page 8-section dengan animasi |
| `/login`            | Public       | Two-panel: brand navy + form login + Google Sign-In |
| `/register`         | Public       | Two-panel: brand navy + wizard registrasi |
| `/forgot-password`  | Public       | Reset password via email code |
| `/dashboard`        | user         | Stat + tabs + daftar aduan milik sendiri |
| `/submit`           | user         | Wizard submit aduan 3-step |
| `/profile`          | user / admin | Edit profil, ubah password |
| `/complaint/[id]`   | user / admin | Detail aduan; admin dapat sticky action panel |
| `/admin`            | admin        | Dashboard utama + QuickReview slide-in |
| `/admin/map`        | admin        | Peta Leaflet + filter overlay |
| `/admin/users`      | admin        | Tabel + modal toggle role/status |
| `/admin/settings`   | admin        | Konfigurasi sistem |
| `/admin/profile`    | admin        | Profil admin |

## Struktur Project

```
Sovereign-Dialect-Bridge/
├── backend/                       Django REST API (Docker → HF Spaces port 7860)
│   ├── accounts/                  Auth: CustomUser, JWT, Google OAuth, password reset
│   ├── complaints/                Complaint CRUD, admin ops, dashboard stats, map, notifications, export
│   ├── nlp/                       NLP pipeline (NLLB / mT5 / IndoT5 / IndoBERT NER + graceful fallback)
│   ├── dashboard/                 Internal dashboard (model status, runtime logs)
│   ├── config/                    Django settings, root URLs, WSGI
│   ├── scripts/                   upload_mt5_to_hf.py, upload_dialect_to_hf.py
│   ├── Dockerfile                 Image untuk HF Spaces (port 7860)
│   └── requirements.txt           Python deps
│
├── frontend/                      Next.js 14 (App Router) + Tailwind + Framer Motion
│   ├── public/
│   │   ├── indonesia-dotted.svg  Peta Indonesia dotted (5217 titik, generated dari JPEG asli)
│   │   ├── indonesianmap.jpeg    Source peta untuk generator dots
│   │   ├── batik-pattern.png     Pattern batik untuk overlay
│   │   ├── logo_blue.png         Logo brand (dipakai di seluruh app)
│   │   └── logo_white.png        Logo brand putih (dipakai di landing page)
│   ├── scripts/
│   │   └── gen_indonesia_dots.py Generator SVG dotted dari JPEG (Pillow)
│   └── src/
│       ├── app/(auth)/            login, register, forgot-password (animasi Framer Motion)
│       ├── app/(main)/(user)/    dashboard, submit, complaint, profile
│       ├── app/(main)/admin/      dashboard, map, users, settings, profile
│       ├── components/
│       │   ├── features/landing/  Hero, HowItWorks, PublicMap, FeaturesGrid, LiveComplaints, Testimonials, Contact, Footer, PublicNav
│       │   ├── features/auth/     AuthProvider, AuthGate, AuthBrandPanel, AuthBackLink, RegisterForm, GoogleSignInButton
│       │   ├── features/complaint/ ComplaintCard, ComplaintForm/, NLPResultCard, StatusTimeline
│       │   ├── features/map/      ComplaintMap, MiniComplaintMap, LocationPickerMap, mapUtils
│       │   ├── layout/            Navbar, AdminSidebar, NotificationBell
│       │   └── ui/                Logo, Button, Input, Card, Alert, Spinner, DialectBadge, UrgencyIndicator, StatusBadge, Skeleton, ConfirmDialog
│       ├── hooks/                 useAuth, useFetch, useApiForm, useComplaints, useComplaintDetail, useGeolocation
│       ├── lib/                   api.ts (axios singleton), auth.ts (JWT storage), cn.ts, constants.ts, theme.ts
│       └── types/                 Semua TypeScript interfaces
│
└── docs/                          (di-gitignore, lokal saja)
    ├── API_ENDPOINTS.md           Daftar endpoint singkat
    ├── DEPLOYMENT.md              Runbook deploy lengkap
    └── FEATURES_FLOW.md           Acceptance criteria & flow detail
```

## Setup Lokal

```bash
# 1. Backend
cd backend
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                # isi SECRET_KEY + DATABASE_URL
python manage.py migrate
python manage.py runserver                          # http://localhost:8000

# 2. Frontend (terminal baru)
cd frontend
npm install
cp .env.local.example .env.local                    # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                                         # http://localhost:3000
```

> Jika frontend dipakai di port selain 3000, tambahkan ke `CORS_ALLOWED_ORIGINS` di `backend/.env`.

## Catatan Penting

- **NLP berat di production**: model NLLB / mT5 / NER auto-pull dari HF Hub saat boot pertama. Aktifkan `NLP_ENABLED=true` di env. Pipeline punya fallback chain — kalau model belum siap atau gagal load, fallback otomatis aktif tanpa crash.
- **Cloudinary opsional**: env Cloudinary kosong → upload foto di-skip silently. Foto tetap preview di FE tapi tidak terupload. Lengkapi `CLOUDINARY_*` di `backend/.env` untuk mengaktifkan.
- **Google Sign-In opsional**: set `GOOGLE_CLIENT_ID` di backend + `NEXT_PUBLIC_GOOGLE_CLIENT_ID` di frontend (nilai sama). Kosong → tombol Google disembunyikan otomatis.
- **Frontend deps**: Framer Motion ditambah untuk animasi landing/auth. Bundle akhir ~184 KB First Load JS (di bawah threshold Lighthouse).

## Deploy Production

- **Backend** → Hugging Face Spaces (Docker SDK, port `7860`). Repo HF Space berisi konten folder `backend/` saja.
- **Frontend** → Vercel. Root directory `frontend/`. Set `NEXT_PUBLIC_API_URL` ke domain HF Space.
- **Database** → Supabase via **Session Pooler URI**.

Runbook lengkap: `docs/DEPLOYMENT.md`.

Made with care by Group 7
