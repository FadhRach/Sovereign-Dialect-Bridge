import type { ComplaintStatus, UrgencyLevel } from "@/lib/types";

const STATUS_STYLES: Record<ComplaintStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_review: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  pending: "Menunggu",
  in_review: "Ditinjau",
  resolved: "Selesai",
  rejected: "Ditolak",
};

const URGENCY_STYLES: Record<UrgencyLevel, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-orange-100 text-orange-700",
  high: "bg-red-100 text-red-700",
  critical: "bg-red-600 text-white",
};

interface StatusBadgeProps {
  status: ComplaintStatus;
}

interface UrgencyBadgeProps {
  urgency: UrgencyLevel;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${URGENCY_STYLES[urgency]}`}>
      {urgency.toUpperCase()}
    </span>
  );
}
