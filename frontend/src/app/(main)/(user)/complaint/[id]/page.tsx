"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, MapPin, Calendar, Sparkles, Image as ImageIcon,
  CheckCircle2, Loader2, Save, AlertCircle, Trash2,
} from "lucide-react";
import { useAuth } from "@/components/features/auth/AuthProvider";
import { useComplaintDetail } from "@/hooks/useComplaints";
import api from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import UrgencyIndicator from "@/components/ui/UrgencyIndicator";
import NLPResultCard from "@/components/features/complaint/NLPResultCard";
import NLPProgress from "@/components/features/complaint/NLPProgress";
import StatusTimeline from "@/components/features/complaint/StatusTimeline";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { buildGoogleMapsUrl, getValidCoordinates } from "@/components/features/map/mapUtils";
import type { ApiResponse, Complaint, ComplaintStatus, MapPoint } from "@/types";

const MiniComplaintMap = dynamic(() => import("@/components/features/map/MiniComplaintMap"), {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-2xl bg-blue-50 animate-pulse" />,
});

const ADMIN_STATUS_OPTIONS: { value: ComplaintStatus; label: string }[] = [
  { value: "pending", label: "Menunggu" },
  { value: "in_review", label: "Ditinjau" },
  { value: "in_progress", label: "Diproses" },
  { value: "resolved", label: "Selesai" },
  { value: "rejected", label: "Ditolak" },
];

