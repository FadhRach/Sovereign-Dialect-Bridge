# Frontend — Sovereign Dialect-Bridge

Next.js 14 (App Router) + TypeScript strict + Tailwind CSS + Plus Jakarta Sans (self-hosted).
Konsumsi REST API backend Django.

---

## 1. Stack

| Komponen     | Versi / Pilihan |
|--------------|-----------------|
| Framework    | Next.js 14.2.x (App Router) |
| Language     | TypeScript (strict) |
| Styling      | Tailwind CSS 3.4.x |
| Font         | Plus Jakarta Sans (self-hosted di `src/app/fonts/`) |
| HTTP Client  | Axios 1.7 dengan JWT interceptor |
| Map          | Leaflet.js + leaflet.markercluster (dynamic import, SSR off) |
| Icons        | lucide-react (tree-shaken via `optimizePackageImports`) |
| Variant utils | class-variance-authority + clsx + tailwind-merge |
| Deploy       | Vercel (region `sin1`) |

---

## 2. Struktur Folder

```
frontend/
├── public/                            ← static assets (kosong saat ini)
├── src/
│   ├── app/                           ← App Router (Next.js 14)
│   │   ├── layout.tsx                 ← root: load font + AuthProvider
│   │   ├── page.tsx                   ← landing (Server Component)
│   │   ├── globals.css                ← Tailwind base + utility `.batik-overlay`
│   │   ├── fonts/                     ← Plus Jakarta Sans .ttf (14 file)
│   │   ├── (auth)/                    ← halaman tanpa Navbar (login/register)
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   └── (main)/                    ← halaman protected (di-gate AuthGate)
│   │       ├── layout.tsx             ← Server Component, render <AuthGate>
│   │       ├── (user)/                ← area user: render Navbar
│   │       │   ├── layout.tsx         ← Server Component, render Navbar
│   │       │   ├── dashboard/page.tsx
│   │       │   ├── submit/page.tsx
│   │       │   ├── profile/page.tsx
│   │       │   └── complaint/[id]/page.tsx
│   │       └── admin/                 ← area admin: render AdminSidebar
│   │           ├── layout.tsx         ← Server Component wrapper
│   │           ├── page.tsx           ← orchestrator (226 baris)
│   │           ├── _components/       ← split admin/page sub-component
│   │           │   ├── StatCard.tsx
│   │           │   ├── AdminFilters.tsx
│   │           │   ├── AdminCharts.tsx
│   │           │   ├── AdminComplaintTable.tsx
│   │           │   ├── QuickReviewModal.tsx
│   │           │   └── constants.ts
│   │           ├── map/page.tsx
│   │           └── users/page.tsx
│   ├── components/
│   │   ├── ui/                        ← PRIMITIF (tanpa konteks bisnis)
│   │   │   ├── Alert.tsx              ← variant: error/info/success
│   │   │   ├── Button.tsx             ← variant: primary/secondary/ghost/danger
│   │   │   ├── Card.tsx               ← wrapper bg-white + border + padding
│   │   │   ├── DialectBadge.tsx       ← badge dialek berdasarkan kode
│   │   │   ├── Input.tsx              ← input dengan styling default
│   │   │   ├── Skeleton.tsx           ← Skeleton + SkeletonCard + SkeletonRow
│   │   │   ├── Spinner.tsx            ← loading spinner
│   │   │   ├── StatusBadge.tsx        ← badge status & urgency
│   │   │   └── UrgencyIndicator.tsx
│   │   ├── features/                  ← KOMPONEN SPECIFIC DOMAIN
│   │   │   ├── auth/                  ← AuthProvider, AuthGate, RegisterForm, dll
│   │   │   ├── complaint/             ← ComplaintCard, ComplaintForm/, NLPResultCard, dll
│   │   │   └── map/                   ← ComplaintMap (leaflet)
│   │   └── layout/                    ← Navigation: Navbar, AdminSidebar, NotificationBell
│   ├── hooks/
│   │   ├── useComplaints.ts           ← fetch + polling NLP stage
│   │   ├── useFetch.ts                ← generic fetch + loading + error + refetch
│   │   ├── useApiForm.ts              ← form submit handling
│   │   └── useGeolocation.ts          ← wrapper browser geolocation API
│   ├── lib/                           ← helper murni (no React)
│   │   ├── api.ts                     ← axios instance + 401 refresh single-flight
│   │   ├── auth.ts                    ← token storage + decode JWT (Unicode-safe)
│   │   ├── cn.ts                      ← clsx + tailwind-merge helper
│   │   ├── constants.ts               ← STATUS_LABELS, DIALECTS, dll
│   │   └── theme.ts                   ← color tokens runtime
│   └── types/
│       └── index.ts                   ← semua interface TypeScript
├── package.json
├── tsconfig.json                      ← strict: true
├── tailwind.config.ts                 ← extend fontFamily.sans + colors.brand
├── next.config.js                     ← optimizePackageImports + security headers
├── vercel.json                        ← config deploy
└── .env.local.example
```

