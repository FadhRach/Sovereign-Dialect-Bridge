# Sovereign Dialect-Bridge

Platform pengaduan publik berbasis AI untuk warga Indonesia yang mendukung berbagai dialek daerah. Warga bisa kirim aduan dalam bahasa daerah — sistem secara otomatis mendeteksi dialek, menerjemahkan ke Bahasa Indonesia, meringkas, dan menentukan tingkat urgensi.

## Contributors
- Fadhlan Nur Rachman (2802491690)
-
-
-
-

## Tech Stack

| Layer | Teknologi | Deploy |
|-------|-----------|--------|
| Backend | Django 4.2 + DRF + SimpleJWT | Render |
| Frontend | Next.js 14 + TypeScript + Tailwind CSS | Vercel |
| Database | PostgreSQL (Supabase) | Supabase |
| Storage | Cloudinary (opsional) | Cloudinary |
| NLP | mT5, IndoBERT, langdetect | Disabled (planned) |

## Fitur Utama

- **Multi-dialek** — deteksi otomatis bahasa/dialek dari teks aduan
- **NLP Pipeline** — terjemahan → ringkasan → ekstraksi entitas → klasifikasi kategori → skor urgensi
- **Role-based access** — warga (`user`) dan aparatur (`admin`) dengan permission terpisah
- **JWT Auth** — access token 1 jam, refresh 7 hari dengan rotation + blacklist
- **Peta aduan** — visualisasi titik aduan berdasarkan koordinat (Leaflet)
- **Dashboard admin** — statistik real-time, manajemen status, catatan penanganan

## Struktur Project

```
Sovereign-Dialect-Bridge/
├── backend/                  Django REST API
│   ├── accounts/             Auth: CustomUser, JWT, throttle, permission
│   ├── complaints/           Complaint CRUD, kategori, status, NLP trigger
│   ├── nlp/                  NLP pipeline (dialect → translate → summarize → NER)
│   ├── config/               Django settings, root URLs, WSGI
│   ├── Dockerfile            Image untuk Render
│   └── requirements.txt      Python dependencies (tanpa NLP berat)
│
├── frontend/                 Next.js 14 App
│   └── src/
│       ├── app/
│       │   ├── (auth)/       Login, Register
│       │   └── (main)/       Dashboard, Submit, Detail aduan, Admin, Map
│       ├── components/       UI components per domain
│       ├── hooks/            useAuth, useComplaints
│       └── lib/
│           ├── api.ts        Axios singleton + auto token refresh
│           ├── auth.ts       JWT decode & localStorage helpers
│           └── types.ts      TypeScript types bersama
│
└── render.yaml               Konfigurasi deploy Render
```

## Setup Lokal

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # isi SECRET_KEY + DATABASE_URL
python manage.py migrate
python manage.py runserver    # http://localhost:8000

# Frontend (terminal baru)
cd frontend
npm install
cp .env.local.example .env.local   # isi NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                         # http://localhost:3000
```

Lihat `backend/README.md` untuk panduan lengkap backend termasuk troubleshooting.

## Deploy

- **Backend** → Render: `render.yaml` sudah dikonfigurasi, tinggal connect repo dan set env vars
- **Frontend** → Vercel: set root directory ke `frontend`, set `NEXT_PUBLIC_API_URL` ke domain Render **sebelum** deploy
- **Database** → Supabase: gunakan **Session Pooler URI** untuk `DATABASE_URL`

Made with <3 Group 7
