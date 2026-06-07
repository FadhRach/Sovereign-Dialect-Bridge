"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/features/auth/AuthProvider";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const err = await login(email, password);
    if (err) {
      setError(err);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between p-10 bg-[#1E2A4A] relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 batik-overlay opacity-[0.06] pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 bg-[#2563EB] rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-white text-sm leading-none">Dialect-Bridge</p>
            <p className="text-blue-300/70 text-[10px] leading-none mt-0.5">Sovereign Platform</p>
          </div>
        </div>

        <div className="relative">
          <h2 className="text-3xl font-bold text-white leading-snug mb-4">
            Suara Anda<br />Didengar Pemerintah
          </h2>
          <p className="text-blue-200/70 text-sm leading-relaxed mb-8">
            Sampaikan aduan dalam bahasa daerah Anda.<br />
            AI kami akan menerjemahkan dan meneruskan ke instansi yang tepat.
          </p>
          <div className="space-y-3">
            {[
              "12 dialek bahasa daerah didukung",
              "Proses otomatis dengan AI",
              "Transparan & dapat dipantau",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] flex-shrink-0" />
                <span className="text-blue-100/80 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-blue-300/40 text-xs">© 2025 Sovereign Dialect-Bridge</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-[#1E2A4A] text-sm leading-none">Dialect-Bridge</p>
              <p className="text-gray-400 text-[10px] leading-none mt-0.5">Sovereign Platform</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#1E2A4A]">Selamat Datang</h1>
            <p className="text-gray-500 text-sm mt-1">Masuk ke akun Anda untuk melanjutkan</p>
          </div>

          {error && (
            <div className="mb-5">
              <Alert message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1E2A4A] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors bg-gray-50 placeholder:text-gray-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1E2A4A] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full px-3.5 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors bg-gray-50 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#2563EB] text-white rounded-xl text-sm font-semibold hover:bg-[#1D4ED8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-1"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" />
                  <span>Masuk...</span>
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Belum punya akun?{" "}
            <Link href="/register" className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold">
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
