/**
 * Step 3: read-only review semua field sebelum submit final.
 */

import { CheckCircle2, FileText, Image as ImageIcon, MapPin } from "lucide-react";
import { buildGoogleMapsUrl } from "@/components/features/map/mapUtils";
import { countWords, type FormState } from "./types";

interface Step3ReviewProps {
  form: FormState;
  photoPreview?: string | null;
}

export default function Step3Review({ form, photoPreview }: Step3ReviewProps) {
  const wordCount = countWords(form.original_text);
  const charCount = form.original_text.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[#1E2A4A]">Tinjau Aduan Anda</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Periksa cerita, lokasi, dan data pendukung sebelum aduan dikirim ke pemerintah.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <ReviewMetric label="Karakter" value={charCount.toLocaleString("id-ID")} />
        <ReviewMetric label="Kata" value={wordCount.toString()} />
        <ReviewMetric label="Koordinat" value={form.latitude !== null && form.longitude !== null ? "Siap" : "Belum"} />
      </div>

      <div className="space-y-3">
        <ReviewField label="Cerita Anda" Icon={FileText}>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {form.original_text}
          </p>
        </ReviewField>

        <ReviewField label="Wilayah dan Titik Aduan" Icon={MapPin}>
          <p className="text-sm text-gray-800">{form.wilayah}</p>
          {form.latitude !== null && form.longitude !== null && (
            <a
              href={buildGoogleMapsUrl(form.latitude, form.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
            >
              {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)} · buka Google Maps
            </a>
          )}
        </ReviewField>

        <ReviewField label="Foto Pendukung" Icon={ImageIcon}>
          {photoPreview ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="Foto aduan" className="rounded-lg max-h-48 object-contain bg-gray-100" />
            </div>
          ) : (
            <p className="text-sm text-gray-500">Tidak ada foto pendukung. Aduan tetap bisa dikirim.</p>
          )}
        </ReviewField>
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

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#EFF6FF] border border-blue-100 p-3">
      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-[#1E2A4A]">{value}</p>
    </div>
  );
}

function ReviewField({ label, Icon, children }: { label: string; Icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-[#2563EB]" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      </div>
      {children}
    </div>
  );
}
