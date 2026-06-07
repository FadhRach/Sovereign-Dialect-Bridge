import Link from "next/link";
import { MapPin, ChevronRight, Loader2 } from "lucide-react";
import type { Complaint } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STAGE_LABEL } from "./NLPProgress";
import UrgencyIndicator from "@/components/ui/UrgencyIndicator";
import DialectBadge from "@/components/ui/DialectBadge";

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (day < 1) return "Hari ini";
  if (day < 2) return "Kemarin";
  if (day < 7) return `${day} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const URGENCY_STRIP: Record<string, string> = {
  critical: "border-l-[#E24B4A]",
  high: "border-l-[#EF9F27]",
  medium: "border-l-[#D4A12E]",
  low: "border-l-gray-300",
};

interface Props {
  complaint: Complaint;
}

export default function ComplaintCard({ complaint }: Props) {
  const stripColor = URGENCY_STRIP[complaint.urgency_level];
  const displayText = complaint.summary ?? complaint.original_text;
  const stage = complaint.processing_stage;
  const showAiProcessing = stage !== "done" && stage !== "failed";
  const stageLabel = stage && stage !== "done" && stage !== "failed" ? STAGE_LABEL[stage] : "";

  return (
    <Link
      href={`/complaint/${complaint.id}`}
      className={`group block bg-white rounded-2xl border border-gray-100 border-l-4 ${stripColor} p-4 hover:border-[#2563EB]/30 hover:shadow-md transition-all duration-200`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={complaint.status} />
          <UrgencyIndicator level={complaint.urgency_level} variant="badge" />
          {complaint.detected_dialect && complaint.detected_dialect !== "xx" && (
            <DialectBadge code={complaint.detected_dialect} />
          )}
        </div>
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap flex-shrink-0">
          {relativeDate(complaint.created_at)}
        </span>
      </div>

      <p className="text-sm text-gray-800 line-clamp-2 leading-relaxed mb-3">
        {displayText}
      </p>

      {showAiProcessing && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-[#2563EB] bg-blue-50/50 rounded-lg px-2 py-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="font-semibold">{stageLabel || "AI sedang menganalisis"}...</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span className="truncate">{complaint.wilayah || "Tanpa wilayah"}</span>
          {complaint.category && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-[#2563EB] font-medium truncate">{complaint.category.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-0.5 text-xs text-[#2563EB] font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          Detail
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
}
