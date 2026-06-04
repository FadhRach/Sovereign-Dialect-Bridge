/**
 * Helper untuk JWT token storage + decoding.
 *
 * Catatan keamanan: token disimpan di localStorage. Rentan XSS, mitigasi via
 * strict CSP + sanitasi input + tidak render HTML mentah dari user.
 */

import type { UserRole } from "./types";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

export interface JwtPayload {
  user_id: number;
  email: string;
  full_name: string;
  role: UserRole;
  exp: number;
  iat?: number;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function saveTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getAuthHeader(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Decode base64url payload JWT ke string UTF-8.
 * Tidak boleh pakai `atob()` langsung — gagal untuk karakter non-ASCII (nama Indonesia, dll).
 */
function decodeBase64Url(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    segment.length + ((4 - (segment.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    return JSON.parse(decodeBase64Url(segment)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload) return true;
  return Date.now() / 1000 > payload.exp;
}

export function isAdmin(): boolean {
  const payload = getCurrentUser();
  return payload?.role === "admin";
}

export function getCurrentUser(): JwtPayload | null {
  const token = getAccessToken();
  if (!token || isTokenExpired(token)) return null;
  return decodeJwt(token);
}
