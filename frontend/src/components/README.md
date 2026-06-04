# src/components

Komponen React, dikelompokkan per-domain. Aturan: komponen >100 baris harus dipecah jadi sub-komponen (CLAUDE.md §8.3).

| Folder       | Isi |
|--------------|-----|
| `auth/`      | `AuthProvider` (context global), `RegisterForm`, `AddressSection`, `PasswordStrength`, `FormField`, `PROVINCES.ts` |
| `complaint/` | `ComplaintCard`, `ComplaintForm`, `NLPResultCard`, `StatusBadge` |
| `layout/`    | `Navbar`, `Sidebar` |
| `map/`       | `ComplaintMap` (wajib `dynamic(..., { ssr: false })`) |
| `shared/`    | `LoadingSpinner`, `ErrorAlert` |
| `ui/`        | Primitif (sementara native Tailwind; placeholder untuk shadcn/ui) |

## Pattern Penting

- **`AuthProvider`** dipasang sekali di `app/layout.tsx`. Konsumsi via `useAuth()` (alias `useAuthContext`).
- **Form** memakai primitive di `auth/FormField.tsx` (`FormInput`, `FormSelect`) untuk konsistensi style + label.
- **Leaflet** WAJIB di-import dynamic karena butuh `window` (lihat `map/ComplaintMap.tsx`).

## Extending

- Komponen baru spesifik domain → buat folder per domain, jangan dumping di `shared/`.
- State global selain auth → pertimbangkan zustand/jotai sebelum bikin Context baru (hindari prop drilling tapi jangan over-engineer).
