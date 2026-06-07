import { Clock, Eye, Settings, CheckCircle2, XCircle } from "lucide-react";
import type { ComplaintStatus, UrgencyLevel } from "@/types";

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; pill: string; Icon: React.ElementType }> = {
  pending:     { label: "Menunggu", pill: "bg-amber-50 text-amber-700 ring-amber-200",       Icon: Clock },
  in_review:   { label: "Ditinjau", pill: "bg-blue-50 text-blue-700 ring-blue-200",          Icon: Eye },
  in_progress: { label: "Diproses", pill: "bg-indigo-50 text-indigo-700 ring-indigo-200",    Icon: Settings },
  resolved:    { label: "Selesai",  pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: CheckCircle2 },
  rejected:    { label: "Ditolak",  pill: "bg-red-50 text-red-700 ring-red-200",             Icon: XCircle },
};

const URGENCY_CONFIG: Record<UrgencyLevel, { label: string; pill: string }> = {
  low:      { label: "Rendah", pill: "bg-gray-100 text-gray-600 ring-gray-200" },
  medium:   { label: "Sedang", pill: "bg-amber-50 text-amber-700 ring-amber-200" },
  high:     { label: "Tinggi", pill: "bg-orange-50 text-orange-700 ring-orange-200" },
  critical: { label: "Kritis", pill: "bg-red-600 text-white ring-red-300" },
};

export function StatusBadge({ status, withIcon = true }: { status: ComplaintStatus; withIcon?: boolean }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${c.pill}`}>
      {withIcon && <c.Icon className="w-3 h-3" />}
      {c.label}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  const c = URGENCY_CONFIG[urgency];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${c.pill}`}>
      {c.label}
    </span>
  );
}

export const STATUS_LABEL: Record<ComplaintStatus, string> = {
  pending: "Menunggu",
  in_review: "Ditinjau",
  in_progress: "Diproses",
  resolved: "Selesai",
  rejected: "Ditolak",
};

export const STATUS_ICON: Record<ComplaintStatus, React.ElementType> = {
  pending: Clock,
  in_review: Eye,
  in_progress: Settings,
  resolved: CheckCircle2,
  rejected: XCircle,
};
