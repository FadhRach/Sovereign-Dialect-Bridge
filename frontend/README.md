# Frontend — Sovereign Dialect-Bridge

Next.js 14 (App Router) + TypeScript strict + Tailwind CSS. Konsumsi REST API backend Django.

---

## 1. Stack

| Komponen     | Versi / Pilihan |
|--------------|-----------------|
| Framework    | Next.js 14.2.x (App Router) |
| Language     | TypeScript (strict) |
| Styling      | Tailwind CSS 3.4.x |
| HTTP Client  | Axios 1.7 dengan JWT interceptor |
| Map          | Leaflet.js + react-leaflet (dynamic import, SSR off) |
| Icons        | lucide-react |
| Deploy       | Vercel (region `sin1`) |

---

## 2. Struktur Folder

```
frontend/
├── public/                  ← static assets
├── src/
│   ├── app/
│   │   ├── (auth)/          ← halaman tanpa navbar
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (main)/          ← halaman protected (auto-redirect ke /login)
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/, submit/, complaint/[id]/
│   │   │   └── admin/ (map, users)
│   │   ├── layout.tsx       ← root, wrap dengan <AuthProvider>
│   │   └── page.tsx         ← landing
│   ├── components/
│   │   ├── auth/            ← AuthProvider, RegisterForm, AddressSection, ...
│   │   ├── complaint/       ← komponen domain aduan
│   │   ├── layout/          ← Navbar, Sidebar
│   │   ├── map/             ← ComplaintMap (dynamic, ssr:false)
│   │   ├── shared/          ← LoadingSpinner, ErrorAlert
│   │   └── ui/              ← primitive (shadcn placeholder, sementara native)
│   ├── lib/
│   │   ├── api.ts           ← axios client + interceptor refresh single-flight
│   │   ├── auth.ts          ← token storage + decode JWT (Unicode-safe)
│   │   └── types.ts         ← semua interface TypeScript
│   └── hooks/
│       ├── useAuth.ts       ← re-export useAuthContext
│       └── useComplaints.ts
├── package.json
├── tsconfig.json            ← strict: true
├── tailwind.config.ts
├── next.config.js
├── vercel.json              ← config deploy
└── .env.local.example
```

Dokumentasi tambahan: `src/lib/README.md`, `src/components/README.md`.

---

## 3. Setup Lokal

```bash
npm install
cp .env.local.example .env.local
npm run dev                       # → http://localhost:3000
npm run build                     # production build (typecheck + bundle)
npm run lint
```

Pastikan backend hidup di `http://localhost:8000` (atau set `NEXT_PUBLIC_API_URL` di `.env.local`).

---

## 4. Auth Flow di Client

```
LoginPage                                  RegisterPage
   │                                            │
   └─ useAuth().login(email, password)          └─ useAuth().register(payload)
            │                                            │
            ▼                                            ▼
        api.post('/api/auth/login/')           api.post('/api/auth/register/')
            │                                            │
            ▼                                            ▼
        saveTokens(access, refresh) → localStorage
            │
            ▼
        AuthProvider.syncFromStorage() → context state updated
            │
            ▼
        router.push('/dashboard' | '/admin')
```

Saat request berikutnya:
- `api.ts` request interceptor menempel `Authorization: Bearer <access>`.
- Jika dapat 401 → masuk antrian single-flight refresh. Hanya 1 request `token/refresh/` aktif, semua request paralel re-issue setelah dapat access baru.
- Jika refresh juga gagal → clear localStorage + redirect ke `/login`.

`(main)/layout.tsx` cek `isAuthenticated`; kalau false redirect ke `/login` (hindari render konten yang butuh user).

---

## 5. Konvensi Kode

Mengikuti [CLAUDE.md §8.3](../CLAUDE.md):

- `tsconfig` strict; **tidak ada `any`** kecuali terpaksa
- Semua API call **wajib lewat `@/lib/api`** — tidak boleh `fetch()` langsung
- Semua type ada di `@/lib/types` — **tidak boleh inline** di komponen
- Pakai `'use client'` seminimal mungkin (default server component)
- Leaflet **wajib** `dynamic(..., { ssr: false })`
- Komponen > 100 baris → pecah jadi sub-komponen (lihat `components/auth/RegisterForm.tsx`)

---

## 6. Cara Tambah Halaman Protected Baru

1. Buat folder di `src/app/(main)/<nama>/page.tsx`.
2. Mark `"use client"` jika butuh state / hooks.
3. Layout protected sudah otomatis aktif via `(main)/layout.tsx`.
4. Konsumsi `useAuth()` untuk dapat user info / logout.

Contoh:

```tsx
"use client";
import { useAuth } from "@/hooks/useAuth";

export default function MyPage() {
  const { fullName, isAdmin } = useAuth();
  return <div>Halo {fullName} {isAdmin && "(admin)"}</div>;
}
```

---

## 7. Cara Tambah API Call Baru

Pakai `api` instance:

```ts
import api from "@/lib/api";
import type { ApiResponse, Complaint } from "@/lib/types";

const res = await api.get<ApiResponse<Complaint[]>>("/api/complaints/");
const list = res.data.data ?? [];
```

Tambahkan typing baru ke `src/lib/types.ts`, jangan inline.

---

## 8. Troubleshooting

| Gejala                                              | Sebab + Fix |
|-----------------------------------------------------|-------------|
| `Network Error` di console                          | Backend mati, atau `NEXT_PUBLIC_API_URL` salah |
| `CORS error`                                        | Tambah origin frontend ke `CORS_ALLOWED_ORIGINS` backend |
| Halaman blink ke `/login` sebentar                  | Normal — guard client-side. Solusi: tampilkan skeleton di `(main)/layout.tsx` |
| `window is not defined` di build                    | Komponen `'use client'` lupa ditandai, atau import Leaflet tanpa dynamic |
| Token tidak persist saat refresh                    | localStorage di-block (private mode browser). Coba browser normal. |
| `Cannot find module '@/...'`                        | Cek `tsconfig.json` paths `@/* → src/*` masih ada |

---

## 9. Deploy ke Vercel

Singkat: import repo → root `frontend/` → set env `NEXT_PUBLIC_API_URL` → Deploy. Runbook lengkap: [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).
