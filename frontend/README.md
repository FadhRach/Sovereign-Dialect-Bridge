# Frontend — Sovereign Dialect-Bridge

Next.js 14 (App Router) + TypeScript strict + Tailwind CSS + Framer Motion + Plus Jakarta Sans (self-hosted).
Konsumsi REST API backend Django.

---

## 1. Stack

| Komponen        | Versi / Pilihan |
|-----------------|-----------------|
| Framework       | Next.js 14.2.x (App Router) |
| Language        | TypeScript (strict) |
| Styling         | Tailwind CSS 3.4.x |
| Animations      | Framer Motion 12.x (landing + auth) |
| Font            | Plus Jakarta Sans (self-hosted di `src/app/fonts/`) |
| HTTP Client     | Axios 1.7 dengan JWT interceptor |
| Map             | Leaflet.js + leaflet.markercluster (dynamic import, SSR off) |
| Icons           | lucide-react (tree-shaken via `optimizePackageImports`) |
| Variant utils   | class-variance-authority + clsx + tailwind-merge |
| Auth optional   | Google Identity Services (Google Sign-In) |
| Deploy          | Vercel (region `sin1`) |

---

## 2. Struktur Folder

```
frontend/
├── public/                              ← static assets (logo, peta dotted, batik pattern)
│   ├── indonesia-dotted.svg             5217 titik presisi dari indonesianmap.jpeg
│   ├── indonesianmap.jpeg               source asli peta Indonesia (untuk regenerate dots)
│   ├── batik-pattern.png                pattern batik (overlay tile 280px)
│   ├── logo_blue.png                    logo brand biru (default, dipakai di seluruh app)
│   └── logo_white.png                   logo brand putih (khusus landing page)
├── scripts/
│   └── gen_indonesia_dots.py            generator SVG dotted (Pillow), regenerate kalau peta source berubah
├── src/
│   ├── app/                             ← App Router (Next.js 14)
│   │   ├── layout.tsx                   ← root: load font + AuthProvider
│   │   ├── page.tsx                     ← landing page (compose 8 section component)
│   │   ├── globals.css                  ← Tailwind base + `.batik-overlay`, `.nusantara-hero-gradient`, animation helpers
│   │   ├── fonts/                       ← Plus Jakarta Sans .ttf (Regular, Medium, SemiBold, Bold, ExtraBold)
│   │   ├── (auth)/                      ← halaman tanpa Navbar
│   │   │   ├── login/page.tsx           Login two-panel + Google Sign-In + back-to-landing
│   │   │   ├── register/page.tsx        Register two-panel
│   │   │   └── forgot-password/page.tsx Email code reset flow
│   │   └── (main)/                      ← halaman protected (di-gate AuthGate)
│   │       ├── layout.tsx               ← Server Component, render <AuthGate>
│   │       ├── (user)/                  ← area user: render Navbar
│   │       │   ├── layout.tsx           ← Server Component, render Navbar
│   │       │   ├── dashboard/page.tsx
│   │       │   ├── submit/page.tsx
│   │       │   ├── profile/page.tsx
│   │       │   └── complaint/[id]/page.tsx
│   │       └── admin/                   ← area admin: render AdminSidebar
│   │           ├── layout.tsx           ← Server Component wrapper
│   │           ├── page.tsx             ← orchestrator (~226 baris)
│   │           ├── _components/         ← split admin/page sub-component
│   │           │   ├── StatCard.tsx
│   │           │   ├── AdminFilters.tsx
│   │           │   ├── AdminCharts.tsx
│   │           │   ├── AdminComplaintTable.tsx
│   │           │   ├── QuickReviewModal.tsx
│   │           │   └── constants.ts
│   │           ├── map/page.tsx
│   │           ├── users/page.tsx
│   │           ├── settings/page.tsx
│   │           └── profile/page.tsx
│   ├── components/
│   │   ├── ui/                          ← PRIMITIF (tanpa konteks bisnis)
│   │   │   ├── Logo.tsx                 ← <Image> + rounded-xl + variant "white" | "blue"
│   │   │   ├── Alert.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── DialectBadge.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── UrgencyIndicator.tsx
│   │   │   └── ConfirmDialog.tsx
│   │   ├── features/                    ← KOMPONEN SPECIFIC DOMAIN
│   │   │   ├── landing/                 ← Landing page (8 section + nav + footer + motion helpers)
│   │   │   │   ├── PublicNav.tsx        Sticky nav transparan → solid+blur saat scroll
│   │   │   │   ├── Hero.tsx             Hero parallax + peta dotted bg + animasi heading per-baris
│   │   │   │   ├── HowItWorks.tsx       5-step animated flow + connector line drawing
│   │   │   │   ├── PublicComplaintMap.tsx  Wrap ComplaintMap + filter urgensi + counter
│   │   │   │   ├── FeaturesGrid.tsx     6-feature card grid (semua brand blue)
│   │   │   │   ├── LiveComplaints.tsx   Fetch /api/complaints/map/ → sort by created_at → 6 card showcase
│   │   │   │   ├── Testimonials.tsx     4 testimoni hardcoded dengan kutipan dialek asli
│   │   │   │   ├── ContactSection.tsx   Form mailto: ke NEXT_PUBLIC_CONTACT_EMAIL
│   │   │   │   ├── LandingFooter.tsx    4-kolom footer + social
│   │   │   │   └── motion-helpers.ts    Shared Framer Motion variants (fadeUp, stagger, scaleIn, slideInLeft/Right)
│   │   │   ├── auth/                    AuthProvider, AuthGate, AuthBrandPanel, AuthBackLink, RegisterForm, FormField, GoogleSignInButton, PasswordStrength, AddressSection
│   │   │   ├── complaint/               ComplaintCard, ComplaintForm/, NLPResultCard, StatusTimeline, NLPProgress
│   │   │   └── map/                     ComplaintMap (full), MiniComplaintMap, LocationPickerMap, mapUtils
│   │   └── layout/                      Navigation: Navbar, AdminSidebar, NotificationBell
│   ├── hooks/
│   │   ├── useComplaints.ts             ← fetch + polling NLP stage
│   │   ├── useFetch.ts                  ← generic fetch + loading + error + refetch
│   │   ├── useApiForm.ts                ← form submit handling
│   │   └── useGeolocation.ts            ← wrapper browser geolocation API
│   ├── lib/                             ← helper murni (no React)
│   │   ├── api.ts                       ← axios instance + 401 refresh single-flight
│   │   ├── auth.ts                      ← token storage + decode JWT (Unicode-safe)
│   │   ├── cn.ts                        ← clsx + tailwind-merge helper
│   │   ├── constants.ts                 ← STATUS_LABELS, DIALECTS, dll
│   │   └── theme.ts                     ← color tokens runtime
│   └── types/
│       └── index.ts                     ← semua interface TypeScript
├── package.json
├── tsconfig.json                        ← strict: true
├── tailwind.config.ts                   ← extend fontFamily.sans + colors.brand + animation keyframes
├── next.config.js                       ← optimizePackageImports + security headers
├── vercel.json                          ← config deploy
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
npm run dev                            # → http://localhost:3000
npm run build                          # production build
```

