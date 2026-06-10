"use client";

import { motion } from "framer-motion";
import {
  MessageSquare,
  Languages,
  Sparkles,
  LayoutGrid,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { fadeUp, stagger, viewportOnce } from "./motion-helpers";

interface Step {
  num: string;
  Icon: LucideIcon;
  title: string;
  desc: string;
  example: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    num: "01",
    Icon: MessageSquare,
    title: "Tulis Aduan",
    desc: "Warga menyampaikan masalah dalam bahasa daerah sendiri — natural, tanpa perlu menerjemahkan.",
    example: "Dalane rusak banget…",
    accent: "from-blue-500 to-blue-600",
  },
  {
    num: "02",
    Icon: Languages,
    title: "Deteksi Dialek",
    desc: "AI mengidentifikasi otomatis dari 12 dialek Nusantara yang didukung.",
    example: "Jawa terdeteksi 96%",
    accent: "from-blue-500 to-blue-600",
  },
  {
    num: "03",
    Icon: Sparkles,
    title: "Terjemah & Ringkas",
    desc: "Model NLLB menerjemahkan ke Bahasa Indonesia dan meringkas inti masalah.",
    example: "Ringkasan: jalan rusak parah…",
    accent: "from-blue-500 to-blue-600",
  },
  {
    num: "04",
    Icon: LayoutGrid,
    title: "Klasifikasi & Urgensi",
    desc: "Sistem menetapkan kategori, instansi tujuan, dan skor urgensi (Kritis / Tinggi / Sedang / Rendah).",
    example: "Infrastruktur · Tinggi",
    accent: "from-blue-500 to-blue-600",
  },
  {
    num: "05",
    Icon: CheckCircle2,
    title: "Pemerintah Eksekusi",
    desc: "Admin instansi menindaklanjuti aduan, warga memantau status secara real-time.",
    example: "Status: Diproses ✓",
    accent: "from-blue-500 to-blue-600",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="cara-kerja"
      className="relative bg-white py-24 lg:py-32 px-6 lg:px-10 scroll-mt-nav overflow-hidden"
    >
      {/* Decorative blob */}
      <div className="absolute -top-32 -right-24 w-[480px] h-[480px] bg-gradient-to-br from-blue-100/60 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-24 w-[420px] h-[420px] bg-gradient-to-tr from-blue-100/40 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={stagger(0, 0.1)}
          className="text-center max-w-2xl mx-auto mb-16 lg:mb-20"
        >
          <motion.span
            variants={fadeUp}
            className="inline-block text-brand-blue text-xs font-bold uppercase tracking-[0.18em] mb-3"
          >
            Cara Kerja Sistem
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-brand-navy tracking-tight"
          >
            Dari Suara Daerah ke{" "}
            <span className="text-brand-blue">Aksi Pemerintah</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-slate-500 mt-5 text-base lg:text-lg leading-relaxed"
          >
            Lima tahap pipeline AI memproses aduan Anda secara otomatis — dari
            kata pertama yang ditulis hingga eksekusi oleh instansi yang tepat.
          </motion.p>
        </motion.div>

        {/* Mobile: vertical list */}
        <div className="lg:hidden space-y-5">
          {STEPS.map((step, i) => (
            <StepCardMobile key={step.num} step={step} index={i} />
          ))}
        </div>

        {/* Desktop: horizontal flow with connector */}
        <div className="hidden lg:block relative">
          {/* Connector line — animated draw */}
          <svg
            className="absolute top-[80px] left-[8%] right-[8%] w-[84%] h-3 pointer-events-none"
            viewBox="0 0 1000 12"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="connector-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
            </defs>
            <motion.line
              x1="0"
              y1="6"
              x2="1000"
              y2="6"
              stroke="url(#connector-grad)"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={viewportOnce}
              transition={{ duration: 1.6, ease: "easeOut" }}
            />
          </svg>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={stagger(0.2, 0.14)}
            className="relative grid grid-cols-5 gap-4"
          >
            {STEPS.map((step) => (
              <StepCardDesktop key={step.num} step={step} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function StepCardDesktop({ step }: { step: Step }) {
  return (
    <motion.div variants={fadeUp} className="relative group">
      {/* Number ring with icon */}
      <div className="relative flex justify-center mb-6">
        <div className="relative w-[88px] h-[88px]">
          <div
            className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.accent} shadow-lg shadow-blue-900/10 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300`}
          />
          <div className="absolute inset-[3px] rounded-[14px] bg-white flex items-center justify-center">
            <step.Icon
              className="w-7 h-7 text-brand-navy"
              strokeWidth={2}
            />
          </div>
          <div className="absolute -top-2 -right-2 w-7 h-7 bg-brand-navy text-white text-[11px] font-black rounded-full flex items-center justify-center ring-4 ring-white">
            {step.num}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/40 hover:-translate-y-1 transition-all duration-300">
        <h3 className="font-bold text-brand-navy text-base mb-2 leading-snug">
          {step.title}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-4 min-h-[60px]">
          {step.desc}
        </p>
        <div className="text-[11px] font-mono bg-slate-50 text-slate-600 rounded-md px-2.5 py-1.5 border border-slate-100 truncate">
          {step.example}
        </div>
      </div>
    </motion.div>
  );
}

function StepCardMobile({ step, index }: { step: Step; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="flex gap-4 items-start"
    >
      <div className="relative flex-shrink-0 w-14 h-14">
        <div
          className={`absolute inset-0 rounded-xl bg-gradient-to-br ${step.accent} shadow-md`}
        />
        <div className="absolute inset-[2px] rounded-[10px] bg-white flex items-center justify-center">
          <step.Icon className="w-5 h-5 text-brand-navy" strokeWidth={2} />
        </div>
      </div>
      <div className="flex-1 pt-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-brand-blue tracking-wider">
            STEP {step.num}
          </span>
        </div>
        <h3 className="font-bold text-brand-navy text-base mb-1">{step.title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-2">{step.desc}</p>
        <div className="text-[11px] font-mono bg-slate-50 text-slate-600 rounded-md px-2.5 py-1.5 border border-slate-100 inline-block">
          {step.example}
        </div>
      </div>
    </motion.div>
  );
}