export default function ComplaintDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { complaint, isLoading, error, refetch } = useComplaintDetail(id);
  const [newBanner, setNewBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("new=1")) {
      setNewBanner(true);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" label="Memuat aduan..." />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Alert message={error || "Aduan tidak ditemukan."} />
        <Link href={isAdmin ? "/admin" : "/dashboard"} className="text-sm text-[#2563EB] mt-4 inline-block">
          ← Kembali
        </Link>
      </div>
    );
  }

  const submittedAt = new Date(complaint.created_at).toLocaleString("id-ID", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const locationPoint = buildMapPoint(complaint);

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <Link
        href={isAdmin ? "/admin" : "/dashboard"}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1E2A4A] mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke {isAdmin ? "Admin Dashboard" : "Dashboard"}
      </Link>

      {newBanner && (
        <div className="mb-5 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white p-4 flex items-center gap-3 shadow-lg shadow-blue-200/50">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Aduan berhasil dikirim!</p>
            <p className="text-xs text-blue-100/90 mt-0.5">
              AI sedang menganalisis. Halaman ini akan refresh otomatis saat hasil siap.
            </p>
          </div>
          <button onClick={() => setNewBanner(false)} className="text-white/70 hover:text-white text-xs font-semibold">
            Tutup
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Aduan #{complaint.id}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1E2A4A]">{complaint.wilayah}</h1>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {submittedAt}
              </span>
              {isAdmin && complaint.user && (
                <span>
                  oleh <span className="font-semibold text-[#1E2A4A]">{complaint.user.full_name}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <StatusBadge status={complaint.status} />
            {complaint.category && (
              <span className="text-xs text-gray-500">
                Kategori: <span className="font-semibold text-[#2563EB]">{complaint.category.name}</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <UrgencyIndicator level={complaint.urgency_level} variant="full" />
          <InfoTile
            label="Status"
            value={statusLabel(complaint.status)}
            sublabel={complaint.resolved_at ? "Diselesaikan " + new Date(complaint.resolved_at).toLocaleDateString("id-ID") : "Sedang berjalan"}
          />
          <InfoTile
            label="Dialek"
            value={complaint.detected_dialect === "xx" ? "Tidak terdeteksi" : complaint.detected_dialect.toUpperCase()}
            sublabel={`Confidence ${Math.round(complaint.nlp_confidence * 100)}%`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Original text */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-[#1E2A4A] mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-[#2563EB] rounded-full" />
              Cerita Asli dari Pelapor
            </h2>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line bg-gray-50 rounded-xl p-4">
              {complaint.original_text}
            </p>
          </section>

          {/* Photo */}
          {complaint.photo_url && (
            <section className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-[#1E2A4A] mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#2563EB]" />
                Foto Pendukung
              </h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={complaint.photo_url}
                alt="Foto aduan"
                className="rounded-xl w-full max-h-96 object-contain bg-gray-100"
              />
            </section>
          )}

          {/* NLP progress / result */}
          {complaint.processing_stage !== "done" && complaint.processing_stage !== "failed" ? (
            <NLPProgress stage={complaint.processing_stage} />
          ) : complaint.processing_stage === "failed" ? (
            <NLPProgress stage="failed" errorMessage={complaint.processing_error} />
          ) : (
            <NLPResultCard complaint={complaint} />
          )}

          {/* Location */}
          {locationPoint && (
            <section className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-[#1E2A4A] mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#2563EB]" />
                Lokasi Aduan
              </h2>
              <MiniComplaintMap points={[locationPoint]} height="220px" />
              <a
                href={buildGoogleMapsUrl(locationPoint.latitude, locationPoint.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm text-[#2563EB] hover:text-[#1D4ED8] font-medium"
              >
                {locationPoint.latitude.toFixed(5)}, {locationPoint.longitude.toFixed(5)}
                <span className="text-xs text-gray-400">(Buka Google Maps)</span>
              </a>
            </section>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {isAdmin && (
            <>
              <AdminActionPanel complaint={complaint} onUpdated={refetch} />
              <AdminDeleteComplaintPanel complaint={complaint} onDeleted={() => router.replace("/admin")} />
            </>
          )}
          {!isAdmin && complaint.status === "pending" && (
            <CancelComplaintPanel complaint={complaint} onCancelled={() => router.replace("/dashboard")} />
          )}

          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-[#1E2A4A] mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-[#2563EB] rounded-full" />
              Riwayat Tindak Lanjut
            </h2>
            <StatusTimeline
              history={complaint.status_history ?? []}
              notes={complaint.admin_notes ?? []}
              createdAt={complaint.created_at}
            />
          </section>
        </div>
      </div>
    </div>
  );
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

function statusLabel(status: ComplaintStatus): string {
  return ADMIN_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

function InfoTile({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-[#1E2A4A] mt-1 truncate">{value}</p>
      {sublabel && <p className="text-[10px] text-gray-500 mt-0.5">{sublabel}</p>}
    </div>
  );
}

function CancelComplaintPanel({ complaint, onCancelled }: { complaint: Complaint; onCancelled: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function cancelComplaint() {
    setLoading(true);
    setError(null);
    try {
      await api.delete<ApiResponse<null>>(`/api/complaints/${complaint.id}/`);
      onCancelled();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Gagal membatalkan aduan.");
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-red-100 p-5">
      <h2 className="text-sm font-bold text-[#1E2A4A] mb-2 flex items-center gap-2">
        <Trash2 className="w-4 h-4 text-red-500" />
        Batalkan Aduan
      </h2>
      <p className="text-xs text-gray-500 leading-relaxed mb-3">
        Aduan masih menunggu peninjauan, jadi Anda masih bisa membatalkannya. Admin akan mendapat notifikasi.
      </p>
      {error && (
        <div className="mb-3 flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        {loading ? "Membatalkan..." : "Batalkan Aduan"}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Batalkan aduan ini?"
        description="Aduan akan dihapus dari daftar aktif dan admin akan menerima notifikasi bahwa aduan dibatalkan. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Batalkan aduan"
        cancelLabel="Tetap simpan"
        loading={loading}
        variant="danger"
        onConfirm={cancelComplaint}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}

function AdminActionPanel({ complaint, onUpdated }: { complaint: Complaint; onUpdated: () => void }) {
  const [newStatus, setNewStatus] = useState<ComplaintStatus>(complaint.status);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needsNote = newStatus === "resolved" || newStatus === "rejected";
  const noChange = newStatus === complaint.status && !note.trim();

  async function handleSave() {
    setError(null);
    if (needsNote && !note.trim()) {
      setError("Catatan wajib diisi untuk status Selesai atau Ditolak.");
      return;
    }
    setSaving(true);
    try {
      await api.patch<ApiResponse<Complaint>>(`/api/complaints/${complaint.id}/`, {
        status: newStatus,
        note: note.trim() || undefined,
      });
      setSavedAt(Date.now());
      setNote("");
      onUpdated();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="text-sm font-bold text-[#1E2A4A] mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-[#2563EB] rounded-full" />
        Tindak Lanjut
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ubah Status</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
          >
            {ADMIN_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Catatan {needsNote && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={needsNote ? "Jelaskan alasan keputusan..." : "Catatan tambahan (opsional)"}
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-gray-50 placeholder:text-gray-400 resize-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {savedAt && Date.now() - savedAt < 5000 && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Perubahan tersimpan.</span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || noChange}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Perubahan
        </button>
      </div>
    </section>
  );
}

function AdminDeleteComplaintPanel({ complaint, onDeleted }: { complaint: Complaint; onDeleted: () => void }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function deleteComplaint() {
    const cleanedReason = reason.trim();
    setError(null);
    if (cleanedReason.length < 10) {
      setError("Alasan hapus minimal 10 karakter agar user mendapat konteks jelas.");
      return;
    }
    setLoading(true);
    try {
      await api.delete<ApiResponse<null>>(`/api/complaints/${complaint.id}/`, {
        data: { reason: cleanedReason },
      });
      onDeleted();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Gagal menghapus aduan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-red-100 p-5">
      <h2 className="text-sm font-bold text-[#1E2A4A] mb-2 flex items-center gap-2">
        <Trash2 className="w-4 h-4 text-red-500" />
        Hapus Aduan
      </h2>
      <p className="text-xs text-gray-500 leading-relaxed mb-3">
        Hapus hanya jika aduan duplikat, tidak valid, atau melanggar aturan. User akan mendapat notifikasi beserta alasan.
      </p>
      {error && (
        <div className="mb-3 flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        {loading ? "Menghapus..." : "Hapus Aduan"}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Hapus aduan ini?"
        description="Tindakan ini menghapus aduan dari database aktif. Isi alasan yang jelas karena alasan akan dikirim ke user."
        confirmLabel="Hapus aduan"
        cancelLabel="Batal"
        loading={loading}
        variant="danger"
        onConfirm={deleteComplaint}
        onCancel={() => {
          if (!loading) setConfirmOpen(false);
        }}
      >
        <label className="block text-xs font-bold text-[#1E2A4A] mb-1.5">Alasan untuk user</label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          placeholder="Contoh: Aduan dihapus karena merupakan duplikasi dari aduan #..."
          className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
        />
        <p className="mt-1 text-[11px] text-gray-400">{reason.trim().length}/10 karakter minimum</p>
      </ConfirmDialog>
    </section>
  );
}
