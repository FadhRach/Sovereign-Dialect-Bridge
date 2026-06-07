"use client";

/**
 * Admin dashboard — halaman utama untuk pemerintah.
 *
 * Ini orchestrator: fetch data + state filter/sort, lalu compose sub-component
 * dari _components/. Logic chart/table/modal sengaja dipisah supaya file ini
 * tetap ringkas dan mudah dipahami.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare, TrendingUp, AlertTriangle,
  Clock, CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/components/features/auth/AuthProvider";
import api from "@/lib/api";
import AdminShell from "@/components/layout/AdminSidebar";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import type { Complaint, DashboardStats, ApiResponse } from "@/types";

import StatCard from "./_components/StatCard";
import AdminFilters from "./_components/AdminFilters";
import AdminComplaintTable from "./_components/AdminComplaintTable";
import { WeeklyTrendChart, CategoryDonut } from "./_components/AdminCharts";
import QuickReviewModal from "./_components/QuickReviewModal";
import { URGENCY_ORDER, type SortKey } from "./_components/constants";

export default function AdminPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [dialectFilter, setDialectFilter] = useState("");
  const [search, setSearch] = useState("");

  // Sort + modal state
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [quickReviewId, setQuickReviewId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/dashboard");
  }, [authLoading, isAdmin, router]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get<ApiResponse<DashboardStats>>("/api/dashboard/stats/");
      setStats(res.data.data);
    } catch {
      setError("Gagal memuat statistik.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchComplaints = useCallback(async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (urgencyFilter) params.set("urgency", urgencyFilter);
      if (dialectFilter) params.set("dialect", dialectFilter);
      if (search) params.set("search", search);
      const res = await api.get<ApiResponse<Complaint[]>>(`/api/complaints/?${params}`);
      setComplaints(res.data.data ?? []);
    } catch {
      setError("Gagal memuat aduan.");
    } finally {
      setListLoading(false);
    }
  }, [statusFilter, urgencyFilter, dialectFilter, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const sortedComplaints = useMemo(() => {
    const arr = [...complaints];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "urgency_level") {
        cmp = URGENCY_ORDER[a.urgency_level] - URGENCY_ORDER[b.urgency_level];
      } else if (sortKey === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        const av = (a as unknown as Record<string, string>)[sortKey] ?? "";
        const bv = (b as unknown as Record<string, string>)[sortKey] ?? "";
        cmp = av.localeCompare(bv);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [complaints, sortKey, sortDir]);

  const activeFilterCount = [statusFilter, urgencyFilter, dialectFilter, search].filter(Boolean).length;

  function resetFilters() {
    setStatusFilter("");
    setUrgencyFilter("");
    setDialectFilter("");
    setSearch("");
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "urgency_level" || key === "created_at" ? "desc" : "asc");
    }
  }

  async function handleExportCsv() {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (urgencyFilter) params.set("urgency", urgencyFilter);
      if (dialectFilter) params.set("dialect", dialectFilter);
      if (search) params.set("search", search);
      const res = await api.get(`/api/complaints/export/?${params}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aduan-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Gagal mengunduh CSV.");
    }
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
    <AdminShell title="Admin Dashboard" subtitle="Pantau & kelola semua aduan masuk">
      <div className="p-4 lg:p-6 space-y-6">
        {error && <Alert message={error} onDismiss={() => setError(null)} />}

        {/* Stat cards (clickable filter) */}
        {statsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Total Aduan" value={stats.total} Icon={MessageSquare} color="blue"
              onClick={resetFilters} active={activeFilterCount === 0} />
            <StatCard label="Menunggu" value={stats.pending} Icon={Clock} color="amber"
              onClick={() => setStatusFilter("pending")} active={statusFilter === "pending"} />
            <StatCard label="Diproses" value={stats.in_progress + stats.in_review} Icon={TrendingUp} color="indigo"
              onClick={() => setStatusFilter("in_progress")} active={statusFilter === "in_progress"} />
            <StatCard label="Selesai" value={stats.resolved} Icon={CheckCircle2} color="emerald"
              onClick={() => setStatusFilter("resolved")} active={statusFilter === "resolved"} />
            <StatCard label="Kritis" value={stats.critical} Icon={AlertTriangle} color="red"
              onClick={() => setUrgencyFilter("critical")} active={urgencyFilter === "critical"}
              highlight={stats.critical > 0} />
          </div>
        ) : null}

        {/* Charts row */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <WeeklyTrendChart weekly={stats.weekly_trend} />
            <CategoryDonut categories={stats.by_category} />
          </div>
        )}

        {/* Filter + table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <AdminFilters
            statusFilter={statusFilter}
            urgencyFilter={urgencyFilter}
            dialectFilter={dialectFilter}
            search={search}
            onStatusChange={setStatusFilter}
            onUrgencyChange={setUrgencyFilter}
            onDialectChange={setDialectFilter}
            onSearchChange={setSearch}
            onReset={resetFilters}
            onExportCsv={handleExportCsv}
          />
          <AdminComplaintTable
            complaints={sortedComplaints}
            isLoading={listLoading}
            sortKey={sortKey}
            sortDir={sortDir}
            activeFilterCount={activeFilterCount}
            onSort={toggleSort}
            onRowClick={setQuickReviewId}
            onResetFilters={resetFilters}
          />
        </div>
      </div>

      {/* Quick review slide-in */}
      {quickReviewId && (
        <QuickReviewModal
          id={quickReviewId}
          onClose={() => setQuickReviewId(null)}
          onUpdated={() => { fetchComplaints(); fetchStats(); }}
        />
      )}
    </AdminShell>
  );
}
