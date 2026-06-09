import Link from "next/link";
import { Globe } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import RegisterForm from "@/components/features/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[380px] xl:w-[420px] flex-col justify-between p-10 bg-[#1E2A4A] relative overflow-hidden flex-shrink-0">
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
            Bergabung &<br />Mulai Melapor
          </h2>
          <p className="text-blue-200/70 text-sm leading-relaxed mb-8">
            Buat akun gratis dalam hitungan menit.<br />
            Tidak perlu datang ke kantor — cukup dari rumah.
          </p>
          <div className="space-y-3">
            {[
              "Gratis, tanpa biaya apapun",
              "Data Anda aman & terenkripsi",
              "Aduan ditindaklanjuti pemerintah",
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
      <div className="flex-1 bg-white px-6 py-10 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          {/* Mobile logo */}
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#2563EB] mb-6 transition-colors group font-medium">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Kembali ke Halaman Utama
          </Link>
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
            <h1 className="text-2xl font-bold text-[#1E2A4A]">Buat Akun Baru</h1>
            <p className="text-gray-500 text-sm mt-1">Daftarkan diri untuk mulai menyampaikan aduan</p>
          </div>

          <RegisterForm />

          <p className="text-center text-sm text-gray-500 mt-6">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
