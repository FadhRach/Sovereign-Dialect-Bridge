"use client";

import { useState } from "react";
import {
  Sparkles, Brain, Languages, MapPin, User, Building2,
  Hash, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import type { Complaint } from "@/types";
import DialectBadge from "@/components/ui/DialectBadge";
import { Skeleton } from "@/components/ui/Skeleton";

const ENTITY_STYLE: Record<string, { bg: string; text: string; Icon: React.ElementType; label: string }> = {
  LOC:  { bg: "bg-blue-50",  text: "text-blue-700",  Icon: MapPin,     label: "Lokasi" },
  PER:  { bg: "bg-violet-50", text: "text-violet-700", Icon: User,     label: "Orang" },
  ORG:  { bg: "bg-teal-50",  text: "text-teal-700",  Icon: Building2, label: "Instansi" },
  MISC: { bg: "bg-gray-50",  text: "text-gray-700",  Icon: Hash,      label: "Lainnya" },
};

interface Props {
  complaint: Complaint;
  isLoading?: boolean;
}

export default function NLPResultCard({ complaint, isLoading = false }: Props) {
  const [showFullTranslation, setShowFullTranslation] = useState(false);

  const hasResult = Boolean(complaint.summary);

  if (isLoading || !hasResult) {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-white to-white rounded-2xl border border-blue-100 p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-100 rounded-full opacity-30 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-[#2563EB] rounded-xl flex items-center justify-center animate-pulse">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1E2A4A]">AI sedang menganalisis</p>
              <p className="text-xs text-gray-500">Menerjemahkan & mengekstrak informasi penting...</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-1.5" />
            </div>
            <div>
              <Skeleton className="h-3 w-24 mb-2" />
              <div className="flex gap-1.5">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const entities = complaint.named_entities ?? [];
  const keywords = complaint.keywords ?? [];
  const conf = Math.round(complaint.nlp_confidence * 100);

  const groupedEntities = entities.reduce<Record<string, typeof entities>>((acc, e) => {
    const key = e.label in ENTITY_STYLE ? e.label : "MISC";
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#EFF6FF] via-white to-white px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#2563EB] rounded-xl flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1E2A4A]">Hasil Analisis AI</p>
            <p className="text-[10px] text-gray-500">Diproses otomatis oleh NLP pipeline</p>
          </div>
        </div>
        <DialectBadge code={complaint.detected_dialect} />
      </div>

      <div className="p-5 space-y-5">
        {/* Summary */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider">Ringkasan</span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-xl p-3.5">
            {complaint.summary}
          </p>
        </div>

        {/* Translation */}
        {complaint.translated_text && complaint.translated_text !== complaint.original_text && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-[#2563EB]" />
                <span className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider">
                  Terjemahan ke Bahasa Indonesia
                </span>
              </div>
              <button
                onClick={() => setShowFullTranslation((v) => !v)}
                className="text-xs text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-0.5 font-medium"
              >
                {showFullTranslation ? "Tutup" : "Lihat"}
                {showFullTranslation ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            {showFullTranslation && (
              <p className="text-sm text-gray-700 leading-relaxed bg-blue-50/50 rounded-xl p-3.5 border border-blue-100">
                {complaint.translated_text}
              </p>
            )}
          </div>
        )}

        {/* Named Entities */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider">Entitas Terdeteksi</span>
          </div>
          {entities.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 italic bg-gray-50 rounded-xl p-3">
              <AlertCircle className="w-3.5 h-3.5" />
              Tidak ada entitas yang terdeteksi
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(groupedEntities).map(([label, items]) => {
                const style = ENTITY_STYLE[label] ?? ENTITY_STYLE.MISC;
                return (
                  <div key={label}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      {style.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((e, idx) => (
                        <span
                          key={`${label}-${idx}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                        >
                          <style.Icon className="w-3 h-3" />
                          {e.text}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Keywords */}
        {keywords.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Hash className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider">Kata Kunci</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-gray-50 text-gray-700 rounded-md text-xs font-medium ring-1 ring-gray-200"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Confidence bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Tingkat Keyakinan AI
            </span>
            <span className="text-xs font-bold text-[#1E2A4A]">{conf}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] rounded-full transition-all duration-700"
              style={{ width: `${conf}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
