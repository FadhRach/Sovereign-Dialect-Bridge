"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import Logo from "@/components/ui/Logo";

interface Props {
  title: React.ReactNode;
  description: string;
  bullets: string[];
  variant?: "login" | "register";
}

const DIALECT_PILLS = [
  { label: "Jawa", color: "bg-amber-300/25 text-amber-100 ring-amber-200/30" },
  { label: "Sunda", color: "bg-emerald-300/25 text-emerald-100 ring-emerald-200/30" },
  { label: "Minang", color: "bg-rose-300/25 text-rose-100 ring-rose-200/30" },
  { label: "Bali", color: "bg-violet-300/25 text-violet-100 ring-violet-200/30" },
];

export default function AuthBrandPanel({
  title,
  description,
  bullets,
  variant = "login",
}: Props) {
  const widthClass =
    variant === "register"
      ? "lg:w-[420px] xl:w-[480px]"
      : "lg:w-[460px] xl:w-[520px]";

  return (
    <aside
      className={`hidden lg:flex ${widthClass} flex-col justify-between p-10 xl:p-12 relative overflow-hidden flex-shrink-0 bg-brand-navy`}
    >
      {/* Layered backgrounds */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-navy via-[#1e3060] to-[#163070]" />
      <div className="absolute inset-0 batik-overlay opacity-[0.07] pointer-events-none" />

      {/* Dotted Indonesia map — faded, decorative */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 0.18, scale: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -bottom-10 -right-20 w-[680px] aspect-[1200/540] pointer-events-none"
      >
        <Image
          src="/indonesia-dotted.svg"
          alt=""
          fill
          priority
          sizes="680px"
          className="object-contain brightness-[3]"
        />
      </motion.div>

      {/* Glow blob */}
      <div className="absolute -top-32 -left-20 w-80 h-80 bg-brand-blue/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 -right-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top: Logo + back link */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="relative flex items-center justify-between gap-3"
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <Logo variant="blue" size="lg" className="group-hover:scale-105 transition-transform" />
          <div className="leading-tight">
            <p className="font-bold text-white text-sm leading-none">
              sovereign
            </p>
            <p className="text-blue-200/70 text-[10px] leading-none mt-0.5">
              dialect bridge
            </p>
          </div>
        </Link>
      </motion.div>

      {/* Middle: Heading + description + bullets + dialect pills */}
      <div className="relative">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl xl:text-4xl font-bold text-white leading-[1.15] mb-4 tracking-tight"
        >
          {title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="text-blue-100/80 text-sm leading-relaxed mb-7 max-w-sm"
        >
          {description}
        </motion.p>

        <motion.ul
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } },
          }}
          className="space-y-3 mb-7"
        >
          {bullets.map((item) => (
            <motion.li
              key={item}
              variants={{
                hidden: { opacity: 0, x: -12 },
                show: { opacity: 1, x: 0 },
              }}
              className="flex items-start gap-2.5"
            >
              <div className="mt-0.5 w-5 h-5 rounded-full bg-brand-accent/20 ring-1 ring-brand-accent/40 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-3 h-3 text-brand-accent" strokeWidth={2.5} />
              </div>
              <span className="text-blue-100/90 text-sm leading-relaxed">{item}</span>
            </motion.li>
          ))}
        </motion.ul>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.85 }}
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-200/60 mr-1">
            12 Dialek:
          </span>
          {DIALECT_PILLS.map((d) => (
            <span
              key={d.label}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${d.color}`}
            >
              {d.label}
            </span>
          ))}
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-blue-100 ring-1 ring-white/15">
            +8
          </span>
        </motion.div>
      </div>

      {/* Bottom: tagline + copyright */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="relative space-y-2"
      >
        <p className="text-blue-100/70 text-xs italic">
          &ldquo;Suara Nusantara, didengar AI.&rdquo;
        </p>
        <p className="text-blue-300/40 text-[11px]">
          © {new Date().getFullYear()} Sovereign Dialect Bridge
        </p>
      </motion.div>
    </aside>
  );
}
