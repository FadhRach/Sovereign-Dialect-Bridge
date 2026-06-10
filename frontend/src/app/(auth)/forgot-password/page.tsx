"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import Logo from "@/components/ui/Logo";
import api from "@/lib/api";
import Alert from "@/components/ui/Alert";
import PasswordStrength from "@/components/features/auth/PasswordStrength";
import type { ApiResponse } from "@/types";

type ResetStep = "request" | "verify" | "password" | "done";

interface RequestResponse {
  expires_in_minutes?: number;
  debug_code?: string;
}

interface VerifyResponse {
  reset_token: string;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<ResetStep>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [debugCode, setDebugCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<ApiResponse<RequestResponse>>("/api/auth/password-reset/request/", {
        email,
      });
      setDebugCode(res.data.data?.debug_code ?? "");
      setMessage(res.data.message || "Kode verifikasi dikirim ke email jika akun ditemukan.");
      setStep("verify");
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Gagal meminta kode verifikasi."));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<ApiResponse<VerifyResponse>>("/api/auth/password-reset/verify/", {
        email,
        code,
      });
      const token = res.data.data?.reset_token;
      if (!token) throw new Error("Reset token kosong.");
      setResetToken(token);
      setStep("password");
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Kode verifikasi tidak valid."));
    } finally {
      setLoading(false);
    }
  }

  async function confirmPassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword !== newPasswordConfirm) {
      setError("Password baru tidak cocok.");
      return;
    }
    setLoading(true);
    try {
      await api.post<ApiResponse<null>>("/api/auth/password-reset/confirm/", {
        reset_token: resetToken,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });
      setStep("done");
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Gagal mengganti password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[420px] flex-col justify-between p-10 bg-[#1E2A4A] relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 batik-overlay opacity-[0.06] pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <Logo variant="blue" size="md" />
          <div className="leading-tight">
            <p className="font-bold text-white text-sm leading-none">sovereign</p>
            <p className="text-blue-300/70 text-[10px] leading-none mt-0.5">dialect bridge</p>
          </div>
        </div>
        <div className="relative">
          <h2 className="text-3xl font-bold text-white leading-snug mb-4">
            Verifikasi dulu,<br />baru ganti password
          </h2>
          <p className="text-blue-200/70 text-sm leading-relaxed">
            Kode verifikasi dikirim ke email yang terdaftar pada akun Anda.
          </p>
        </div>
        <p className="relative text-blue-300/40 text-xs">© 2025 Sovereign Dialect-Bridge</p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#1E2A4A]">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke login
          </Link>

          <div className="mb-6">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF]">
              <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1E2A4A]">Lupa Password</h1>
            <p className="mt-1 text-sm text-gray-500">Masukkan email akun, verifikasi kode, lalu buat password baru.</p>
          </div>

          {error && <Alert message={error} onDismiss={() => setError(null)} />}

          {step === "request" && (
            <form onSubmit={requestCode} className="mt-5 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-[#1E2A4A] mb-1.5">
                  Email akun
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="nama@email.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                />
                <p className="mt-2 text-xs leading-relaxed text-gray-500">
                  Untuk sementara reset password hanya dikirim lewat email agar prosesnya stabil dan mudah diverifikasi.
                </p>
              </div>
              <SubmitButton loading={loading} label="Kirim Kode" loadingLabel="Mengirim..." />
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={verifyCode} className="mt-5 space-y-4">
              <Alert message={message} variant="info" />
              {debugCode && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Kode dev lokal: <span className="font-extrabold tracking-widest">{debugCode}</span>
                </div>
              )}
              <div>
                <label htmlFor="code" className="block text-sm font-semibold text-[#1E2A4A] mb-1.5">
                  Kode verifikasi
                </label>
                <input
                  id="code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  inputMode="numeric"
                  placeholder="6 digit"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-center text-lg font-extrabold tracking-[0.4em] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                />
              </div>
              <SubmitButton loading={loading} label="Verifikasi Kode" loadingLabel="Memeriksa..." />
            </form>
          )}

          {step === "password" && (
            <form onSubmit={confirmPassword} className="mt-5 space-y-4">
              <div>
                <label htmlFor="new_password" className="block text-sm font-semibold text-[#1E2A4A] mb-1.5">
                  Password baru
                </label>
                <input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                />
                <PasswordStrength password={newPassword} />
              </div>
              <div>
                <label htmlFor="new_password_confirm" className="block text-sm font-semibold text-[#1E2A4A] mb-1.5">
                  Konfirmasi password baru
                </label>
                <input
                  id="new_password_confirm"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(event) => setNewPasswordConfirm(event.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                />
              </div>
              <SubmitButton loading={loading} label="Ganti Password" loadingLabel="Menyimpan..." />
            </form>
          )}

          {step === "done" && (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-600" />
              <p className="font-bold text-[#1E2A4A]">Password berhasil diganti</p>
              <Link href="/login" className="mt-4 inline-flex rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1D4ED8]">
                Login sekarang
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmitButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-60"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading ? loadingLabel : label}
    </button>
  );
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const axiosErr = err as { response?: { data?: { message?: string } } };
    return axiosErr.response?.data?.message ?? fallback;
  }
  return fallback;
}
