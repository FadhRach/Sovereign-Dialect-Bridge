# src/lib

Module-level utilities yang dishare seluruh app. **Tidak boleh** import dari `components/` (arah dependency: components → lib, bukan sebaliknya).

| File       | Isi |
|------------|-----|
| `api.ts`   | Axios instance + interceptor. Single-flight refresh queue. **Semua API call wajib lewat sini** (lihat CLAUDE.md §8.3). |
| `auth.ts`  | Helper localStorage (`getAccessToken`, `saveTokens`, `clearTokens`). Decoder JWT Unicode-safe (`decodeJwt`, `isTokenExpired`, `getCurrentUser`, `isAdmin`). |
| `types.ts` | Semua TypeScript interface domain: `User`, `Complaint`, `AuthResponse`, `RegisterPayload`, `ApiResponse<T>`, dll. **Inline type di komponen dilarang.** |

## Extending

- Tambah util baru → file baru di sini, lalu re-export dari `index.ts` (opsional, kalau dipakai luas).
- Tambah type baru → edit `types.ts`. Konvensi: PascalCase, suffix `Payload` untuk request body, `Summary` untuk versi ringkas.
