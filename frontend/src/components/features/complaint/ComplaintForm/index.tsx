"use client";

/**
 * ComplaintForm — wizard 3-step untuk submit aduan.
 *
 * Orchestrator: pegang state form + step + error, render step component
 * sesuai step aktif, dan submit ke API saat step 3.
 *
 * Sub-components:
 *   - StepIndicator: progress bar visual
 *   - Step1Story: textarea cerita
 *   - Step2LocationPhoto: wilayah + geolocation + photo
 *   - Step3Review: read-only review sebelum submit
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import Alert from "@/components/ui/Alert";
import type { ApiResponse, Complaint } from "@/types";

import StepIndicator from "./StepIndicator";
import Step1Story from "./Step1Story";
import Step2LocationPhoto from "./Step2LocationPhoto";
import Step3Review from "./Step3Review";
import { MIN_CHARS, MAX_CHARS, type FormState } from "./types";

export default function ComplaintForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    original_text: "",
    wilayah: "",
    latitude: null,
    longitude: null,
    photo_url: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = form.original_text.length;
  const step1Valid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;
  const step2Valid = form.wilayah.trim().length > 0;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        original_text: form.original_text.trim(),
        wilayah: form.wilayah.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        photo_url: form.photo_url,
      };
      const res = await api.post<ApiResponse<Complaint>>("/api/complaints/", payload);
      const id = res.data.data?.id;
      if (id) router.replace(`/complaint/${id}?new=1`);
      else setError("Aduan tersimpan tapi tidak dapat dibuka. Cek dashboard.");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Gagal mengirim aduan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <StepIndicator step={step} />

      {error && <Alert message={error} onDismiss={() => setError(null)} />}

      {step === 1 && (
        <Step1Story
          value={form.original_text}
          onChange={(v) => update("original_text", v)}
        />
      )}
      {step === 2 && (
        <Step2LocationPhoto
          form={form}
          onChange={update}
          onError={setError}
        />
      )}
      {step === 3 && <Step3Review form={form} photoPreview={form.photo_url} />}

      {/* Nav buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || submitting}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-[#1E2A4A] disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Kembali
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Lanjut
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mengirim...
              </>
            ) : (
              <>
                Kirim Aduan
                <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
