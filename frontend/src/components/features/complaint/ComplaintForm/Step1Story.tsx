/**
 * Step 1: textarea cerita masalah dengan char counter + validasi panjang.
 */

import { CheckCircle2 } from "lucide-react";
import { MAX_CHARS, MIN_CHARS } from "./types";

interface Step1StoryProps {
  value: string;
  onChange: (value: string) => void;
}

export default function Step1Story({ value, onChange }: Step1StoryProps) {
  const charCount = value.length;
  const valid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#1E2A4A]">Ceritakan masalah Anda</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Boleh pakai bahasa Jawa, Sunda, Minang, atau bahasa daerah lainnya — AI akan menerjemahkan.
        </p>
      </div>
      <div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
          placeholder="Contoh: Dalane ning ngarep omah sayane rusak parah, wis suwe ora dibenahi..."
          rows={8}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors bg-gray-50 placeholder:text-gray-400 resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs font-medium ${charCount < MIN_CHARS ? "text-red-500" : "text-gray-400"}`}>
            {charCount < MIN_CHARS
              ? `Minimal ${MIN_CHARS} karakter (saat ini ${charCount})`
              : `${charCount} / ${MAX_CHARS} karakter`}
          </span>
          {valid && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Siap lanjut
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
