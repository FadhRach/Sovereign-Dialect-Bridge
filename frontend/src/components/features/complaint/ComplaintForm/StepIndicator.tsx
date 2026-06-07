/**
 * Visual progress indicator untuk 3-step wizard.
 */

import { MessageSquare, MapPin, Eye, CheckCircle2 } from "lucide-react";

const STEPS = [
  { key: 1, label: "Ceritakan", Icon: MessageSquare },
  { key: 2, label: "Lokasi & Foto", Icon: MapPin },
  { key: 3, label: "Tinjau & Kirim", Icon: Eye },
];

export default function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4">
      {STEPS.map((s, idx) => {
        const isActive = step === s.key;
        const isDone = step > s.key;
        return (
          <div key={s.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs transition-all duration-200 ${
                  isDone
                    ? "bg-emerald-500 text-white"
                    : isActive
                    ? "bg-[#2563EB] text-white ring-4 ring-blue-100"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : <s.Icon className="w-4 h-4" />}
              </div>
              <span
                className={`text-[10px] font-semibold mt-1.5 hidden sm:block ${
                  isActive ? "text-[#1E2A4A]" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${step > s.key ? "bg-emerald-500" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
