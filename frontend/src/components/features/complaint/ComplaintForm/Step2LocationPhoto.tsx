/**
 * Step 2: input wilayah + suggestion alamat + map picker + upload foto.
 *
 * Foto di-upload lewat backend agar credential Cloudinary tetap aman di server.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Image as ImageIcon, Loader2, MapPin, Search, X } from "lucide-react";
import { MAX_PHOTO_MB, type FormState } from "./types";
import { parseCoordinate } from "@/components/features/map/mapUtils";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";

const LocationPickerMap = dynamic(() => import("@/components/features/map/LocationPickerMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
      <Loader2 className="h-5 w-5 animate-spin text-[#2563EB]" />
    </div>
  ),
});

interface Step2Props {
  form: FormState;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onError: (message: string) => void;
}

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

interface PhotoUploadResponse {
  photo_url: string;
  public_id: string;
}

export default function Step2LocationPhoto({ form, onChange, onError }: Step2Props) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const suggestionCacheRef = useRef<Map<string, LocationSuggestion[]>>(new Map());
  const selectedAddressRef = useRef("");

  const selectCoordinate = useCallback((latitude: number, longitude: number) => {
    onChange("latitude", latitude);
    onChange("longitude", longitude);
  }, [onChange]);

  useEffect(() => {
    const query = form.wilayah.trim();
    const cacheKey = query.toLowerCase();

    if (query.length < 3 || selectedAddressRef.current === query) {
      setSuggestions([]);
      setHasSearched(false);
      setSearching(false);
      return;
    }

    const cachedSuggestions = suggestionCacheRef.current.get(cacheKey);
    if (cachedSuggestions) {
      setSuggestions(cachedSuggestions);
      setHasSearched(true);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setHasSearched(false);
      try {
        const params = new URLSearchParams({
          q: query,
          format: "json",
          addressdetails: "1",
          namedetails: "1",
          dedupe: "1",
          limit: "10",
          countrycodes: "id",
          "accept-language": "id",
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        const nextSuggestions = Array.isArray(data) ? data : [];
        suggestionCacheRef.current.set(cacheKey, nextSuggestions);
        setSuggestions(nextSuggestions);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
          setHasSearched(true);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [form.wilayah]);

  function selectSuggestion(suggestion: LocationSuggestion) {
    const latitude = parseCoordinate(suggestion.lat);
    const longitude = parseCoordinate(suggestion.lon);
    if (latitude === null || longitude === null) {
      onError("Koordinat alamat tidak valid. Pilih titik langsung pada peta.");
      return;
    }

    selectedAddressRef.current = suggestion.display_name;
    onChange("wilayah", suggestion.display_name);
    onChange("latitude", latitude);
    onChange("longitude", longitude);
    setSuggestions([]);
    setHasSearched(false);
  }

  async function handlePhoto(file: File) {
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      onError(`Ukuran foto maksimal ${MAX_PHOTO_MB} MB.`);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      onError("Format foto harus JPG, PNG, atau WebP.");
      return;
    }

    onChange("photo_url", null);
    onChange("photo_uploading", true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => onChange("photo_preview", reader.result as string);
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append("photo", file);
      const res = await api.post<ApiResponse<PhotoUploadResponse>>(
        "/api/complaints/upload-photo/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const uploadedUrl = res.data.data?.photo_url;
      if (!uploadedUrl) throw new Error("Backend tidak mengembalikan URL foto.");
      onChange("photo_url", uploadedUrl);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      onChange("photo_url", null);
      onChange("photo_preview", null);
      onError(message || "Upload foto gagal. Periksa konfigurasi Cloudinary backend lalu pilih ulang foto.");
    } finally {
      onChange("photo_uploading", false);
    }
  }

  function removePhoto() {
    onChange("photo_url", null);
    onChange("photo_preview", null);
    onChange("photo_uploading", false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[#1E2A4A]">Lokasi & Foto Pendukung</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Cari alamat, pilih titik pada peta, lalu unggah foto pendukung jika ada.
        </p>
      </div>

      <div className="relative z-[1200]">
        <label className="block text-sm font-semibold text-[#1E2A4A] mb-1.5">
          Wilayah <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={form.wilayah}
            onChange={(e) => onChange("wilayah", e.target.value)}
            placeholder="Cari alamat, wilayah, atau nama tempat di Indonesia"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm transition-colors placeholder:text-gray-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#2563EB]" />}
        </div>

        {suggestions.length > 0 && (
          <div className="absolute z-[1200] mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-xl">
            <div className="sticky top-0 border-b border-gray-50 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {suggestions.length} opsi alamat ditemukan
            </div>
            {suggestions.map((suggestion) => (
              <button
                key={`${suggestion.lat}-${suggestion.lon}-${suggestion.display_name}`}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className="flex w-full items-start gap-2 border-b border-gray-50 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-blue-50"
              >
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#2563EB]" />
                <span className="text-xs leading-relaxed text-gray-700">{suggestion.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {hasSearched && !searching && suggestions.length === 0 && form.wilayah.trim().length >= 3 && (
          <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Alamat belum ditemukan. Coba kata kunci yang lebih spesifik, atau klik langsung titik pada peta.
          </div>
        )}
      </div>

      <div className="relative z-0">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="block text-sm font-semibold text-[#1E2A4A]">
            Titik Koordinat <span className="text-red-500">*</span>
          </label>
          {form.latitude !== null && form.longitude !== null && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
            </div>
          )}
        </div>
        <LocationPickerMap
          latitude={form.latitude}
          longitude={form.longitude}
          onSelect={selectCoordinate}
        />
        <p className="mt-2 text-xs text-gray-500">
          Klik peta untuk menentukan titik aduan secara akurat. Pilih suggestion alamat untuk menggeser peta otomatis.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1E2A4A] mb-1.5">
          Foto Pendukung <span className="text-gray-400 font-normal">(opsional, maks {MAX_PHOTO_MB} MB)</span>
        </label>
        {!form.photo_preview ? (
          <label className="flex flex-col items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
            <ImageIcon className="w-6 h-6 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Klik untuk pilih foto</span>
            <span className="text-xs text-gray-400">JPG, PNG, atau WebP</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhoto(file);
              }}
            />
          </label>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.photo_preview} alt="Preview" className="w-full max-h-72 object-contain" />
            {form.photo_uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#1E2A4A]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
                  Mengupload foto...
                </div>
              </div>
            )}
            {form.photo_url && !form.photo_uploading && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Foto tersimpan
              </div>
            )}
            <button
              type="button"
              onClick={removePhoto}
              className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-md hover:bg-white"
              aria-label="Hapus foto"
            >
              <X className="h-3.5 w-3.5 text-gray-700" />
            </button>
          </div>
        )}
        {form.photo_preview && <input type="hidden" data-preview-attached value="1" />}
      </div>
    </div>
  );
}
