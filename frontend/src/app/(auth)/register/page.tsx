"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import RegisterForm from "@/components/features/auth/RegisterForm";
import AuthBrandPanel from "@/components/features/auth/AuthBrandPanel";
import AuthBackLink from "@/components/features/auth/AuthBackLink";
import Logo from "@/components/ui/Logo";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex bg-white">
      <AuthBrandPanel
        title={
          <>
            Bergabung &<br />Mulai Melapor
          </>
        }
        description="Buat akun gratis dalam hitungan menit. Tidak perlu datang ke kantor — cukup dari rumah."
        bullets={[
          "Gratis, tanpa biaya apapun",
          "Data Anda aman & terenkripsi",
          "Aduan ditindaklanjuti pemerintah",
        ]}
        variant="register"
      />

      {/* Right panel — form */}
      <div className="flex-1 relative bg-gradient-to-br from-slate-50 via-white to-blue-50/30 px-6 py-10 overflow-y-auto overflow-x-hidden">
        {/* Subtle decorative blobs */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-32 left-10 w-64 h-64 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-lg mx-auto">
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
            className="mb-7"
          >
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-3">
              <span className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
              <span className="text-xs font-semibold text-brand-blue">
                Gratis · 100% Indonesia
              </span>
            </div>
            <h1 className="text-3xl font-bold text-brand-navy tracking-tight">
              Buat Akun Baru
            </h1>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Daftarkan diri untuk mulai menyampaikan aduan dalam bahasa
              daerahmu.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <RegisterForm />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="text-center text-sm text-slate-500 mt-7"
          >
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="text-brand-blue hover:text-brand-blueDark font-semibold"
            >
              Masuk di sini →
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
}
