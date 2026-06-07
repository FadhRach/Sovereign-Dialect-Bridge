import { Languages, AlertCircle } from "lucide-react";

const DIALECT_NAMES: Record<string, string> = {
  id: "Bahasa Indonesia",
  jv: "Bahasa Jawa",
  su: "Bahasa Sunda",
  min: "Bahasa Minang",
  bbc: "Batak Toba",
  ban: "Bahasa Bali",
  bug: "Bahasa Bugis",
  mad: "Bahasa Madura",
  bjn: "Bahasa Banjar",
  ace: "Bahasa Aceh",
  ms: "Bahasa Melayu",
  bew: "Bahasa Betawi",
  en: "English",
  xx: "Tidak Terdeteksi",
};

const DIALECT_COLORS: Record<string, string> = {
  id: "bg-blue-50 text-blue-700 ring-blue-100",
  jv: "bg-amber-50 text-amber-700 ring-amber-100",
  su: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  min: "bg-rose-50 text-rose-700 ring-rose-100",
  bbc: "bg-orange-50 text-orange-700 ring-orange-100",
  ban: "bg-violet-50 text-violet-700 ring-violet-100",
  bug: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  mad: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
  bjn: "bg-teal-50 text-teal-700 ring-teal-100",
  ace: "bg-pink-50 text-pink-700 ring-pink-100",
  ms: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  bew: "bg-lime-50 text-lime-700 ring-lime-100",
  en: "bg-slate-50 text-slate-700 ring-slate-100",
  xx: "bg-gray-100 text-gray-500 ring-gray-200",
};

export default function DialectBadge({ code }: { code: string }) {
  const name = DIALECT_NAMES[code] ?? `Dialek ${code.toUpperCase()}`;
  const colors = DIALECT_COLORS[code] ?? DIALECT_COLORS.xx;
  const isUnknown = code === "xx" || !DIALECT_NAMES[code];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${colors}`}
    >
      {isUnknown ? <AlertCircle className="w-3 h-3" /> : <Languages className="w-3 h-3" />}
      {name}
    </span>
  );
}