### Konvensi penamaan

- **`components/ui/`** — primitive yang BISA dipakai di semua project. Tidak boleh tahu tentang `Complaint`, `User`, atau API spesifik.
- **`components/features/<domain>/`** — komponen yang tahu domain (mis. `ComplaintCard` tahu shape `Complaint`).
- **`components/layout/`** — navigation/shell layout (Navbar, AdminSidebar, NotificationBell).
- **`app/(group)/<route>/_components/`** — komponen private milik 1 route. Folder `_components` di-skip oleh router Next.js.
- **`lib/`** — utility murni tanpa React (HTTP client, helpers, constants).
- **`hooks/`** — custom hooks dengan React state/effect.
- **`types/`** — TypeScript interfaces only.

---

## 3. Setup Lokal

```bash
npm install
cp .env.local.example .env.local       # set NEXT_PUBLIC_API_URL
npm run dev                            # → http://localhost:3000 (Turbopack)
npm run build                          # production build
npm run dev:webpack                    # fallback webpack jika Turbopack bermasalah
```

Pastikan backend hidup di `http://localhost:8000` (atau set `NEXT_PUBLIC_API_URL` di `.env.local`).

### Tips kalau Mac RAM <16 GB

Dev server Next.js bisa berat. Untuk meringankan:

1. **Pakai Turbopack** (sudah default di `npm run dev`)
2. **Tutup VSCode + Chrome** sebelum `npm run dev` — bebaskan ~500 MB RAM
3. **Pakai production build** untuk demo: `npm run build && npm start` (~150 MB runtime vs ~500 MB dev mode)

---

## 4. Server vs Client Component

App Router default = Server Component. Tandai `"use client"` HANYA jika butuh:
- React state (`useState`, `useReducer`)
- React effects (`useEffect`, `useMemo` dengan side-effect)
- Browser API (`localStorage`, `navigator`, `window`)
- Event handler (`onClick`, `onSubmit`)
- Context yang butuh hook

### Pola gating yang kami pakai

```
app/layout.tsx                  [Server]  ← <html> + <body> + AuthProvider (client island)
└── app/(main)/layout.tsx       [Server]  ← <AuthGate> (client island untuk redirect)
    ├── app/(main)/(user)/layout.tsx     [Server]  ← <Navbar> (client island)
    └── app/(main)/admin/layout.tsx       [Server]  ← wrapper kosong (admin pakai AdminSidebar)
```

Layout `(main)/layout.tsx` dulu `"use client"` dan memaksa SELURUH subtree jadi client.
Sekarang Server Component → halaman child yang Server Component (mis. `submit/page.tsx`)
tidak ikut terbawa client bundle.

---

## 5. Auth Flow

```
LoginPage / RegisterPage
   │
   └─ useAuth().login(email, password)
            │
            ▼
        api.post('/api/auth/login/')           ← lib/api.ts (axios singleton)
            │
            ▼
        saveTokens(access, refresh) → localStorage
            │
            ▼
        AuthProvider.syncFromStorage() → React context updated
            │
            ▼
        router.push('/dashboard' | '/admin')
```

### Request berikutnya

- `api.ts` request interceptor tempel `Authorization: Bearer <access>`.
- 401 → masuk antrian **single-flight refresh**. Hanya 1 request `token/refresh/` aktif, semua request paralel re-issue setelah dapat access baru.
- Refresh juga gagal → clear localStorage + redirect ke `/login`.

`AuthGate` cek `isAuthenticated`; kalau false redirect ke `/login` (jangan render konten yang butuh user).

---

## 6. Konvensi Kode

- **`tsconfig` strict**; hindari `any`.
- Semua API call **wajib lewat `@/lib/api`** — tidak boleh `fetch()` langsung.
- Semua type ada di **`@/types`** — tidak boleh inline.
- Pakai `"use client"` **seminimal mungkin** (default Server Component).
- Leaflet **wajib** `dynamic(..., { ssr: false })`.
- Komponen > 250 baris → pecah jadi sub-komponen di `_components/`.

### Pakai primitives

