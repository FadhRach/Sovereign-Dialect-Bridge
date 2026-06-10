"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  PlusSquare, MessageSquare, Clock, Settings, CheckCircle2,
  Sparkles, FileText, MapPinned,
} from "lucide-react";
import { useAuth } from "@/components/features/auth/AuthProvider";
import { useComplaints } from "@/hooks/useComplaints";
import ComplaintCard from "@/components/features/complaint/ComplaintCard";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import SkeletonCard from "@/components/ui/Skeleton";
import { getValidCoordinates } from "@/components/features/map/mapUtils";
import type { Complaint, MapPoint } from "@/types";

const MiniComplaintMap = dynamic(() => import("@/components/features/map/MiniComplaintMap"), {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-2xl bg-blue-50 animate-pulse" />,
});

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

  const mapPoints = useMemo<MapPoint[]>(() => (
    complaints
      .map(buildMapPoint)
      .filter((point): point is MapPoint => point !== null)
      .slice(0, 8)
  ), [complaints]);

  const hasComplaints = complaints.length > 0;
  const hasMappedComplaints = mapPoints.length > 0;
  const mapSubtitle = getMapSubtitle(hasComplaints, hasMappedComplaints);
  const mapEmptyState = getMapEmptyState(hasComplaints);
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

      {!isLoading && !error && (
        <section className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                <MapPinned className="w-4 h-4 text-[#2563EB]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#1E2A4A]">Peta Aduan Saya</p>
                <p className="text-xs text-gray-500">
                  {mapSubtitle}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-gray-500">
              {hasMappedComplaints ? `${mapPoints.length} titik` : hasComplaints ? "Belum ada titik" : "Belum ada aduan"}
            </span>
          </div>
          <div className="relative overflow-hidden rounded-2xl">
            <MiniComplaintMap points={mapPoints} />
            {!hasMappedComplaints && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/75 px-5 text-center backdrop-blur-[1px]">
                <div className="max-w-sm rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-sm">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF]">
                    <MapPinned className="h-5 w-5 text-[#2563EB]" />
                  </div>
                  <p className="text-sm font-bold text-[#1E2A4A]">{mapEmptyState.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    {mapEmptyState.description}
                  </p>
                  <Link
                    href="/submit"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
                  >
                    <PlusSquare className="h-3.5 w-3.5" />
                    Buat aduan dengan titik peta
                  </Link>
                </div>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Dashboard warga hanya menampilkan aduan milik akun ini. Peta seluruh aduan publik/admin tetap dipisah di halaman peta.
          </p>
        </section>
      )}

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

function getMapSubtitle(hasComplaints: boolean, hasMappedComplaints: boolean): string {
  if (!hasComplaints) return "Belum ada aduan untuk ditampilkan di peta.";
  if (!hasMappedComplaints) return "Aduan Anda belum punya titik koordinat yang valid.";
  return "Menampilkan hingga 8 aduan terbaru milik Anda yang punya titik koordinat.";
}

function getMapEmptyState(hasComplaints: boolean): { title: string; description: string } {
  if (!hasComplaints) {
    return {
      title: "Belum ada aduan",
      description: "Setelah membuat aduan dan memilih titik pada peta, lokasinya akan muncul di sini.",
    };
  }

  return {
    title: "Belum ada aduan dengan titik peta",
    description: "Peta memakai koordinat yang tersimpan pada aduan, bukan izin lokasi browser. Aduan lama yang belum punya koordinat tidak akan muncul sebagai titik.",
  };
}

function buildMapPoint(complaint: Complaint): MapPoint | null {
  const coordinates = getValidCoordinates(complaint);
  if (!coordinates) return null;

  return {
    id: complaint.id,
    latitude: coordinates[0],
    longitude: coordinates[1],
    wilayah: complaint.wilayah,
    status: complaint.status,
    urgency_level: complaint.urgency_level,
    category__name: complaint.category?.name ?? null,
  };
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
