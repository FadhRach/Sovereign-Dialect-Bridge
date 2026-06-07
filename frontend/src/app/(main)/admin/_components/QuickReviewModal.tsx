/**
 * Slide-in modal untuk admin review cepat aduan tanpa pindah halaman.
 *
 * Fitur:
 *   - Load detail complaint via GET /api/complaints/{id}/
 *   - Ubah status + tambah catatan via PATCH
 *   - Tombol Escape untuk tutup
 *   - Link "Detail Lengkap" → halaman /complaint/[id]
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Sparkles, Save, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import UrgencyIndicator from "@/components/ui/UrgencyIndicator";
import DialectBadge from "@/components/ui/DialectBadge";
import Spinner from "@/components/ui/Spinner";
import type { Complaint, ApiResponse, ComplaintStatus } from "@/types";
import { ADMIN_STATUS_OPTIONS } from "./constants";

interface QuickReviewModalProps {
  id: number;
  onClose: () => void;
  onUpdated: () => void;
}

export default function QuickReviewModal({ id, onClose, onUpdated }: QuickReviewModalProps) {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState<ComplaintStatus>("pending");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<ApiResponse<Complaint>>(`/api/complaints/${id}/`);
        if (!cancelled && res.data.data) {
          setComplaint(res.data.data);
          setNewStatus(res.data.data.status);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave() {
    if (!complaint) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch<ApiResponse<Complaint>>(`/api/complaints/${id}/`, {
        status: newStatus,
        note: note.trim() || undefined,
      });
      onUpdated();
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <aside className="fixed top-0 right-0 bottom-0 w-full sm:w-[440px] z-50 bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Review</p>
            <h2 className="text-sm font-bold text-[#1E2A4A]">Aduan #{id}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center">
            <Spinner size="md" label="Memuat aduan..." />
          </div>
        ) : !complaint ? (
          <div className="p-10 text-center text-sm text-gray-500">Tidak dapat memuat aduan.</div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={complaint.status} />
              <UrgencyIndicator level={complaint.urgency_level} variant="badge" />
              {complaint.detected_dialect !== "xx" && <DialectBadge code={complaint.detected_dialect} />}
            </div>

            <Section label="Pelapor">
              <p className="text-sm font-semibold text-[#1E2A4A]">{complaint.user.full_name}</p>
              <p className="text-xs text-gray-500">{complaint.user.email}</p>
            </Section>

            <Section label="Wilayah">
              <p className="text-sm text-gray-800">{complaint.wilayah}</p>
            </Section>

            {complaint.summary ? (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3 text-[#2563EB]" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ringkasan AI</p>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-xl p-3">
                  {complaint.summary}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[#2563EB] bg-blue-50 rounded-xl p-3">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                AI masih menganalisis...
              </div>
            )}

            {complaint.named_entities && complaint.named_entities.length > 0 && (
              <Section label="Entitas (Top 5)">
                <div className="flex flex-wrap gap-1">
                  {complaint.named_entities.slice(0, 5).map((e, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                      {e.text} <span className="opacity-50 text-[10px]">·{e.label}</span>
                    </span>
                  ))}
                </div>
              </Section>
            )}

            <div className="border-t border-gray-100 pt-5 space-y-3">
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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Catatan</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Catatan tindak lanjut..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-gray-50 resize-none placeholder:text-gray-400"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan
                </button>
                <Link
                  href={`/complaint/${complaint.id}`}
                  onClick={onClose}
                  className="flex items-center justify-center px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#1E2A4A] text-sm font-semibold rounded-xl transition-colors"
                >
                  Detail Lengkap
                </Link>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
      {children}
    </div>
  );
}