Pastikan backend hidup di `http://localhost:8000` (atau set `NEXT_PUBLIC_API_URL` di `.env.local`).

### Env vars yang dibaca frontend

| Variable | Wajib | Catatan |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ | Base URL Django. Default `http://localhost:8000`. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | opsional | Google OAuth Client ID. Kosong → tombol Google disembunyikan. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | opsional | Email tujuan form kontak landing. Default fallback ke email maintainer. |

### Tips kalau Mac RAM <16 GB

Dev server Next.js bisa berat. Untuk meringankan:

1. **Tutup VSCode + Chrome** sebelum `npm run dev` — bebaskan ~500 MB RAM.
2. **Pakai production build** untuk demo: `npm run build && npm start` (~150 MB runtime vs ~500 MB dev mode).

---

## 4. Landing Page — Asset Pipeline

Landing page punya 3 asset native yang membuat brand kohesif:

| Asset | Path | Cara update |
|-------|------|-------------|
| Peta Indonesia dotted | `public/indonesia-dotted.svg` | Jalankan `python3 scripts/gen_indonesia_dots.py` setelah ganti `indonesianmap.jpeg`. Tune `SPACING` / `RADIUS` / `THRESHOLD` di script. |
| Batik pattern | `public/batik-pattern.png` | Ganti file PNG langsung. CSS class `.batik-overlay` otomatis pakai file ini, 280px tile, repeat. |
| Logo | `public/logo_blue.png`, `public/logo_white.png` | Ganti file PNG langsung. Komponen `<Logo variant="white" \| "blue" />` di-import dari `@/components/ui/Logo`. |

