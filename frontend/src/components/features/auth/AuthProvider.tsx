"use client";

/**
 * AuthProvider menyimpan state auth (token + user payload) di React context,
 * agar tidak re-init setiap kali useAuth dipanggil di komponen berbeda.
 *
 * State sumber kebenaran: localStorage (via lib/auth). Context hanya cache.
 * Setelah login/register/logout, state context disinkronkan manual.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTokens, getCurrentUser, saveTokens } from "@/lib/auth";
import type { ApiResponse, AuthResponse, RegisterPayload } from "@/types";

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userId: number | null;
  fullName: string;
  email: string;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<string | null>;
  loginWithGoogle: (credential: string) => Promise<string | null>;
  register: (data: RegisterPayload) => Promise<string | null>;
  logout: () => Promise<void>;
}

const INITIAL_STATE: AuthState = {
  isAuthenticated: false,
  isAdmin: false,
  userId: null,
  fullName: "",
  email: "",
  isLoading: true,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  const syncFromStorage = useCallback(() => {
    const user = getCurrentUser();
    setState({
      isAuthenticated: !!user,
      isAdmin: user?.role === "admin",
      userId: user?.user_id ?? null,
      fullName: user?.full_name ?? "",
      email: user?.email ?? "",
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      try {
        const res = await api.post<ApiResponse<AuthResponse>>("/api/auth/login/", { email, password });
        const data = res.data.data;
        if (!data) return res.data.message;
        saveTokens(data.access, data.refresh);
        syncFromStorage();
        router.push(data.user.role === "admin" ? "/admin" : "/dashboard");
        return null;
      } catch (err: unknown) {
        return extractErrorMessage(err, "Email atau password salah.");
      }
    },
    [router, syncFromStorage]
  );

  const register = useCallback(
    async (data: RegisterPayload): Promise<string | null> => {
      try {
        const res = await api.post<ApiResponse<AuthResponse>>("/api/auth/register/", data);
        const responseData = res.data.data;
        if (!responseData) return res.data.message;
        saveTokens(responseData.access, responseData.refresh);
        syncFromStorage();
        router.push("/dashboard");
        return null;
      } catch (err: unknown) {
        return extractErrorMessage(err, "Registrasi gagal.");
      }
    },
    [router, syncFromStorage]
  );

  const loginWithGoogle = useCallback(
    async (credential: string): Promise<string | null> => {
      try {
        const res = await api.post<ApiResponse<AuthResponse>>("/api/auth/google/", { credential });
        const data = res.data.data;
        if (!data) return res.data.message;
        saveTokens(data.access, data.refresh);
        syncFromStorage();
        router.push(data.user.role === "admin" ? "/admin" : "/dashboard");
        return null;
      } catch (err: unknown) {
        return extractErrorMessage(err, "Login Google gagal.");
      }
    },
    [router, syncFromStorage]
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      const refresh = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
      if (refresh) {
        await api.post("/api/auth/logout/", { refresh });
      }
    } finally {
      clearTokens();
      syncFromStorage();
      router.push("/login");
    }
  }, [router, syncFromStorage]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, loginWithGoogle, register, logout }),
    [state, login, loginWithGoogle, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext harus dipakai di dalam <AuthProvider>");
  }
  return ctx;
}

// Alias supaya callsite cukup tulis `useAuth()` (lebih singkat & idiomatic).
export const useAuth = useAuthContext;

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const axiosErr = err as {
      response?: { data?: { message?: string; errors?: Record<string, string[]> } };
    };
    const errors = axiosErr.response?.data?.errors;
    if (errors) {
      const firstField = Object.keys(errors)[0];
      const messages = errors[firstField];
      if (messages && messages.length > 0) return messages[0];
    }
    return axiosErr.response?.data?.message ?? fallback;
  }
  return fallback;
}
