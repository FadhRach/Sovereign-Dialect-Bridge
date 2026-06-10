"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import {
  Twitter,
  Instagram,
  Linkedin,
  Github,
  Mail,
  MapPin,
  Heart,
  ArrowUpRight,
} from "lucide-react";

const QUICK_NAV = [
  { label: "Beranda", href: "/" },
  { label: "Cara Kerja", href: "#cara-kerja" },
  { label: "Peta Aduan", href: "#peta-aduan" },
  { label: "Fitur", href: "#fitur" },
  { label: "Kontak", href: "#kontak" },
];

const SUPPORT_LINKS = [
  { label: "Pusat Bantuan", href: "#kontak" },
  { label: "Kebijakan Privasi", href: "#" },
  { label: "Ketentuan Layanan", href: "#" },
  { label: "Tentang Kami", href: "#cara-kerja" },
];

const SOCIAL_LINKS = [
  { Icon: Twitter, href: "#", label: "Twitter" },
  { Icon: Instagram, href: "#", label: "Instagram" },
  { Icon: Linkedin, href: "#", label: "LinkedIn" },
  { Icon: Github, href: "https://github.com", label: "GitHub" },
];

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "fadhlannur007@gmail.com";

export default function LandingFooter() {
  return (
    <footer className="relative bg-brand-navy text-white overflow-hidden">
      <div className="absolute inset-0 batik-overlay opacity-[0.04] pointer-events-none" />
      <div className="absolute -top-32 right-0 w-[480px] h-[480px] bg-gradient-to-bl from-brand-blue/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12"
        >
          {/* Brand */}
          <div className="lg:col-span-1 space-y-5">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <Logo variant="white" size="lg" className="group-hover:scale-105 transition-transform" />
              <div className="leading-tight">
                <p className="font-bold text-base">sovereign</p>
                <p className="text-blue-200/70 text-xs">dialect bridge</p>
              </div>
            </Link>
            <p className="text-sm text-blue-100/70 leading-relaxed">
              Platform pengaduan publik berbasis AI yang menjembatani warga dengan
              pemerintah — dalam 12 dialek Nusantara.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/15 rounded-full text-xs font-medium">
              <Heart className="w-3.5 h-3.5 text-rose-300 fill-rose-300" />
              Dibuat di Indonesia
            </div>
          </div>

          {/* Quick Nav */}
          <FooterColumn title="Navigasi Cepat">
            {QUICK_NAV.map((link) => (
              <FooterLink key={link.label} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          {/* Support & Contact */}
          <FooterColumn title="Bantuan & Kontak">
            {SUPPORT_LINKS.map((link) => (
              <FooterLink key={link.label} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
            <li className="pt-2 space-y-2">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-start gap-2 text-sm text-blue-100/70 hover:text-white transition-colors break-all"
              >
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{CONTACT_EMAIL}</span>
              </a>
              <div className="flex items-start gap-2 text-sm text-blue-100/70">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Jakarta, Indonesia</span>
              </div>
            </li>
          </FooterColumn>

          {/* Social + CTA */}
          <FooterColumn title="Ikuti Kami">
            <li>
              <div className="flex items-center gap-2 mb-5">
                {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white hover:text-brand-navy hover:scale-105 hover:border-transparent transition-all"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </li>
            <li>
              <Link
                href="/register"
                className="inline-flex items-center justify-between gap-2 w-full px-4 py-2.5 bg-brand-blue rounded-xl text-sm font-semibold hover:bg-brand-blueDark transition-colors group"
              >
                <span>Daftar Sekarang</span>
                <ArrowUpRight className="w-4 h-4 group-hover:rotate-45 transition-transform" />
              </Link>
            </li>
            <li className="pt-2">
              <p className="text-xs text-blue-100/60 leading-relaxed">
                Gratis & terbuka untuk seluruh warga Indonesia.
              </p>
            </li>
          </FooterColumn>
        </motion.div>

        {/* Bottom bar */}
        <div className="mt-14 pt-7 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-blue-100/60 text-center md:text-left">
            © {new Date().getFullYear()} Sovereign Dialect Bridge · Suara
            Nusantara, Didengar AI.
          </p>
          <p className="text-xs text-blue-100/50 font-mono tracking-wider">
            v1.0 · NLP Pipeline Aktif
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white mb-5">
        {title}
      </h3>
      <ul className="space-y-3">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        className="text-sm text-blue-100/70 hover:text-white hover:translate-x-0.5 transition-all inline-block"
      >
        {children}
      </a>
    </li>
  );
}
