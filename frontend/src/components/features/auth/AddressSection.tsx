"use client";

/** Section "Alamat" untuk form register. City + province wajib, sisanya opsional. */

import { FormInput, FormSelect } from "./FormField";
import { PROVINCES } from "./PROVINCES";
import type { RegisterPayload } from "@/types";

interface Props {
  form: RegisterPayload;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export default function AddressSection({ form, onChange }: Props) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-gray-700 mb-1">Alamat</legend>

      <div className="grid grid-cols-2 gap-3">
        <FormInput
          id="address_city"
          label="Kota / Kabupaten"
          required
          value={form.address_city}
          onChange={onChange}
          placeholder="Bandung"
        />
        <FormSelect
          id="address_province"
          label="Provinsi"
          required
          value={form.address_province}
          onChange={onChange}
          placeholder="Pilih provinsi"
          options={PROVINCES}
        />
      </div>

      <div>
        <label htmlFor="address_street" className="block text-sm font-medium text-gray-700 mb-1">
          Alamat Jalan <span className="text-gray-400 text-xs">(opsional)</span>
        </label>
        <textarea
          id="address_street"
          name="address_street"
          rows={2}
          value={form.address_street ?? ""}
          onChange={onChange}
          placeholder="Nama jalan, nomor rumah, RT/RW"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormInput
          id="address_kelurahan"
          label="Kelurahan / Desa"
          value={form.address_kelurahan ?? ""}
          onChange={onChange}
          placeholder="Opsional"
        />
        <FormInput
          id="address_kecamatan"
          label="Kecamatan"
          value={form.address_kecamatan ?? ""}
          onChange={onChange}
          placeholder="Opsional"
        />
      </div>

      <FormInput
        id="address_postal_code"
        label="Kode Pos"
        value={form.address_postal_code ?? ""}
        onChange={onChange}
        placeholder="Opsional, 5 digit"
        inputMode="numeric"
        pattern="\d{5}"
        maxLength={5}
      />
    </fieldset>
  );
}
