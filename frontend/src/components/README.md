# src/components

Komponen React dipisah berdasarkan **konteks**, bukan tipe:

| Folder         | Isi & aturan |
|----------------|--------------|
| `ui/`          | **Primitif** — Button, Input, Card, Alert, Spinner, Skeleton, dll. Tidak boleh tahu shape domain (`Complaint`, `User`). Boleh dipakai project mana saja. |
| `features/`    | **Komponen specific domain**, satu folder per fitur: `auth/`, `complaint/`, `map/`. Boleh import dari `ui/` + `lib/` + `types/`. |
| `layout/`      | **Navigation/shell**: Navbar, AdminSidebar, NotificationBell. |

> Komponen private milik satu route → letakkan di `app/<route>/_components/`.
> Folder `_components` di-skip oleh router Next.js, jadi tidak jadi URL.

## Aturan penting

1. **Sebelum bikin komponen baru**: cek `ui/` apakah primitif yang dibutuhkan sudah ada.
2. **`use client` seminimal mungkin**. Default Server Component. Tambahkan `"use client"` hanya jika butuh state/hook/event handler.
3. **Komponen >250 baris** harus dipecah jadi sub-component.
4. **Leaflet** wajib via `dynamic(..., { ssr: false })` — lihat `features/map/ComplaintMap.tsx`.

## Pattern auth

- `AuthProvider` dipasang sekali di `app/layout.tsx` (Server) sebagai client island.
- Konsumsi via `useAuth()` (alias `useAuthContext`) dari `@/components/features/auth/AuthProvider`.
- `AuthGate` (`@/components/features/auth/AuthGate`) → client island untuk redirect kalau belum login. Dipakai di `(main)/layout.tsx`.

## Adding a new feature

1. Buat folder: `components/features/<nama-fitur>/`.
2. Komponen yang reusable di feature itu masuk situ.
3. Komponen private milik 1 page-saja → masuk `app/<route>/_components/` (bukan ke features).
