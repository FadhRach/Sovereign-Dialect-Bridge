"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, ChevronDown, Sparkles } from "lucide-react";

const HEADLINE_LINES = ["Sampaikan Aduan", "dalam Bahasa", "Daerahmu"];

const DIALECT_CHIPS = [
  { label: "Jawa", color: "bg-white/25 text-white text-xs font-semibold ring-white/40" },
  { label: "Sunda", color: "bg-white/25 text-white text-xs font-semibold ring-white/40" },
  { label: "Minang", color: "bg-white/25 text-white text-xs font-semibold ring-white/40" },
  { label: "Bali", color: "bg-white/25 text-white text-xs font-semibold ring-white/40" },
  { label: "Batak", color: "bg-white/25 text-white text-xs font-semibold ring-white/40" },
  { label: "Bugis", color: "bg-white/25 text-white text-xs font-semibold ring-white/40" },
];

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const mapY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const headingY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-[100vh] overflow-hidden nusantara-hero-gradient pt-24"
    >
      {/* Batik overlay - very subtle */}
      <div className="absolute inset-0 batik-overlay opacity-[0.05] pointer-events-none" />

      {/* Dotted Indonesia map - background, parallax */}
      <motion.div
        style={{ y: mapY }}
        className="absolute inset-x-0 bottom-0 top-[18%] flex items-end justify-center pointer-events-none map-fade-mask"
      >
        <div className="relative w-full max-w-[1400px] aspect-[1200/540] opacity-[0.55]">
          <Image
            src="/indonesia-dotted.svg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-contain"
          />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ y: headingY, opacity }}
        className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-16 lg:pt-24 pb-32 grid lg:grid-cols-12 gap-10 items-start"
      >
        {/* Headline */}
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-white/25 backdrop-blur-sm border border-white/40 rounded-full px-3.5 py-1.5 mb-7"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-semibold tracking-wide">
              Platform Pengaduan AI · 12 Dialek Nusantara
            </span>
          </motion.div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-[80px] font-bold text-white leading-[1.05] tracking-tight">
            {HEADLINE_LINES.map((line, i) => (
              <motion.span
                key={line}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.2 + i * 0.12,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="block"
              >
                {line}
              </motion.span>
            ))}
          </h1>

          {/* Dialect chips row */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.7 } } }}
            className="mt-7 flex flex-wrap items-center gap-2"
          >
            <span className="text-white/85 text-sm font-medium mr-1">
              Didukung:
            </span>
            {DIALECT_CHIPS.map((d) => (
              <motion.span
                key={d.label}
                variants={{
                  hidden: { opacity: 0, scale: 0.8 },
                  show: { opacity: 1, scale: 1 },
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${d.color}`}
              >
                {d.label}
              </motion.span>
            ))}
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white ring-1 ring-white/30">
              +6 lainnya
            </span>
          </motion.div>
        </div>

        {/* Right column: description + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 lg:pt-12 space-y-7"
        >
          <p className="text-white/90 text-base md:text-lg leading-relaxed max-w-md">
            Platform pengaduan publik berbasis AI untuk warga Indonesia. Tulis
            dalam bahasa Jawa, Sunda, Minang, atau dialek lokal manapun — sistem
            kami memahami dan meneruskan ke pemerintah yang berwenang.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-between gap-3 pl-6 pr-2 py-2 bg-white text-brand-navy rounded-full font-semibold text-base hover:shadow-2xl hover:shadow-blue-900/20 hover:-translate-y-0.5 transition-all group"
            >
              <span>Lapor Sekarang</span>
              <span className="w-9 h-9 rounded-full bg-brand-navy text-white flex items-center justify-center group-hover:rotate-45 transition-transform">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </Link>
            <a
              href="#cara-kerja"
              className="inline-flex items-center justify-center px-6 py-3 text-white font-medium hover:text-white/80 transition-colors"
            >
              Pelajari Cara Kerjanya →
            </a>
          </div>

          {/* Mini stats */}
          <div className="flex items-center gap-6 pt-2">
            <Stat value="12" label="Dialek" />
            <div className="h-8 w-px bg-white/30" />
            <Stat value="AI" label="NLP Pipeline" />
            <div className="h-8 w-px bg-white/30" />
            <Stat value="24/7" label="Realtime" />
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll down indicator */}
      <motion.a
        href="#cara-kerja"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-brand-navy/80 hover:text-brand-navy transition-colors"
        aria-label="Scroll ke bawah"
      >
        <span className="text-xs font-semibold tracking-wider">Scroll Down</span>
        <div className="scroll-bounce">
          <ChevronDown className="w-4 h-4" />
        </div>
      </motion.a>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold text-white leading-none">{value}</span>
      <span className="text-xs text-white/70 mt-1 font-medium tracking-wide">
        {label}
      </span>
    </div>
  );
}
