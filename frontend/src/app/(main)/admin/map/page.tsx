"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MapPin, Filter, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/features/auth/AuthProvider";
import api from "@/lib/api";
import AdminShell from "@/components/layout/AdminSidebar";
import Spinner from "@/components/ui/Spinner";
import type { MapPoint, ApiResponse, UrgencyLevel } from "@/types";

const ComplaintMap = dynamic(() => import("@/components/features/map/ComplaintMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-200px)] bg-gray-100 rounded-2xl flex items-center justify-center">
      <Spinner size="lg" label="Memuat peta..." />
    </div>
  ),
});

const URGENCY_OPTIONS: { value: UrgencyLevel; label: string; color: string }[] = [
  { value: "critical", label: "Kritis", color: "#E24B4A" },
  { value: "high", label: "Tinggi", color: "#EF9F27" },
  { value: "medium", label: "Sedang", color: "#639922" },
  { value: "low", label: "Rendah", color: "#888780" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Menunggu" },
  { value: "in_review", label: "Ditinjau" },
  { value: "in_progress", label: "Diproses" },
  { value: "resolved", label: "Selesai" },
];

export default function AdminMapPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [filterOpen, setFilterOpen] = useState(true);

  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const [urgencyFilters, setUrgencyFilters] = useState<Set<UrgencyLevel>>(
    new Set<UrgencyLevel>(["critical", "high", "medium", "low"])
  );
  const [statusFilters, setStatusFilters] = useState<Set<string>>(
    new Set(["pending", "in_review", "in_progress", "resolved"])
  );

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/dashboard");
  }, [authLoading, isAdmin, router]);

  const fetchMap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<MapPoint[]>>("/api/complaints/map/");
      setPoints(res.data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMap(); }, [fetchMap]);

  const filteredPoints = points.filter(
    (p) => urgencyFilters.has(p.urgency_level) && statusFilters.has(p.status)
  );

  function toggleUrgency(u: UrgencyLevel) {
    setUrgencyFilters((s) => {
      const next = new Set(s);
      if (next.has(u)) next.delete(u);
      else next.add(u);
      return next;
    });
  }

  function toggleStatus(s: string) {
    setStatusFilters((cur) => {
      const next = new Set(cur);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" label="Memuat..." />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <AdminShell
      title="Peta Sebaran Aduan"
      subtitle={`${filteredPoints.length} dari ${points.length} aduan dengan koordinat`}
    >
        <div className="p-4 lg:p-6 flex items-center justify-end lg:hidden">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Filter className="w-3.5 h-3.5" />
            {filterOpen ? "Tutup Filter" : "Buka Filter"}
          </button>
        </div>

        <div className="p-4 lg:p-6 lg:pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            {/* Map */}
            <div className="relative">
              {loading ? (
                <div className="h-[calc(100vh-200px)] bg-gray-100 rounded-2xl flex items-center justify-center">
                  <Spinner size="lg" label="Memuat data peta..." />
                </div>
              ) : filteredPoints.length === 0 && points.length > 0 ? (
                <div className="h-[calc(100vh-200px)] bg-white rounded-2xl border border-gray-100 flex items-center justify-center">
                  <div className="text-center max-w-xs">
                    <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="w-6 h-6 text-amber-600" />
                    </div>
                    <p className="text-sm font-semibold text-[#1E2A4A]">Tidak ada aduan sesuai filter</p>
                    <p className="text-xs text-gray-500 mt-1">Sesuaikan filter di samping untuk melihat aduan lain.</p>
                  </div>
                </div>
              ) : points.length === 0 ? (
                <div className="h-[calc(100vh-200px)] bg-white rounded-2xl border border-gray-100 flex items-center justify-center">
                  <div className="text-center max-w-xs">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-[#1E2A4A]">Belum ada aduan dengan koordinat</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Aduan akan muncul di peta saat pelapor memberikan koordinat lokasi.
                    </p>
                  </div>
                </div>
              ) : (
                <ComplaintMap points={filteredPoints} />
              )}
            </div>

            {/* Filter panel */}
            <aside
              className={`${
                filterOpen ? "block" : "hidden"
              } lg:block bg-white rounded-2xl border border-gray-100 p-5 space-y-5 h-fit lg:sticky lg:top-32`}
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-3.5 h-3.5 text-[#2563EB]" />
                  <h3 className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider">Filter Urgensi</h3>
                </div>
                <div className="space-y-2">
                  {URGENCY_OPTIONS.map((u) => (
                    <label
                      key={u.value}
                      className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 -m-1.5 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={urgencyFilters.has(u.value)}
                        onChange={() => toggleUrgency(u.value)}
                        className="w-4 h-4 accent-[#2563EB]"
                      />
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                        style={{ backgroundColor: u.color }}
                      />
                      <span className="text-sm text-gray-700 flex-1">{u.label}</span>
                      <span className="text-xs text-gray-400 font-medium">
                        {points.filter((p) => p.urgency_level === u.value).length}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-3.5 h-3.5 text-[#2563EB]" />
                  <h3 className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider">Filter Status</h3>
                </div>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((s) => (
                    <label
                      key={s.value}
                      className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 -m-1.5 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={statusFilters.has(s.value)}
                        onChange={() => toggleStatus(s.value)}
                        className="w-4 h-4 accent-[#2563EB]"
                      />
                      <span className="text-sm text-gray-700 flex-1">{s.label}</span>
                      <span className="text-xs text-gray-400 font-medium">
                        {points.filter((p) => p.status === s.value).length}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider mb-3">Legenda Warna</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Warna marker menunjukkan tingkat urgensi aduan. Marker kritis selalu tampil di atas. Klik marker untuk lihat detail.
                </p>
              </div>
            </aside>
          </div>
        </div>
    </AdminShell>
  );
}
