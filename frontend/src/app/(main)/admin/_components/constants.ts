/**
 * Konstanta khusus admin dashboard — filter options, sort order, palette.
 * Sengaja dipisah supaya page.tsx tidak gemuk.
 */

import type { ComplaintStatus, UrgencyLevel } from "@/types";

export const STATUS_FILTER: { value: string; label: string }[] = [
  { value: "", label: "Semua Status" },
  { value: "pending", label: "Menunggu" },
  { value: "in_review", label: "Ditinjau" },
  { value: "in_progress", label: "Diproses" },
  { value: "resolved", label: "Selesai" },
  { value: "rejected", label: "Ditolak" },
];

export const URGENCY_FILTER: { value: string; label: string }[] = [
  { value: "", label: "Semua Urgensi" },
  { value: "critical", label: "Kritis" },
  { value: "high", label: "Tinggi" },
  { value: "medium", label: "Sedang" },
  { value: "low", label: "Rendah" },
];

export const DIALECT_FILTER: { value: string; label: string }[] = [
  { value: "", label: "Semua Dialek" },
  { value: "id", label: "Bahasa Indonesia" },
  { value: "jv", label: "Bahasa Jawa" },
  { value: "su", label: "Bahasa Sunda" },
  { value: "min", label: "Bahasa Minang" },
  { value: "bbc", label: "Batak Toba" },
  { value: "ban", label: "Bahasa Bali" },
  { value: "bug", label: "Bahasa Bugis" },
  { value: "mad", label: "Bahasa Madura" },
  { value: "bjn", label: "Bahasa Banjar" },
  { value: "ace", label: "Bahasa Aceh" },
  { value: "ms", label: "Bahasa Melayu" },
  { value: "bew", label: "Bahasa Betawi" },
];

export const ADMIN_STATUS_OPTIONS: { value: ComplaintStatus; label: string }[] = [
  { value: "pending", label: "Menunggu" },
  { value: "in_review", label: "Ditinjau" },
  { value: "in_progress", label: "Diproses" },
  { value: "resolved", label: "Selesai" },
  { value: "rejected", label: "Ditolak" },
];

export const URGENCY_ORDER: Record<UrgencyLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const CATEGORY_PALETTE = [
  "#2563EB", "#7C3AED", "#DB2777", "#F59E0B",
  "#10B981", "#06B6D4", "#EF4444", "#8B5CF6",
];

export type SortKey = "created_at" | "urgency_level" | "status" | "wilayah";

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
