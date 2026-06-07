import { Loader2, Check, Languages, Sparkles, MapPin, Brain, AlertTriangle } from "lucide-react";
import type { ProcessingStage } from "@/types";

interface StepConfig {
  key: ProcessingStage;
  label: string;
  desc: string;
  Icon: React.ElementType;
}

const STEPS: StepConfig[] = [
  { key: "detecting",   label: "Mendeteksi Dialek",       desc: "Mengenali bahasa daerah dari teks Anda",       Icon: Brain },
  { key: "translating", label: "Menerjemahkan ke BI",    desc: "Mengubah ke Bahasa Indonesia baku",            Icon: Languages },
  { key: "summarizing", label: "Membuat Ringkasan",      desc: "mT5-base meringkas inti aduan",                Icon: Sparkles },
  { key: "extracting",  label: "Mengekstrak Entitas",    desc: "Mencari lokasi, orang, dan instansi terkait",  Icon: MapPin },
];

const ORDER: Record<ProcessingStage, number> = {
  queued: 0, detecting: 1, translating: 2, summarizing: 3, extracting: 4, done: 5, failed: -1,
};

interface Props {
  stage: ProcessingStage;
  errorMessage?: string | null;
}

export default function NLPProgress({ stage, errorMessage }: Props) {
  if (stage === "done") return null;

  if (stage === "failed") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-900">Pipeline AI gagal</p>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              {errorMessage || "Terjadi kesalahan saat memproses aduan dengan AI. Aduan tetap tersimpan."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentIdx = ORDER[stage] ?? 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-white rounded-2xl border border-blue-100 p-5 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-100 rounded-full opacity-30 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 bg-[#2563EB] rounded-xl flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1E2A4A]">AI sedang memproses</p>
            <p className="text-xs text-gray-500">
              {stage === "queued" ? "Menunggu giliran di antrian..." : "Tahap demi tahap, real-time"}
            </p>
          </div>
        </div>

        <ol className="space-y-2.5">
          {STEPS.map((step, idx) => {
            const stepNum = idx + 1;
            const isDone = currentIdx > stepNum;
            const isActive = currentIdx === stepNum;
            const isPending = currentIdx < stepNum;
            return (
              <li
                key={step.key}
                className={`flex items-center gap-3 rounded-xl p-2.5 transition-all duration-300 ${
                  isActive ? "bg-white ring-1 ring-[#2563EB]/30 shadow-sm" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isActive
                      ? "bg-[#2563EB] text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : isActive ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <step.Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold leading-none ${
                      isPending ? "text-gray-400" : "text-[#1E2A4A]"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className={`text-xs mt-1 ${isActive ? "text-gray-600" : "text-gray-400"}`}>
                    {step.desc}
                  </p>
                </div>
                {isActive && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                    Sedang berjalan
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export const STAGE_LABEL: Record<ProcessingStage, string> = {
  queued:       "Menunggu antrian",
  detecting:    "Mendeteksi dialek",
  translating:  "Menerjemahkan",
  summarizing:  "Meringkas",
  extracting:   "Mengekstrak entitas",
  done:         "Selesai",
  failed:       "Gagal",
};
