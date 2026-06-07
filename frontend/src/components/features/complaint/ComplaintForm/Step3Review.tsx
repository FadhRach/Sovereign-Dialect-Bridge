/**
 * Step 3: read-only review semua field sebelum submit final.
 */

import { CheckCircle2 } from "lucide-react";
import type { FormState } from "./types";

interface Step3ReviewProps {
  form: FormState;
  photoPreview?: string | null;
}

export default function Step3Review({ form, photoPreview }: Step3ReviewProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#1E2A4A]">Tinjau Aduan Anda</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Pastikan semua sudah benar sebelum dikirim.
        </p>
      </div>

      <div className="space-y-3">
        <ReviewField label="Cerita Anda">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {form.original_text}
          </p>
        </ReviewField>

        <ReviewField label="Wilayah">
          <p className="text-sm text-gray-800">{form.wilayah}</p>
          {form.latitude !== null && form.longitude !== null && (
            <p className="text-xs text-gray-500 mt-1">
              Koordinat: {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
            </p>
          )}
        </ReviewField>

        {photoPreview && (
          <ReviewField label="Foto Pendukung">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Foto aduan" className="rounded-lg max-h-48 object-contain bg-gray-100" />
          </ReviewField>
        )}
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0 mt-0.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="text-xs text-blue-900/80 leading-relaxed">
          Setelah dikirim, AI akan menganalisis dialek, menerjemahkan, dan mengekstrak entitas otomatis.
          Anda dapat memantau prosesnya langsung di halaman detail.
        </div>
      </div>
    </div>
  );
}

function ReviewField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
      {children}
    </div>
  );
}
