"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Mail, MapPin, Clock, Send, ArrowUpRight } from "lucide-react";
import { fadeUp, stagger, viewportOnce, slideInLeft, slideInRight } from "./motion-helpers";

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "fadhlannur007@gmail.com";

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const INITIAL_STATE: FormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export default function ContactSection() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);

  const mailtoUrl = useMemo(() => {
    const subject = encodeURIComponent(
      form.subject || "Saran & Masukan — Sovereign Dialect Bridge"
    );
    const body = encodeURIComponent(
      `Halo Tim Sovereign Dialect Bridge,\n\n${form.message}\n\n— ${form.name}\n${form.email}`
    );
    return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }, [form]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Mohon lengkapi nama, email, dan pesan Anda.");
      return;
    }
    setError(null);
    window.location.href = mailtoUrl;
  }

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <section
      id="kontak"
      className="relative py-24 lg:py-32 px-6 lg:px-10 bg-white scroll-mt-nav overflow-hidden"
    >
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-blue-50 to-transparent rounded-full blur-3xl pointer-events-none" />

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
            Hubungi Kami
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-brand-navy tracking-tight"
          >
            Punya{" "}
            <span className="text-brand-blue">Saran atau Pertanyaan</span>?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-slate-500 mt-5 text-base lg:text-lg leading-relaxed">
            Tim kami siap mendengarkan. Kirim pesan langsung ke inbox kami, atau
            sapa kami lewat kanal di samping.
          </motion.p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Left: Info */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={slideInLeft}
            className="lg:col-span-2 space-y-4"
          >
            <InfoCard
              Icon={Mail}
              title="Email"
              value={CONTACT_EMAIL}
              href={`mailto:${CONTACT_EMAIL}`}
              accent="from-blue-500 to-blue-600"
            />
            <InfoCard
              Icon={MapPin}
              title="Lokasi"
              value="Jakarta, Indonesia"
              accent="from-blue-500 to-blue-600"
            />
            <InfoCard
              Icon={Clock}
              title="Jam Respon"
              value="Senin – Jumat, 09.00 – 17.00 WIB"
              accent="from-blue-500 to-blue-600"
            />

            <div className="relative mt-8 rounded-2xl bg-gradient-to-br from-brand-navy to-brand-blue p-6 text-white overflow-hidden">
              <div className="absolute inset-0 batik-overlay opacity-[0.08] pointer-events-none" />
              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-200 mb-2">
                  Suara Nusantara
                </p>
                <p className="text-lg font-bold leading-snug">
                  Setiap aduan adalah jembatan
                  <br />
                  menuju Indonesia yang lebih baik.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right: Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={slideInRight}
            className="lg:col-span-3 bg-white rounded-3xl p-7 lg:p-9 border border-slate-200 shadow-xl shadow-slate-200/40"
          >
            <div className="grid sm:grid-cols-2 gap-5 mb-5">
              <Field
                label="Nama"
                value={form.name}
                onChange={(v) => update("name", v)}
                placeholder="Nama lengkap"
                required
              />
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => update("email", v)}
                placeholder="nama@email.com"
                required
              />
            </div>
            <Field
              label="Subjek"
              value={form.subject}
              onChange={(v) => update("subject", v)}
              placeholder="Saran fitur, kritik, pertanyaan…"
              className="mb-5"
            />
            <div className="mb-5">
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Pesan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder="Tulis pesan Anda di sini…"
                rows={5}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-brand-navy placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-blue-100 transition-all resize-none"
              />
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-xs text-slate-400">
                Tombol kirim akan membuka aplikasi email Anda.
              </p>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-navy text-white rounded-full font-semibold text-sm hover:bg-brand-blue hover:shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
                Kirim Pesan
                <ArrowUpRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.form>
        </div>
      </div>
    </section>
  );
}

function InfoCard({
  Icon,
  title,
  value,
  href,
  accent,
}: {
  Icon: React.ElementType;
  title: string;
  value: string;
  href?: string;
  accent: string;
}) {
  const content = (
    <div className="group flex items-start gap-4 p-5 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 hover:shadow-md transition-all">
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
      >
        <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400 mb-1">
          {title}
        </p>
        <p className="text-brand-navy font-semibold text-sm break-all">
          {value}
        </p>
      </div>
    </div>
  );
  if (href) return <a href={href}>{content}</a>;
  return content;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-brand-navy mb-2">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-brand-navy placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-blue-100 transition-all"
      />
    </div>
  );
}
