"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  PlusSquare, MessageSquare, Clock, Settings, CheckCircle2,
  Sparkles, FileText,
} from "lucide-react";
import { useAuth } from "@/components/features/auth/AuthProvider";
import { useComplaints } from "@/hooks/useComplaints";
import ComplaintCard from "@/components/features/complaint/ComplaintCard";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import SkeletonCard from "@/components/ui/Skeleton";

const TABS: { key: string; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "pending", label: "Menunggu" },
  { key: "in_progress", label: "Diproses" },
  { key: "resolved", label: "Selesai" },
];

export default function DashboardPage() {
  const { fullName } = useAuth();
  const { complaints, isLoading, error, refetch } = useComplaints();
  const [tab, setTab] = useState("all");

  const counts = useMemo(() => ({
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "pending").length,
    in_progress: complaints.filter((c) => c.status === "in_progress" || c.status === "in_review").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  }), [complaints]);

  const filtered = useMemo(() => {
    if (tab === "all") return complaints;
    if (tab === "in_progress") return complaints.filter((c) => c.status === "in_progress" || c.status === "in_review");
    return complaints.filter((c) => c.status === tab);
  }, [complaints, tab]);

  const firstName = fullName?.split(" ")[0] ?? "Pengguna";

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Welcome banner */}
      <div className="relative bg-gradient-to-br from-[#1E2A4A] to-[#2563EB] rounded-2xl p-5 sm:p-6 mb-6 overflow-hidden shadow-lg shadow-blue-200/30">
        <div className="absolute inset-0 batik-overlay opacity-[0.08] pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#60A5FA] rounded-full opacity-20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/15 ring-1 ring-white/20 rounded-full px-3 py-1 mb-2">
              <Sparkles className="w-3 h-3 text-[#60A5FA]" />
              <span className="text-blue-100 text-[10px] font-semibold uppercase tracking-wider">Halo Warga</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Selamat datang, {firstName}
            </h1>
            <p className="text-sm text-blue-100/80 mt-1">
              Pantau semua aduan yang Anda kirim — AI bekerja otomatis di belakang layar.
            </p>
          </div>
          <Link
            href="/submit"
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[#1E2A4A] text-sm font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-md"
          >
            <PlusSquare className="w-4 h-4" />
            Buat Aduan Baru
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Aduan" value={counts.total} Icon={MessageSquare} color="blue" />
        <StatCard label="Menunggu" value={counts.pending} Icon={Clock} color="amber" />
        <StatCard label="Diproses" value={counts.in_progress} Icon={Settings} color="indigo" />
        <StatCard label="Selesai" value={counts.resolved} Icon={CheckCircle2} color="emerald" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-1.5 mb-4 inline-flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              tab === t.key
                ? "bg-[#2563EB] text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Complaint list */}
      {isLoading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {error && !isLoading && <Alert message={error} onDismiss={refetch} />}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <div className="w-16 h-16 bg-[#EFF6FF] rounded-2xl mx-auto flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-[#2563EB]" />
          </div>
          {complaints.length === 0 ? (
            <>
              <p className="text-sm font-semibold text-[#1E2A4A]">Belum ada aduan</p>
              <p className="text-xs text-gray-500 mt-1 mb-4 max-w-xs mx-auto">
                Sampaikan keluhan pertama Anda — boleh dalam bahasa daerah, AI akan memahami.
              </p>
              <Link
                href="/submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl transition-colors"
              >
                <PlusSquare className="w-3.5 h-3.5" />
                Buat Aduan Pertama
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#1E2A4A]">Tidak ada aduan di kategori ini</p>
              <p className="text-xs text-gray-500 mt-1">Coba pilih tab lain di atas.</p>
            </>
          )}
        </div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  Icon: React.ElementType;
  color: "blue" | "amber" | "indigo" | "emerald";
}

const STAT_COLORS: Record<StatCardProps["color"], { bg: string; icon: string; text: string }> = {
  blue:    { bg: "bg-blue-50",    icon: "text-blue-600",    text: "text-blue-700" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   text: "text-amber-700" },
  indigo:  { bg: "bg-indigo-50",  icon: "text-indigo-600",  text: "text-indigo-700" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", text: "text-emerald-700" },
};

function StatCard({ label, value, Icon, color }: StatCardProps) {
  const c = STAT_COLORS[color];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all">
      <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${c.icon}`} />
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
    </div>
  );
}
