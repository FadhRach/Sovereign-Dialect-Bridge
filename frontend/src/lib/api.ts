/**
 * Axios client tunggal. Semua API call wajib lewat sini (lihat CLAUDE.md §8.3).
 *
 * Interceptor menambahkan Bearer token otomatis. Jika dapat 401, sekali coba
 * refresh — semua request 401 paralel berbagi satu refresh promise (single-flight)
 * agar tidak terjadi race condition / refresh ganda yang saling membatalkan.
 */

import axios, { AxiosError, AxiosRequestConfig } from "axios";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "./auth";
import type { ApiResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

const PUBLIC_AUTH_PATHS = [
  "/api/auth/login/",
  "/api/auth/register/",
  "/api/auth/google/",
  "/api/auth/password-reset/request/",
  "/api/auth/password-reset/verify/",
  "/api/auth/password-reset/confirm/",
];

function isPublicAuthUrl(url?: string): boolean {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}

api.interceptors.request.use((config) => {
  if (isPublicAuthUrl(config.url)) {
    delete config.headers.Authorization;
    return config;
  }

  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh: hanya satu request refresh aktif pada satu waktu.
let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("No refresh token");
  const res = await axios.post<ApiResponse<{ access: string; refresh: string }>>(
    `${API_URL}/api/auth/token/refresh/`,
    { refresh }
  );
  const newAccess = res.data.data?.access;
  const newRefresh = res.data.data?.refresh;
  if (!newAccess || !newRefresh) throw new Error("Invalid refresh response");
  saveTokens(newAccess, newRefresh);
  return newAccess;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const isAuthRefreshCall = originalRequest?.url?.includes("/api/auth/token/refresh/");
    const isPublicAuthCall = isPublicAuthUrl(originalRequest?.url);

    if (error.response?.status !== 401 || originalRequest._retry || isAuthRefreshCall || isPublicAuthCall) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      refreshPromise = refreshPromise ?? performRefresh().finally(() => {
        refreshPromise = null;
      });
      const newAccess = await refreshPromise;
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newAccess}`,
      };
      return api(originalRequest);
    } catch {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  }
);

export default api;
