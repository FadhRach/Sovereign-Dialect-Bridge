"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { useAuth } from "@/components/features/auth/AuthProvider";
import GoogleSignInButton from "@/components/features/auth/GoogleSignInButton";
import AuthBrandPanel from "@/components/features/auth/AuthBrandPanel";
import AuthBackLink from "@/components/features/auth/AuthBackLink";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
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
    <div className="min-h-screen flex bg-white">
      <AuthBrandPanel
        title={
          <>
            Suara Anda
            <br />
            Didengar Pemerintah
          </>
        }
        description="Sampaikan aduan dalam bahasa daerah Anda. AI kami akan menerjemahkan dan meneruskan ke instansi yang tepat."
        bullets={[
          "12 dialek bahasa daerah didukung",
          "Proses otomatis dengan pipeline AI",
          "Transparan & dapat dipantau real-time",
        ]}
        variant="login"
      />

      {/* Right panel — form */}
      <div className="flex-1 relative flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 px-6 py-10 overflow-hidden">
        {/* Subtle decorative blobs */}
        <div className="absolute top-10 right-10 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-sm">
          {/* Top: back link */}
          <div className="mb-7">
            <AuthBackLink />
          </div>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-7">
            <Logo variant="blue" size="md" />
            <div className="leading-tight">
              <p className="font-bold text-brand-navy text-sm leading-none">
                sovereign
              </p>
              <p className="text-slate-400 text-[10px] leading-none mt-0.5">
                dialect bridge
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-brand-navy tracking-tight">
              Selamat Datang
              <span className="text-brand-blue">.</span>
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              Masuk untuk melanjutkan menyampaikan aduan Anda
            </p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5"
            >
              <Alert message={error} onDismiss={() => setError(null)} />
            </motion.div>
          )}

          <motion.form
            onSubmit={handleSubmit}
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } } }}
            className="space-y-5"
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-brand-navy mb-2"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-3.5 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-brand-blue transition-all bg-white placeholder:text-slate-400"
                />
              </div>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-brand-navy"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-brand-blue hover:text-brand-blueDark"
                >
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-brand-blue transition-all bg-white placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>

            <motion.button
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
              whileHover={{ scale: isLoading ? 1 : 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-brand-navy text-white rounded-xl text-sm font-semibold hover:bg-brand-blue disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/15 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" />
                  <span>Masuk...</span>
                </>
              ) : (
                "Masuk ke Akun"
              )}
            </motion.button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="my-6 flex items-center gap-3"
          >
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              atau lanjutkan dengan
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <GoogleSignInButton onCredential={loginWithGoogle} onError={setError} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="text-center text-sm text-slate-500 mt-7"
          >
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="text-brand-blue hover:text-brand-blueDark font-semibold"
            >
              Daftar sekarang →
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
}

