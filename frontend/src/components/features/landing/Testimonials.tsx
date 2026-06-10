"use client";

import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import DialectBadge from "@/components/ui/DialectBadge";
import { fadeUp, stagger, viewportOnce } from "./motion-helpers";

interface Testimonial {
  name: string;
  origin: string;
  dialect: string;
  initials: string;
  avatarBg: string;
  quote: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Sutrisno Hadi",
    origin: "Yogyakarta",
    dialect: "jv",
    initials: "SH",
    avatarBg: "bg-gradient-to-br from-amber-400 to-orange-500",
    quote:
      "Aku iso lapor jalan rusak nganggo basa Jawa, ora perlu nerjemahake dhewe. Sing penting cepet ditanggepi karo dinas.",
    rating: 5,
  },
  {
    name: "Neneng Rohaeti",
    origin: "Bandung",
    dialect: "su",
    initials: "NR",
    avatarBg: "bg-gradient-to-br from-emerald-400 to-teal-500",
    quote:
      "Tiasa nyarios nganggo basa Sunda téh ngajantenkeun pasakit hate téh leuwih kararaos. Hatur nuhun pisan kanggo platform-na.",
    rating: 5,
  },
  {
    name: "Ranti Maharani",
    origin: "Padang",
    dialect: "min",
    initials: "RM",
    avatarBg: "bg-gradient-to-br from-rose-400 to-pink-500",
    quote:
      "Awak bisa mancaliak prosesnyo dari awal sampai tuntas. Transparan, indak ado aduan nan ilang.",
    rating: 5,
  },
  {
    name: "Made Pramana",
    origin: "Denpasar",
    dialect: "ban",
    initials: "MP",
    avatarBg: "bg-gradient-to-br from-violet-400 to-fuchsia-500",
    quote:
      "Tiang prasida ngaturang aduan nganggén basa Bali. Sistem niki nelang-nelang mawinang masyarakat madué suara.",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="relative py-24 lg:py-32 px-6 lg:px-10 bg-slate-50 overflow-hidden scroll-mt-nav">
      {/* Subtle batik pattern */}
      <div className="absolute inset-0 batik-overlay-navy opacity-[0.04] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={stagger(0, 0.1)}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <motion.span
            variants={fadeUp}
            className="inline-block text-brand-blue text-xs font-bold uppercase tracking-[0.18em] mb-3"
          >
            Testimoni Warga
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-brand-navy tracking-tight"
          >
            Suara dari{" "}
            <span className="text-brand-blue">Nusantara</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-slate-500 mt-5 text-base lg:text-lg leading-relaxed">
            Cerita nyata dari warga yang telah menggunakan platform ini di
            daerahnya masing-masing.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={stagger(0.1, 0.1)}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} testimonial={t} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      className="group relative bg-white rounded-3xl p-7 lg:p-8 border border-slate-200/70 hover:border-transparent hover:shadow-2xl hover:shadow-slate-300/30 transition-all overflow-hidden"
    >
      <Quote className="absolute top-5 right-6 w-12 h-12 text-blue-50 group-hover:text-blue-100 transition-colors" />

      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
      </div>

      <p className="text-slate-700 text-base lg:text-[17px] leading-relaxed italic mb-6 relative z-10">
        &ldquo;{testimonial.quote}&rdquo;
      </p>

      <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
        <div
          className={`w-12 h-12 rounded-full ${testimonial.avatarBg} flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white`}
        >
          {testimonial.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-brand-navy text-sm">{testimonial.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">{testimonial.origin}</span>
            <span className="text-slate-300">·</span>
            <DialectBadge code={testimonial.dialect} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
