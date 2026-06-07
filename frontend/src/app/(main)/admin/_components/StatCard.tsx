/**
 * StatCard untuk admin dashboard — clickable card dengan state aktif/highlight.
 * Versi lebih kaya dibanding StatCard di /dashboard (yang non-clickable).
 */

interface StatCardProps {
  label: string;
  value: number;
  Icon: React.ElementType;
  color: "blue" | "amber" | "indigo" | "emerald" | "red";
  onClick?: () => void;
  active?: boolean;
  highlight?: boolean;
}

const STAT_COLORS: Record<StatCardProps["color"], { bg: string; icon: string; text: string }> = {
  blue:    { bg: "bg-blue-50",    icon: "text-blue-600",    text: "text-blue-700" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   text: "text-amber-700" },
  indigo:  { bg: "bg-indigo-50",  icon: "text-indigo-600",  text: "text-indigo-700" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", text: "text-emerald-700" },
  red:     { bg: "bg-red-50",     icon: "text-red-600",     text: "text-red-700" },
};

export default function StatCard({ label, value, Icon, color, onClick, active, highlight }: StatCardProps) {
  const c = STAT_COLORS[color];
  return (
    <button
      onClick={onClick}
      className={`text-left bg-white rounded-2xl border p-4 transition-all duration-200 ${
        active
          ? "border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-md -translate-y-0.5"
          : highlight
          ? "border-red-200 hover:border-red-300 hover:shadow-md"
          : "border-gray-100 hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${c.icon}`} />
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
    </button>
  );
}
