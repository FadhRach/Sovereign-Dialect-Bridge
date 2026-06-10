/**
 * Step 1: textarea cerita masalah dengan char counter + validasi kualitas.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Mic, MicOff } from "lucide-react";
import { countWords, MAX_CHARS, MIN_CHARS, MIN_WORDS } from "./types";

interface Step1StoryProps {
  value: string;
  onChange: (value: string) => void;
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export default function Step1Story({ value, onChange }: Step1StoryProps) {
  const charCount = value.length;
  const wordCount = countWords(value);
  const enoughChars = charCount >= MIN_CHARS && charCount <= MAX_CHARS;
  const enoughWords = wordCount >= MIN_WORDS;
  const valid = enoughChars && enoughWords;
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechMessage, setSpeechMessage] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);
  const interimTranscriptRef = useRef("");

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  function appendTranscript(text: string) {
    const cleanedText = text.trim();
    if (!cleanedText) return;

    const current = valueRef.current.trim();
    const next = current ? `${current} ${cleanedText}` : cleanedText;
    onChange(next.slice(0, MAX_CHARS));
    valueRef.current = next.slice(0, MAX_CHARS);
  }

  function updateInterimTranscript(text: string) {
    setInterimTranscript(text);
    interimTranscriptRef.current = text;
  }

  function stopDictation() {
    recognitionRef.current?.stop();
    const fallbackTranscript = interimTranscriptRef.current.trim();
    if (fallbackTranscript) {
      appendTranscript(fallbackTranscript);
      updateInterimTranscript("");
    }
    setIsListening(false);
  }

  function getSpeechErrorMessage(error?: string): string {
    if (error === "not-allowed" || error === "service-not-allowed") {
      return "Izin mikrofon ditolak. Aktifkan permission mikrofon untuk browser ini.";
    }
    if (error === "audio-capture") {
      return "Mikrofon tidak terdeteksi. Periksa input microphone di perangkat.";
    }
    if (error === "no-speech") {
      return "Suara belum tertangkap. Coba bicara lebih dekat ke mikrofon dan tekan dikte lagi.";
    }
    if (error === "network") {
      return "Speech recognition browser butuh koneksi internet. Coba ulang saat jaringan stabil.";
    }
    if (error === "language-not-supported") {
      return "Browser ini belum mendukung pengenalan suara Bahasa Indonesia.";
    }
    return "Dikte berhenti tanpa hasil. Coba gunakan Chrome terbaru atau isi teks manual.";
  }

  function toggleDictation() {
    if (isListening) {
      stopDictation();
      return;
    }

    if (typeof window === "undefined") return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechSupported(false);
      setSpeechMessage("Browser ini belum mendukung input suara. Gunakan Chrome terbaru atau isi teks manual.");
      return;
    }

    setSpeechSupported(true);
    setSpeechMessage("Mendengarkan Bahasa Indonesia. Bicara jelas, lalu berhenti sebentar agar teks masuk.");
    updateInterimTranscript("");

    const recognition = new Recognition();
    recognition.lang = "id-ID";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const finalTranscripts: string[] = [];
      const interimTranscripts: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) continue;

        if (result.isFinal) {
          finalTranscripts.push(transcript);
        } else {
          interimTranscripts.push(transcript);
        }
      }
      if (finalTranscripts.length > 0) {
        appendTranscript(finalTranscripts.join(" "));
        updateInterimTranscript("");
        setSpeechMessage("Teks suara berhasil ditambahkan. Lanjut bicara atau tekan berhenti dikte.");
        return;
      }
      updateInterimTranscript(interimTranscripts.join(" "));
    };
    recognition.onerror = (event) => {
      setSpeechMessage(getSpeechErrorMessage(event.error));
      updateInterimTranscript("");
      setIsListening(false);
    };
    recognition.onend = () => {
      const fallbackTranscript = interimTranscriptRef.current.trim();
      if (fallbackTranscript) {
        appendTranscript(fallbackTranscript);
        updateInterimTranscript("");
      }
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setSpeechMessage("Dikte belum bisa dimulai. Tutup sesi dikte sebelumnya lalu coba lagi.");
      setIsListening(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1E2A4A]">Ceritakan masalah Anda</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Tulis dengan jelas dalam bahasa daerah atau Bahasa Indonesia. Dikte suara hanya menangkap Bahasa Indonesia.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleDictation}
          aria-label={isListening ? "Berhenti dikte" : "Mulai dikte Bahasa Indonesia"}
          title={isListening ? "Berhenti dikte" : "Dikte Bahasa Indonesia"}
          className={`inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl transition-colors ${
            isListening
              ? "bg-red-600 text-white shadow-lg shadow-red-200 hover:bg-red-700"
              : "bg-[#EFF6FF] text-[#2563EB] hover:bg-blue-100"
          }`}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>

      {(!speechSupported || speechMessage) && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            {speechMessage || "Browser ini belum mendukung input suara. Gunakan Chrome atau isi teks secara manual."}
          </span>
        </div>
      )}

      <div>
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Contoh: Dalane ning ngarep omah sayane rusak parah, wis suwe ora dibenahi..."
            rows={8}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors bg-gray-50 placeholder:text-gray-400 resize-none leading-relaxed"
          />
          {interimTranscript && (
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg border border-blue-100 bg-white/95 px-3 py-2 text-sm text-blue-900 shadow-sm">
              <span className="font-semibold">Dikte:</span> {interimTranscript}
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
          <Mic className="h-3.5 w-3.5 text-[#2563EB]" />
          <span>Input suara hanya menangkap Bahasa Indonesia.</span>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <QualityItem
            valid={enoughChars}
            label={`${charCount} / ${MAX_CHARS} karakter`}
            hint={`Minimal ${MIN_CHARS} karakter`}
          />
          <QualityItem
            valid={enoughWords}
            label={`${wordCount} / ${MIN_WORDS} kata`}
            hint="Minimal 10 kata agar konteks jelas"
          />
          <QualityItem
            valid={valid}
            label={valid ? "Siap lanjut" : "Belum lengkap"}
            hint="Lengkapi konteks sebelum lanjut"
          />
        </div>
      </div>
    </div>
  );
}

function QualityItem({ valid, label, hint }: { valid: boolean; label: string; hint: string }) {
  return (
    <div className={`rounded-xl border p-3 ${valid ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}>
      <div className="flex items-center gap-2">
        {valid ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-600" />
        )}
        <p className={`text-xs font-bold ${valid ? "text-emerald-700" : "text-amber-800"}`}>{label}</p>
      </div>
      <p className={`mt-1 text-[11px] ${valid ? "text-emerald-700/80" : "text-amber-700"}`}>{hint}</p>
    </div>
  );
}