### Pola dipakai dimana

- **Logo `white`** → hanya di landing page (PublicNav, LandingFooter)
- **Logo `blue`** → di seluruh app lain (auth, user navbar, admin sidebar, mobile login/register)
- **Batik overlay** → hero, testimonials, contact, footer, auth brand panel, admin sidebar, semua banner navy
- **Peta dotted** → hero landing (parallax bg) + auth brand panel (dekorasi pojok)

---

## 5. Server vs Client Component

App Router default = Server Component. Tandai `"use client"` HANYA jika butuh:
- React state (`useState`, `useReducer`)
- React effects (`useEffect`, `useMemo` dengan side-effect)
- Browser API (`localStorage`, `navigator`, `window`)
- Event handler (`onClick`, `onSubmit`)
- Framer Motion components (semua wajib `"use client"`)
- Context yang butuh hook

### Pola gating yang kami pakai

```
app/layout.tsx                  [Server]  ← <html> + <body> + AuthProvider (client island)
└── app/(main)/layout.tsx       [Server]  ← <AuthGate> (client island untuk redirect)
    ├── app/(main)/(user)/layout.tsx     [Server]  ← <Navbar> (client island)
    └── app/(main)/admin/layout.tsx       [Server]  ← wrapper kosong (admin pakai AdminSidebar)
```

Halaman child Server Component (mis. `submit/page.tsx`) tidak ikut terbawa client bundle berkat boundary client island.

---

## 6. Auth Flow

```
LoginPage / RegisterPage / GoogleSignInButton
   │
   └─ useAuth().login(email, password) | loginWithGoogle(credential)
            │
            ▼
        api.post('/api/auth/login/' | '/api/auth/google/')   ← lib/api.ts (axios singleton)
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

`AuthGate` cek `isAuthenticated`; kalau false redirect ke `/login`.

---

## 7. Konvensi Kode

- **`tsconfig` strict**; hindari `any`.
- Semua API call **wajib lewat `@/lib/api`** — tidak boleh `fetch()` langsung.
- Semua type ada di **`@/types`** — tidak boleh inline.
- Pakai `"use client"` **seminimal mungkin** (default Server Component).
- Leaflet **wajib** `dynamic(..., { ssr: false })`.
- Komponen > 250 baris → pecah jadi sub-komponen di `_components/` atau folder fitur.
- **Tanpa emoji di code** (per CLAUDE.md). Pakai lucide icon kalau perlu simbol.

### Pakai primitives

Sebelum tulis input/button/card baru, cek `components/ui/`:

```tsx
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";

<Card padding="md">
  <Logo variant="blue" size="md" />
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

## 8. Animasi (Framer Motion)

Landing & auth page pakai Framer Motion. Pola yang dipakai:

```tsx
import { motion } from "framer-motion";
import { fadeUp, stagger, viewportOnce } from "./motion-helpers";

<motion.div
  initial="hidden"
  whileInView="show"
  viewport={viewportOnce}        // { once: true, margin: "-80px" }
  variants={stagger(0, 0.1)}     // delayChildren=0, staggerChildren=0.1
>
  <motion.h2 variants={fadeUp}>Heading</motion.h2>
  <motion.p variants={fadeUp}>Subtitle</motion.p>
</motion.div>
```

