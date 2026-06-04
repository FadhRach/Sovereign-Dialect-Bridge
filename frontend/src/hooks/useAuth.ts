/**
 * Hook publik untuk consume auth state.
 *
 * Implementasi sebenarnya ada di AuthProvider (components/auth/AuthProvider.tsx).
 * Hook ini hanya wrapper agar API lama (`useAuth()`) tetap kompatibel di seluruh kode.
 */

export { useAuthContext as useAuth } from "@/components/auth/AuthProvider";
export type { RegisterPayload } from "@/lib/types";
