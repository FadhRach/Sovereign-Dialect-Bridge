"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Logo from "@/components/ui/Logo";

const NAV_LINKS = [
  { href: "#cara-kerja", label: "Cara Kerja" },
  { href: "#peta-aduan", label: "Peta Aduan" },
  { href: "#fitur", label: "Fitur" },
  { href: "#kontak", label: "Kontak" },
];

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/85 backdrop-blur-lg border-b border-slate-200/70 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.18)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Logo variant="white" size="md" className="group-hover:scale-105 transition-transform" />
          <span
            className={`text-sm font-medium tracking-tight transition-colors ${
              scrolled ? "text-brand-navy" : "text-white"
            }`}
          >
            sovereign dialect bridge
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                scrolled
                  ? "text-slate-600 hover:text-brand-blue hover:bg-blue-50"
                  : "text-white/85 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${
              scrolled
                ? "text-brand-navy hover:bg-slate-100"
                : "text-white hover:bg-white/10"
            }`}
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold px-5 py-2 bg-white text-brand-navy rounded-full hover:bg-blue-50 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            Daftar
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