Variant siap pakai: `fadeUp`, `fadeIn`, `scaleIn`, `slideInLeft`, `slideInRight`, `stagger(delay, step)`. Lihat `src/components/features/landing/motion-helpers.ts`.

---

## 9. Cara Tambah Halaman Baru

### Halaman user biasa (butuh login, ada Navbar)

1. Buat folder di `src/app/(main)/(user)/<nama>/page.tsx`.
2. Mark `"use client"` jika butuh state/hooks.
3. Layout protected sudah otomatis aktif via `(main)/layout.tsx` (AuthGate).
4. Konsumsi `useAuth()` untuk user info / logout.

### Halaman admin (butuh role admin, ada AdminSidebar)

1. Buat folder di `src/app/(main)/admin/<nama>/page.tsx`.
2. Mark `"use client"`.
3. Render `<AdminShell title="..." subtitle="...">...</AdminShell>` dari `@/components/layout/AdminSidebar`.
4. Cek role admin di useEffect; redirect ke `/dashboard` kalau bukan.

---

## 10. Font Plus Jakarta Sans

Font 5 weight ada di `src/app/fonts/`. Di-load via `next/font/local` di `src/app/layout.tsx`:

```ts
const plusJakartaSans = localFont({
  src: [
    { path: "./fonts/PlusJakartaSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/PlusJakartaSans-Medium.ttf",  weight: "500", style: "normal" },
    // ... 600, 700, 800
  ],
  display: "swap",
  variable: "--font-sans",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});
```

Next.js subset + convert ke `.woff2` saat build. **Tidak ada request ke Google Fonts** saat runtime.

---

## 11. Production Build

```bash
npm run build       # Static optimization + tree-shake + minify
npm start           # Serve build (port 3000)
```

Output build size (sample, akhir Juni):
- Landing `/` → 184 KB First Load JS (peta + framer motion + leaflet)
- Auth pages → ~122-172 KB
- Dashboard / admin → 124-134 KB

Bundle size masih di bawah threshold Lighthouse Performance ≥ 85.

---

## 12. Troubleshooting

| Gejala                                              | Sebab + Fix |
|-----------------------------------------------------|-------------|
| `Network Error` di console                          | Backend mati, atau `NEXT_PUBLIC_API_URL` salah |
| `CORS error`                                        | Tambah origin frontend ke `CORS_ALLOWED_ORIGINS` backend |
| Halaman blink ke `/login` sebentar                  | Normal — AuthGate gating client-side |
| `window is not defined` di build                    | Komponen `"use client"` lupa ditandai, atau import Leaflet tanpa dynamic |
| Token tidak persist saat refresh                    | localStorage di-block (private mode browser). Coba browser normal. |
| `Cannot find module '@/...'`                        | Cek `tsconfig.json` paths `@/* → src/*` masih ada |
| Dev server lambat boot >1 menit                     | RAM <16 GB choke. Tutup VSCode + Chrome, atau pakai `npm run build && npm start` |
| Font Plus Jakarta Sans tidak muncul                 | Cek 5 file `.ttf` ada di `src/app/fonts/` |
| Animasi Framer Motion blank di SSR snapshot         | Normal — initial state opacity:0. Akan muncul saat hydrate. |
| Peta dotted aneh setelah ganti `indonesianmap.jpeg` | Jalankan ulang `python3 scripts/gen_indonesia_dots.py`. |
| Tombol Google Sign-In tidak muncul                  | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` kosong → tombol disembunyikan. Set env var. |

---

## 13. Deploy ke Vercel

Singkat: import repo → root `frontend/` → set env `NEXT_PUBLIC_API_URL` (+ optional `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_CONTACT_EMAIL`) → Deploy.

Runbook lengkap: [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).
