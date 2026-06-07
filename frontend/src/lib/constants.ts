/**
 * Konstanta domain — label, dialek, status, urgensi.
 *
 * Bukan untuk hold state runtime, tapi sebagai single source of truth
 * untuk string yang muncul di banyak tempat (dropdown filter, badge label).
 */

import type { ComplaintStatus, UrgencyLevel } from "@/types";

// ── Status complaint ─────────────────────────────────────────────────────────
export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  pending: "Menunggu",
  in_review: "Ditinjau",
  in_progress: "Diproses",
  resolved: "Selesai",
  rejected: "Ditolak",
};

// ── Urgensi ──────────────────────────────────────────────────────────────────
export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  critical: "Kritis",
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};

// ── Dialek didukung ─────────────────────────────────────────────────────────
// Kode mengikuti standar ISO 639-3 + mapping NLP backend (DIALECT_TO_NLLB).
export const DIALECTS = [
  { code: "id",  name: "Bahasa Indonesia" },
  { code: "jv",  name: "Bahasa Jawa" },
  { code: "su",  name: "Bahasa Sunda" },
  { code: "min", name: "Bahasa Minang" },
  { code: "bbc", name: "Batak Toba" },
  { code: "ban", name: "Bahasa Bali" },
  { code: "bug", name: "Bahasa Bugis" },
  { code: "mad", name: "Bahasa Madura" },
  { code: "bjn", name: "Bahasa Banjar" },
  { code: "ace", name: "Bahasa Aceh" },
  { code: "ms",  name: "Bahasa Melayu" },
  { code: "bew", name: "Bahasa Betawi" },
] as const;

export type DialectCode = (typeof DIALECTS)[number]["code"];

// ── NLP processing stage ────────────────────────────────────────────────────
export const PROCESSING_STAGE_LABELS: Record<string, string> = {
  queued: "Antri",
  detecting: "Deteksi dialek",
  translating: "Terjemah ke Bahasa Indonesia",
  summarizing: "Ringkas",
  extracting: "Ekstrak entitas",
  done: "Selesai",
  failed: "Gagal",
};
