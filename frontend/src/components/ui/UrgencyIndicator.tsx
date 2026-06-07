import { AlertTriangle, AlertCircle, Info, MinusCircle } from "lucide-react";
import type { UrgencyLevel } from "@/types";

const URGENCY_CONFIG: Record<UrgencyLevel, {
  label: string;
  hex: string;
  Icon: React.ElementType;
  pill: string;
  strip: string;
  ring: string;
}> = {
  critical: {
    label: "Kritis",
    hex: "#E24B4A",
    Icon: AlertTriangle,
    pill: "bg-red-50 text-red-700 ring-red-200",
    strip: "border-l-[#E24B4A]",
    ring: "ring-red-200",
  },
  high: {
    label: "Tinggi",
    hex: "#EF9F27",
    Icon: AlertCircle,
    pill: "bg-orange-50 text-orange-700 ring-orange-200",
    strip: "border-l-[#EF9F27]",
    ring: "ring-orange-200",
  },
  medium: {
    label: "Sedang",
    hex: "#A28A2A",
    Icon: Info,
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
    strip: "border-l-[#D4A12E]",
    ring: "ring-amber-200",
  },
  low: {
    label: "Rendah",
    hex: "#888780",
    Icon: MinusCircle,
    pill: "bg-gray-50 text-gray-600 ring-gray-200",
    strip: "border-l-[#888780]",
    ring: "ring-gray-200",
  },
};

interface Props {
  level: UrgencyLevel;
  variant?: "badge" | "strip" | "full";
}

export default function UrgencyIndicator({ level, variant = "badge" }: Props) {
  const c = URGENCY_CONFIG[level];

  if (variant === "strip") {
    return <div className={`border-l-4 ${c.strip} h-full`} aria-label={`Urgensi ${c.label}`} />;
  }

  if (variant === "full") {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl ring-1 ${c.pill}`}>
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <c.Icon className="w-4 h-4" style={{ color: c.hex }} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Urgensi</p>
          <p className="text-sm font-bold">{c.label}</p>
        </div>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${c.pill}`}
    >
      <c.Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

export const URGENCY_HEX: Record<UrgencyLevel, string> = {
  critical: URGENCY_CONFIG.critical.hex,
  high: URGENCY_CONFIG.high.hex,
  medium: URGENCY_CONFIG.medium.hex,
  low: URGENCY_CONFIG.low.hex,
};
