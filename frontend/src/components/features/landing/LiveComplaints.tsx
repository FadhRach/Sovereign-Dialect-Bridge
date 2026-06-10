"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, ArrowDown, Loader2, Inbox } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import type { MapPoint } from "@/types";
import UrgencyIndicator from "@/components/ui/UrgencyIndicator";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fadeUp, stagger, viewportOnce } from "./motion-helpers";

interface ShowcasePoint extends MapPoint {
  created_at?: string;
}

function timeAgo(iso?: string): string {
  if (!iso) return "Baru saja";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Baru saja";
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} minggu lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LiveComplaints() {
  const { data, isLoading } = useFetch<ShowcasePoint[]>("/api/complaints/map/", {
    errorMessage: "Gagal memuat aduan terbaru.",
  });

  const showcase = useMemo(() => {
    if (!data) return [];
    return [...data]
      .sort((a, b) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bt - at;
      })
      .slice(0, 6);
  }, [data]);

  return (
    <section className="relative py-24 lg:py-28 px-6 lg:px-10 bg-gradient-to-b from-white via-blue-50/30 to-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={stagger(0, 0.1)}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12"
        >
          <div className="max-w-xl">
            <motion.div variants={fadeUp} className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-red-600 text-xs font-bold uppercase tracking-[0.18em]">
                Live · Aduan Terbaru
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-brand-navy tracking-tight"
            >
              Suara{" "}
              <span className="text-brand-blue">Nyata</span> dari Warga
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-500 mt-4 text-base leading-relaxed">
              Aduan publik yang baru masuk ke platform — setiap suara dicatat dan
              ditindaklanjuti.
            </motion.p>
          </div>
          <motion.a
            variants={fadeUp}
            href="#peta-aduan"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-brand-navy font-semibold rounded-full hover:border-brand-blue hover:text-brand-blue hover:shadow-md transition-all self-start lg:self-end"
          >
            Lihat Semua di Peta
            <ArrowDown className="w-4 h-4" />
          </motion.a>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : showcase.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={stagger(0.1, 0.08)}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {showcase.map((point) => (
              <ShowcaseCard key={point.id} point={point} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

function ShowcaseCard({ point }: { point: ShowcasePoint }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      className="group bg-white rounded-2xl border border-slate-200 hover:border-transparent hover:shadow-xl hover:shadow-slate-200/60 transition-all overflow-hidden flex"
    >
      <UrgencyIndicator level={point.urgency_level} variant="strip" />
      <div className="flex-1 p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <UrgencyIndicator level={point.urgency_level} variant="badge" />
          <span className="text-[11px] text-slate-400 font-medium">
            {timeAgo(point.created_at)}
          </span>
        </div>

        <div className="flex items-start gap-2 mb-2">
          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <h3 className="font-bold text-brand-navy text-[15px] leading-snug line-clamp-2">
            {point.wilayah || "Lokasi tidak tersedia"}
          </h3>
        </div>

        <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[40px]">
          {point.category__name
            ? `Kategori: ${point.category__name}`
            : "Belum diklasifikasi"}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <StatusBadge status={point.status} />
          <span className="text-[11px] text-slate-400 font-mono">#{point.id}</span>
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex animate-pulse">
      <div className="w-1 bg-slate-200" />
      <div className="flex-1 p-5 space-y-3">
        <div className="flex justify-between">
          <div className="h-5 w-20 bg-slate-100 rounded-full" />
          <div className="h-4 w-16 bg-slate-100 rounded" />
        </div>
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-4 bg-slate-100 rounded w-2/3 mt-4" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 px-6 bg-white rounded-2xl border border-dashed border-slate-200">
      <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
        <Inbox className="w-6 h-6 text-brand-blue" />
      </div>
      <h3 className="font-bold text-brand-navy text-lg mb-2">
        Belum ada aduan
      </h3>
      <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
        Belum ada aduan yang masuk. Mulailah dengan menyampaikan aduan Anda.
      </p>
      <Link
        href="/register"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white rounded-full font-semibold hover:bg-brand-blueDark transition-colors"
      >
        Daftar & Lapor
      </Link>
    </div>
  );
}
