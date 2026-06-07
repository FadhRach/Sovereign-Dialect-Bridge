import Link from "next/link";
import { MessageSquare, Cpu, CheckCircle2, ChevronRight, Globe } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 h-14 bg-white/95 backdrop-blur-sm border-b border-gray-100 flex items-center px-6">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-[#1E2A4A] text-sm leading-none">Dialect-Bridge</p>
              <p className="text-gray-400 text-[10px] leading-none mt-0.5">Sovereign Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-gray-600 hover:text-[#2563EB] font-medium transition-colors px-3 py-2">
              Masuk
            </Link>
            <Link href="/register" className="text-sm px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-lg transition-colors">
              Daftar
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#1E2A4A] overflow-hidden">
        <div className="absolute inset-0 batik-overlay opacity-[0.055] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E2A4A] via-[#1e3060] to-[#162d5c]" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 lg:py-36">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 bg-[#60A5FA] rounded-full animate-pulse flex-shrink-0" />
              <span className="text-blue-200 text-xs font-medium">12 Dialek Bahasa Daerah Didukung</span>
            </div>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-[1.15] mb-5">
              Sampaikan Aduan dalam{" "}
              <span className="text-[#60A5FA]">Bahasa Daerahmu</span>
            </h1>
            <p className="text-lg text-blue-100/75 mb-10 leading-relaxed max-w-xl">
              Platform pengaduan publik berbasis AI untuk warga Indonesia. Tulis dalam bahasa
              Jawa, Sunda, Minang, atau dialek lokal manapun — sistem kami memahami dan
              meneruskan ke pemerintah yang berwenang.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-900/30"
              >
                Lapor Sekarang
                <ChevronRight className="w-4 h-4" />
              </Link>
              <a
                href="#cara-kerja"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/[0.15] border border-white/20 text-white font-medium rounded-xl transition-colors"
              >
                Pelajari Cara Kerjanya
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="cara-kerja" className="bg-white py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-[#2563EB] text-xs font-bold uppercase tracking-widest">Cara Kerja</span>
            <h2 className="text-3xl font-bold text-[#1E2A4A] mt-2">Tiga Langkah Mudah</h2>
            <p className="text-gray-500 mt-3 max-w-md mx-auto text-sm leading-relaxed">
              Aduan Anda diproses AI secara otomatis dan diteruskan ke instansi yang tepat
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                Icon: MessageSquare,
                title: "Tulis Aduan",
                desc: "Sampaikan masalah dalam bahasa apapun — Indonesia, Jawa, Sunda, Minang, atau 8 dialek lokal lainnya.",
                accent: "text-blue-600 bg-blue-50",
              },
              {
                num: "02",
                Icon: Cpu,
                title: "AI Menganalisis",
                desc: "Sistem AI otomatis mendeteksi dialek, menerjemahkan ke BI, meringkas, dan mengklasifikasi urgensi aduan Anda.",
                accent: "text-indigo-600 bg-indigo-50",
              },
              {
                num: "03",
                Icon: CheckCircle2,
                title: "Ditindaklanjuti",
                desc: "Admin pemerintah menerima laporan terstruktur dan transparan merespons setiap aduan yang masuk.",
                accent: "text-emerald-600 bg-emerald-50",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="relative bg-[#F8F9FB] rounded-2xl p-7 border border-gray-100 hover:border-[#2563EB]/20 hover:shadow-md transition-all duration-200"
              >
                <div className="absolute top-5 right-6 text-5xl font-black text-gray-100 select-none leading-none">
                  {step.num}
                </div>
                <div className={`w-11 h-11 ${step.accent} rounded-xl flex items-center justify-center mb-5`}>
                  <step.Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-[#1E2A4A] mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#EFF6FF] border-y border-blue-100 py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
            {[
              { value: "12", label: "Dialek Didukung", sub: "Bahasa daerah Indonesia" },
              { value: "100%", label: "Transparan", sub: "Status aduan selalu terpantau" },
              { value: "AI", label: "Diproses Otomatis", sub: "NLP pipeline real-time" },
            ].map((s) => (
              <div key={s.value}>
                <div className="text-4xl font-black text-[#2563EB]">{s.value}</div>
                <div className="font-semibold text-[#1E2A4A] mt-1.5">{s.label}</div>
                <div className="text-sm text-gray-500 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative bg-[#2563EB] py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 batik-overlay opacity-[0.07] pointer-events-none" />
        <div className="relative max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Siap Menyampaikan Aduan?</h2>
          <p className="text-blue-100 mb-8 leading-relaxed">
            Daftarkan diri sekarang, gratis. Sampaikan aspirasi Anda dalam bahasa daerah Anda sendiri.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[#2563EB] font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-xl shadow-blue-800/20"
          >
            Daftar Sekarang — Gratis
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E2A4A] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#2563EB] rounded-md flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-semibold text-sm">Dialect-Bridge</span>
          </div>
          <p className="text-blue-200/50 text-xs text-center">
            © 2025 Sovereign Dialect-Bridge · Platform Pengaduan Publik Multidialek Indonesia
          </p>
        </div>
      </footer>
    </div>
  );
}
