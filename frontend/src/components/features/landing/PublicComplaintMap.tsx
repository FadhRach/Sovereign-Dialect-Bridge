"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, Loader2 } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import type { MapPoint, UrgencyLevel } from "@/types";
import { fadeUp, viewportOnce } from "./motion-helpers";

const ComplaintMap = dynamic(() => import("@/components/features/map/ComplaintMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[540px] w-full rounded-2xl bg-blue-50 flex items-center justify-center">
      <Loader2 className="w-7 h-7 text-brand-blue animate-spin" />
    </div>
  ),
});

type Filter = "all" | UrgencyLevel;

const FILTERS: { value: Filter; label: string; dotColor: string }[] = [
  { value: "all", label: "Semua", dotColor: "bg-brand-blue" },
  { value: "critical", label: "Kritis", dotColor: "bg-red-500" },
  { value: "high", label: "Tinggi", dotColor: "bg-orange-500" },
  { value: "medium", label: "Sedang", dotColor: "bg-amber-500" },
  { value: "low", label: "Rendah", dotColor: "bg-slate-400" },
];

export default function PublicComplaintMap() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading } = useFetch<MapPoint[]>("/api/complaints/map/", {
    errorMessage: "Gagal memuat data peta.",
  });

  const allPoints = useMemo(() => data || [], [data]);

  const filteredPoints = useMemo(() => {
    if (filter === "all") return allPoints;
    return allPoints.filter((p) => p.urgency_level === filter);
  }, [allPoints, filter]);

  return (
    <section
      id="peta-aduan"
      className="relative py-24 lg:py-28 px-6 lg:px-10 bg-gradient-to-b from-slate-50 via-white to-slate-50 scroll-mt-nav overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10"
        >
          <div className="max-w-xl">
            <motion.span
              variants={fadeUp}
              className="inline-block text-brand-blue text-xs font-bold uppercase tracking-[0.18em] mb-3"
            >
              Peta Interaktif
            </motion.span>
            <motion.h2
              variants={fadeUp}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-brand-navy tracking-tight"
            >
              Aduan Warga di{" "}
              <span className="text-brand-blue">Seluruh Indonesia</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-slate-500 mt-4 text-base leading-relaxed"
            >
              Visualisasi spasial seluruh aduan publik — klik marker untuk detail,
              filter berdasarkan urgensi.
            </motion.p>
          </div>

          <motion.div
            variants={fadeUp}
            className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-3.5 shadow-sm"
          >
            <div className="text-3xl font-black text-brand-navy tracking-tight">
              {allPoints.length.toLocaleString("id-ID")}
            </div>
            <div className="text-xs text-slate-500 leading-tight">
              Aduan
              <br />
              tercatat
            </div>
          </motion.div>
        </motion.div>

        {/* Filter chips */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap items-center gap-2 mb-5"
        >
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  active
                    ? "bg-brand-navy text-white shadow-md"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${f.dotColor}`} />
                {f.label}
                {f.value !== "all" && (
                  <span className={`text-[11px] ${active ? "opacity-70" : "opacity-60"}`}>
                    {allPoints.filter((p) => p.urgency_level === f.value).length}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xl shadow-slate-200/40 bg-white"
        >
          {isLoading ? (
            <div className="h-[540px] flex items-center justify-center bg-blue-50">
              <Loader2 className="w-7 h-7 text-brand-blue animate-spin" />
            </div>
          ) : allPoints.length === 0 ? (
            <EmptyState />
          ) : (
            <ComplaintMap points={filteredPoints} height="540px" />
          )}
        </motion.div>

        {filteredPoints.length === 0 && allPoints.length > 0 && (
          <p className="text-center text-sm text-slate-500 mt-4">
            Tidak ada aduan dengan urgensi{" "}
            <span className="font-semibold">{filter}</span>.
          </p>
        )}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="h-[540px] flex flex-col items-center justify-center text-center px-6 bg-gradient-to-b from-blue-50/50 to-white">
      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
        <MapPin className="w-7 h-7 text-brand-blue" />
      </div>
      <h3 className="text-xl font-bold text-brand-navy mb-2">
        Belum Ada Aduan
      </h3>
      <p className="text-slate-500 max-w-md mb-6">
        Jadilah yang pertama menyampaikan aduan dari daerah Anda. Suara Anda
        penting untuk perubahan.
      </p>
      <Link
        href="/register"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white rounded-full font-semibold hover:bg-brand-blueDark transition-colors"
      >
        Lapor Sekarang
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
