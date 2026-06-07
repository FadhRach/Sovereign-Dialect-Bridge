/**
 * Step 2: input wilayah + tombol geolokasi + upload foto (opsional).
 *
 * Foto di-upload ke Cloudinary jika env var NEXT_PUBLIC_CLOUDINARY_*
 * tersedia. Kalau tidak, photo_url tetap null tapi preview lokal tetap
 * muncul supaya user tahu fotonya sudah dipilih.
 */

"use client";

import { useState } from "react";
import { CheckCircle2, Crosshair, Loader2, Image as ImageIcon, X } from "lucide-react";
import { MAX_PHOTO_MB, type FormState } from "./types";

interface Step2Props {
  form: FormState;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onError: (message: string) => void;
}

export default function Step2LocationPhoto({ form, onChange, onError }: Step2Props) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  function handleGeolocate() {
    if (!navigator.geolocation) {
      onError("Browser Anda tidak mendukung geolokasi.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange("latitude", pos.coords.latitude);
        onChange("longitude", pos.coords.longitude);
        setGeoLoading(false);
      },
      () => {
        onError("Gagal mengambil lokasi. Pastikan izin sudah diberikan.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
    setPhotoUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      if (cloudName && uploadPreset) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", uploadPreset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST", body: fd,
        });
        const data = await res.json();
        if (data.secure_url) onChange("photo_url", data.secure_url);
        else onError("Upload foto gagal. Foto tidak akan ikut terkirim.");
      } else {
        onChange("photo_url", null);
      }
    } catch {
      onError("Upload foto gagal.");
    } finally {
      setPhotoUploading(false);
    }
  }

  function removePhoto() {
    onChange("photo_url", null);
    setPhotoPreview(null);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[#1E2A4A]">Lokasi & Foto Pendukung</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Sebutkan wilayah, ambil koordinat (opsional), dan unggah foto (opsional).
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1E2A4A] mb-1.5">
          Wilayah <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.wilayah}
          onChange={(e) => onChange("wilayah", e.target.value)}
          placeholder="Contoh: Desa Sukamaju, Kec. Cibadak, Kab. Sukabumi"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors bg-gray-50 placeholder:text-gray-400"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1E2A4A] mb-1.5">Koordinat</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={geoLoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#EFF6FF] hover:bg-blue-100 disabled:opacity-60 text-[#2563EB] text-sm font-semibold rounded-xl transition-colors"
          >
            {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            Gunakan Lokasi Saya
          </button>
          {form.latitude !== null && form.longitude !== null && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-xl font-medium">
              <CheckCircle2 className="w-4 h-4" />
              {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1E2A4A] mb-1.5">
          Foto Pendukung <span className="text-gray-400 font-normal">(opsional, maks {MAX_PHOTO_MB} MB)</span>
        </label>
        {!photoPreview ? (
          <label className="flex flex-col items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
            <ImageIcon className="w-6 h-6 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Klik untuk pilih foto</span>
            <span className="text-xs text-gray-400">JPG, PNG, atau WebP</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhoto(f);
              }}
            />
          </label>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Preview" className="w-full max-h-72 object-contain" />
            {photoUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
            <button
              type="button"
              onClick={removePhoto}
              className="absolute top-2 right-2 w-7 h-7 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-md"
              aria-label="Hapus foto"
            >
              <X className="w-3.5 h-3.5 text-gray-700" />
            </button>
          </div>
        )}
        {photoPreview && <input type="hidden" data-preview-attached value="1" />}
      </div>
    </div>
  );
}