Sebelum tulis input/button/card baru, cek `components/ui/`:

```tsx
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";

<Card padding="md">
  <Input value={x} onChange={...} placeholder="..." />
  <Button variant="primary" size="md" onClick={...}>Kirim</Button>
  {error && <Alert message={error} onDismiss={...} />}
</Card>
```

### Pakai hooks yang sudah ada

| Hook | Kapan dipakai |
|------|---------------|
| `useFetch<T>(url)` | Fetch sekali pada mount, dapat `data/isLoading/error/refetch` |
| `useApiForm(fn, options)` | Submit form ke API, dapat `submit/loading/error/reset` |
| `useGeolocation()` | Browser geolocation, dapat `coords/loading/error/request` |
| `useComplaints(options)` | Khusus list aduan dengan filter |
| `useComplaintDetail(id)` | Khusus detail aduan dengan polling NLP |

Contoh `useFetch`:
```tsx
const { data, isLoading, error, refetch } = useFetch<DashboardStats>("/api/dashboard/stats/", {
  errorMessage: "Gagal memuat statistik.",
});
```

---

## 7. Cara Tambah Halaman Baru

### Halaman user biasa (butuh login, ada Navbar)

1. Buat folder di `src/app/(main)/(user)/<nama>/page.tsx`.
2. Mark `"use client"` jika butuh state/hooks.
3. Layout protected sudah otomatis aktif via `(main)/layout.tsx` (AuthGate).
4. Konsumsi `useAuth()` untuk user info / logout.

```tsx
"use client";
import { useAuth } from "@/components/features/auth/AuthProvider";

export default function MyPage() {
  const { fullName, isAdmin } = useAuth();
  return <div>Halo {fullName} {isAdmin && "(admin)"}</div>;
}
```

### Halaman admin (butuh role admin, ada AdminSidebar)

1. Buat folder di `src/app/(main)/admin/<nama>/page.tsx`.
2. Mark `"use client"`.
3. Render `<AdminShell title="..." subtitle="...">...</AdminShell>` dari `@/components/layout/AdminSidebar`.
4. Cek role admin di useEffect; redirect ke `/dashboard` kalau bukan.

---

## 8. Cara Tambah API Call

Pakai `api` instance:

```ts
import api from "@/lib/api";
import type { ApiResponse, Complaint } from "@/types";

const res = await api.get<ApiResponse<Complaint[]>>("/api/complaints/");
const list = res.data.data ?? [];
```

Tambahkan typing baru ke `src/types/index.ts`, jangan inline.

---

## 9. Font Plus Jakarta Sans

Font 14 weight × style ada di `src/app/fonts/`. Di-load via `next/font/local` di `src/app/layout.tsx`:

```ts
const plusJakartaSans = localFont({
  src: [
    { path: "./fonts/PlusJakartaSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/PlusJakartaSans-Medium.ttf",  weight: "500", style: "normal" },
    // ... 600, 700, 800
  ],
  display: "swap",                ← system font dulu, swap setelah font load
  variable: "--font-sans",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});
```

Next.js subset + convert ke `.woff2` saat build. **Tidak ada request ke Google Fonts** saat runtime.

Tailwind `font-sans` otomatis pakai variable ini (lihat `tailwind.config.ts`).

---

## 10. Troubleshooting

| Gejala                                              | Sebab + Fix |
|-----------------------------------------------------|-------------|
| `Network Error` di console                          | Backend mati, atau `NEXT_PUBLIC_API_URL` salah |
| `CORS error`                                        | Tambah origin frontend ke `CORS_ALLOWED_ORIGINS` backend |
| Halaman blink ke `/login` sebentar                  | Normal — AuthGate gating client-side |
| `window is not defined` di build                    | Komponen `"use client"` lupa ditandai, atau import Leaflet tanpa dynamic |
| Token tidak persist saat refresh                    | localStorage di-block (private mode browser). Coba browser normal. |
| `Cannot find module '@/...'`                        | Cek `tsconfig.json` paths `@/* → src/*` masih ada |
| Dev server lambat boot >1 menit                     | RAM <16 GB choke. Tutup VSCode + Chrome, atau pakai `npm run build && npm start` |
| Font Plus Jakarta Sans tidak muncul                 | Cek 5 file `.ttf` ada di `src/app/fonts/`: Regular, Medium, SemiBold, Bold, ExtraBold |

---

## 11. Deploy ke Vercel

Singkat: import repo → root `frontend/` → set env `NEXT_PUBLIC_API_URL` → Deploy.
Runbook lengkap: [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).
