import Link from "next/link";
import type { Complaint } from "@/lib/types";
import { StatusBadge, UrgencyBadge } from "./StatusBadge";

interface ComplaintCardProps {
  complaint: Complaint;
}

// TODO: tambah styling dan interaksi lebih lanjut
export default function ComplaintCard({ complaint }: ComplaintCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition">
      <div className="flex items-start justify-between mb-2">
        <div className="flex gap-2">
          <StatusBadge status={complaint.status} />
          <UrgencyBadge urgency={complaint.urgency_level} />
        </div>
        <span className="text-xs text-gray-400">
          {new Date(complaint.created_at).toLocaleDateString("id-ID")}
        </span>
      </div>
      <p className="text-sm text-gray-800 line-clamp-2 mb-2">{complaint.original_text}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{complaint.wilayah}</span>
        <Link href={`/complaint/${complaint.id}`} className="text-xs text-blue-600 hover:underline">
          Lihat detail
        </Link>
      </div>
    </div>
  );
}
