"use client";

/** Form register lengkap. Menerima `onSubmit` agar testable + reusable. */

import { useState } from "react";
import { useAuth } from "@/components/features/auth/AuthProvider";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { FormInput } from "./FormField";
import AddressSection from "./AddressSection";
import PasswordStrength from "./PasswordStrength";
import type { RegisterPayload } from "@/types";

const INITIAL: RegisterPayload = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  password_confirm: "",
  address_city: "",
  address_province: "",
  address_street: "",
  address_kelurahan: "",
  address_kecamatan: "",
  address_postal_code: "",
};

export default function RegisterForm() {
  const { register } = useAuth();
  const [form, setForm] = useState<RegisterPayload>(INITIAL);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const passwordMismatch =
    form.password_confirm.length > 0 && form.password !== form.password_confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (passwordMismatch) {
      setError("Password dan konfirmasi password tidak cocok.");
      return;
    }
    setIsLoading(true);
    const payload = sanitize(form);
    const err = await register(payload);
    if (err) {
      setError(err);
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert message={error} onDismiss={() => setError(null)} />}

      <FormInput
        id="full_name"
        label="Nama Lengkap"
        required
        value={form.full_name}
        onChange={handleChange}
        placeholder="Nama sesuai KTP"
        autoComplete="name"
      />

      <div className="grid grid-cols-2 gap-3">
        <FormInput
          id="email"
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          placeholder="email@contoh.com"
          autoComplete="email"
        />
        <FormInput
          id="phone"
          label="Nomor HP"
          type="tel"
          required
          value={form.phone}
          onChange={handleChange}
          placeholder="08xxxxxxxxxx"
          autoComplete="tel"
          pattern="^(\+62|0)8\d{8,12}$"
          hint="Format: 08xxxxxxxxxx atau +628xxxxxxxxxx"
        />
      </div>

      <AddressSection form={form} onChange={handleChange} />

      <hr className="border-gray-100" />

      <div>
        <FormInput
          id="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          placeholder="Minimal 8 karakter"
        />
        <PasswordStrength password={form.password} />
        <button
          type="button"
          onClick={() => setShowPassword((p) => !p)}
          className="text-xs text-gray-500 hover:text-gray-700 mt-1"
        >
          {showPassword ? "Sembunyikan" : "Tampilkan"} password
        </button>
      </div>

      <FormInput
        id="password_confirm"
        label="Konfirmasi Password"
        type={showPassword ? "text" : "password"}
        required
        autoComplete="new-password"
        value={form.password_confirm}
        onChange={handleChange}
        placeholder="Ulangi password"
        invalid={passwordMismatch}
        hint={passwordMismatch ? "Password tidak cocok" : undefined}
      />

      <button
        type="submit"
        disabled={isLoading || passwordMismatch}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 mt-2"
      >
        {isLoading ? (
          <>
            <Spinner size="sm" />
            <span>Mendaftar...</span>
          </>
        ) : (
          "Buat Akun"
        )}
      </button>
    </form>
  );
}

/** Hapus field optional yang kosong agar tidak dikirim sebagai "" ke backend. */
function sanitize(payload: RegisterPayload): RegisterPayload {
  const cleaned = { ...payload };
  const optional: (keyof RegisterPayload)[] = [
    "address_street",
    "address_kelurahan",
    "address_kecamatan",
    "address_postal_code",
  ];
  for (const key of optional) {
    if (!cleaned[key]) delete cleaned[key];
  }
  return cleaned;
}
