"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useComplaints } from "@/hooks/useComplaints";
import ComplaintCard from "@/components/complaint/ComplaintCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ErrorAlert from "@/components/shared/ErrorAlert";

export default function DashboardPage() {
  const { fullName } = useAuth();
  const { complaints, isLoading, error, refetch } = useComplaints();

  const counts = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "pending").length,
    in_review: complaints.filter((c) => c.status === "in_review").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Selamat datang, {fullName || "Pengguna"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Pantau semua aduan yang kamu kirimkan</p>
        </div>
        <Link
          href="/submit"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          + Kirim Aduan
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Aduan" value={counts.total} color="gray" />
        <StatCard label="Menunggu" value={counts.pending} color="yellow" />
        <StatCard label="Diproses" value={counts.in_review} color="blue" />
        <StatCard label="Selesai" value={counts.resolved} color="green" />
      </div>

      {/* Complaint list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Aduan Saya</h2>

        {isLoading && (
          <div className="py-16 flex justify-center">
            <LoadingSpinner size="md" label="Memuat aduan..." />
          </div>
        )}

        {error && !isLoading && (
          <ErrorAlert message={error} onDismiss={refetch} />
        )}

        {!isLoading && !error && complaints.length === 0 && (
          <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 text-sm">Kamu belum pernah mengirimkan aduan.</p>
            <Link href="/submit" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
              Kirim aduan pertamamu
            </Link>
          </div>
        )}

        {!isLoading && !error && complaints.length > 0 && (
          <div className="space-y-3">
            {complaints.map((complaint) => (
              <ComplaintCard key={complaint.id} complaint={complaint} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: "gray" | "yellow" | "blue" | "green";
}

const COLOR_CLASSES: Record<StatCardProps["color"], string> = {
  gray: "bg-gray-100 text-gray-700",
  yellow: "bg-yellow-50 text-yellow-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
};

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className={`rounded-xl p-4 ${COLOR_CLASSES[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5">{label}</p>
    </div>
  );
}
