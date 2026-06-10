"use client";

import { motion } from "framer-motion";
import {
  Globe,
  Cpu,
  Shield,
  Activity,
  Map,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { fadeUp, stagger, viewportOnce } from "./motion-helpers";

interface Feature {
  Icon: LucideIcon;
  title: string;
  desc: string;
  accent: string;
  extra?: React.ReactNode;
}

const DIALECT_MINI = [
  { code: "JV", color: "bg-amber-100 text-amber-700" },
  { code: "SU", color: "bg-emerald-100 text-emerald-700" },
  { code: "MIN", color: "bg-rose-100 text-rose-700" },
  { code: "BAN", color: "bg-violet-100 text-violet-700" },
  { code: "BUG", color: "bg-cyan-100 text-cyan-700" },
  { code: "+7", color: "bg-slate-100 text-slate-600" },
];

const PIPELINE_STEPS = ["Detect", "Translate", "Summarize", "NER", "Classify"];

const FEATURES: Feature[] = [
  {
    Icon: Globe,
    title: "12 Dialek Nusantara",
    desc: "Dukungan native untuk bahasa Jawa, Sunda, Minang, Bali, Bugis, Madura, Banjar, Aceh, Betawi, dan lainnya.",
    accent: "from-blue-500 to-blue-600",
    extra: (
      <div className="flex flex-wrap gap-1.5 mt-4">
        {DIALECT_MINI.map((d) => (
          <span
            key={d.code}
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${d.color}`}
          >
            {d.code}
          </span>
        ))}
      </div>
    ),
  },
  {
    Icon: Cpu,
    title: "AI Multistage Pipeline",
    desc: "Pipeline NLP terstruktur — deteksi dialek, terjemahan NLLB-200, summarization mT5, NER, dan klasifikasi urgensi.",
    accent: "from-blue-500 to-blue-600",
    extra: (
      <div className="flex flex-wrap items-center gap-1 mt-4 text-[10px] text-slate-600">
        {PIPELINE_STEPS.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono font-semibold">
              {s}
            </span>
            {i < PIPELINE_STEPS.length - 1 && <span className="text-slate-400">→</span>}
          </span>
        ))}
      </div>
    ),
  },
  {
    Icon: Shield,
    title: "Aman & Terenkripsi",
    desc: "Otentikasi JWT, data terlindungi, dan privasi pengguna sebagai prioritas utama dalam setiap transaksi.",
    accent: "from-blue-500 to-blue-600",
  },
  {
    Icon: Activity,
    title: "Real-time Tracking",
    desc: "Pantau status aduan Anda secara langsung — dari pengajuan, analisis AI, hingga eksekusi oleh instansi.",
    accent: "from-blue-500 to-blue-600",
  },
  {
    Icon: Map,
    title: "Peta Interaktif",
    desc: "Visualisasi spasial seluruh aduan dengan marker clustering yang ringan dan filter cerdas berbasis urgensi.",
    accent: "from-blue-500 to-blue-600",
  },
  {
    Icon: Smartphone,
    title: "Mobile Friendly",
    desc: "Desain responsif yang nyaman digunakan dari smartphone manapun — di mana pun, kapan pun Anda butuh.",
    accent: "from-blue-500 to-blue-600",
  },
];

export default function FeaturesGrid() {
  return (
    <section
      id="fitur"
      className="relative py-24 lg:py-32 px-6 lg:px-10 bg-white scroll-mt-nav overflow-hidden"
    >
      <div className="absolute top-32 right-0 w-72 h-72 bg-blue-50 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={stagger(0, 0.1)}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <motion.span
            variants={fadeUp}
            className="inline-block text-brand-blue text-xs font-bold uppercase tracking-[0.18em] mb-3"
          >
            Fitur Unggulan
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-brand-navy tracking-tight"
          >
            Dirancang untuk{" "}
            <span className="text-brand-blue">Setiap Warga</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-slate-500 mt-5 text-base lg:text-lg leading-relaxed">
            Enam keunggulan utama yang membuat platform ini menjadi jembatan
            tepercaya antara warga dan pemerintah.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={stagger(0.1, 0.08)}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="group relative bg-white rounded-3xl p-7 border border-slate-100 hover:border-transparent hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300 overflow-hidden"
    >
      {/* Top accent line */}
      <div
        className={`absolute top-0 left-7 right-7 h-1 rounded-b-full bg-gradient-to-r ${feature.accent} opacity-70`}
      />

      {/* Icon */}
      <div
        className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.accent} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
      >
        <feature.Icon className="w-6 h-6 text-white" strokeWidth={2.2} />
      </div>

      <h3 className="font-bold text-brand-navy text-lg mb-2 tracking-tight">
        {feature.title}
      </h3>
      <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
      {feature.extra}
    </motion.div>
  );
}
