# src/lib

Helper murni — **TANPA React state/effect**. Komponen → lib (boleh), lib → komponen (DILARANG).

| File          | Isi |
|---------------|-----|
| `api.ts`      | Axios instance + interceptor. Single-flight refresh queue. **Semua API call wajib lewat sini.** |
| `auth.ts`     | Helper localStorage (`getAccessToken`, `saveTokens`, `clearTokens`). Decoder JWT Unicode-safe (`decodeJwt`, `isTokenExpired`, `getCurrentUser`, `isAdmin`). |
| `cn.ts`       | Helper `cn(...classes)` — gabungan `clsx` + `tailwind-merge`. Pakai untuk conditional class + resolve konflik Tailwind. |
| `theme.ts`    | Runtime color tokens — `COLORS`, `CATEGORY_PALETTE`. Pakai untuk inline style (chart, leaflet marker). Untuk class, pakai Tailwind langsung (`bg-brand-blue`). |
| `constants.ts` | Domain constants — `STATUS_LABELS`, `URGENCY_LABELS`, `DIALECTS`, `PROCESSING_STAGE_LABELS`. Single source of truth untuk string yang muncul di banyak tempat. |

## Aturan

1. **Type interfaces** ada di `@/types`, bukan di sini.
2. **React hooks** ada di `@/hooks`, bukan di sini.
3. File di sini boleh import dari `@/types`, tidak boleh import dari `@/components` atau `@/hooks`.
4. Setiap file fokus satu concern. Kalau `theme.ts` mulai gemuk dengan logic → pisah ke file baru.
