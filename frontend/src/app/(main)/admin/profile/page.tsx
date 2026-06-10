"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck, Mail, Phone, Home, Save, Loader2, CheckCircle2,
  User as UserIcon, MapPin, Lock, Eye, EyeOff,
} from "lucide-react";
import api from "@/lib/api";
import AdminShell from "@/components/layout/AdminSidebar";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import { PROVINCES } from "@/components/features/auth/PROVINCES";
import type { ApiResponse, User } from "@/types";

export default function AdminProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<User>>("/api/auth/profile/");
      setUser(res.data.data);
    } catch {
      setError("Gagal memuat profil admin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" label="Memuat profil admin..." />
      </div>
    );
  }

  return (
    <AdminShell title="Profil Admin" subtitle="Kelola identitas, alamat, dan keamanan akun admin">
      <div className="p-4 lg:p-6 space-y-5 max-w-5xl">
        {error && <Alert message={error} onDismiss={() => setError(null)} />}
        {user && (
          <>
            <AdminProfileSummary user={user} />
            <IdentitySection user={user} onUpdated={setUser} />
            <AddressSection user={user} onUpdated={setUser} />
            <PasswordSection />
          </>
        )}
      </div>
    </AdminShell>
  );
}

function AdminProfileSummary({ user }: { user: User }) {
  const joinedAt = new Date(user.date_joined).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#1E2A4A] p-5 sm:p-6 text-white">
      <div className="absolute inset-0 batik-overlay opacity-[0.08]" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl font-extrabold text-[#1E2A4A] shadow-lg">
            {getInitials(user.full_name)}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">Akun Admin</p>
            <h2 className="text-xl font-bold">{user.full_name}</h2>
            <p className="mt-1 text-xs text-blue-100">Bergabung sejak {joinedAt}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SummaryPill Icon={Mail} label="Email" value={user.email} />
          <SummaryPill Icon={Phone} label="Telepon" value={user.phone} />
          <SummaryPill Icon={Home} label="Domisili" value={`${user.address_city}, ${user.address_province}`} />
          <SummaryPill Icon={ShieldCheck} label="Role" value="Administrator" />
        </div>
      </div>
    </section>
  );
}

function SummaryPill({ Icon, label, value }: { Icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[#60A5FA]" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-100">{label}</p>
      </div>
      <p className="mt-1 max-w-[220px] truncate text-xs font-semibold text-white">{value || "-"}</p>
    </div>
  );
}

function SectionCard({ title, subtitle, Icon, children }: {
  title: string;
  subtitle: string;
  Icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-[#EFF6FF] rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[#2563EB]" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#1E2A4A]">{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#1E2A4A] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors bg-gray-50 placeholder:text-gray-400";

function SaveButton({ saving, savedAt }: { saving: boolean; savedAt: number | null }) {
  const recentlySaved = savedAt && Date.now() - savedAt < 4000;
  return (
    <button
      type="submit"
      disabled={saving}
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
    >
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : recentlySaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
      {saving ? "Menyimpan..." : recentlySaved ? "Tersimpan" : "Simpan"}
    </button>
  );
}

function IdentitySection({ user, onUpdated }: { user: User; onUpdated: (user: User) => void }) {
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api.put<ApiResponse<User>>("/api/auth/profile/", { full_name: fullName, phone });
      if (res.data.data) {
        onUpdated(res.data.data);
        setSavedAt(Date.now());
      }
    } catch {
      setError("Gagal menyimpan data diri.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Data Diri" subtitle="Nama lengkap dan nomor kontak admin" Icon={UserIcon}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Nama Lengkap">
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputCls} required />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email">
            <input type="email" value={user.email} disabled className={inputCls + " opacity-60 cursor-not-allowed"} />
          </Field>
          <Field label="Nomor Telepon">
            <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputCls} required />
          </Field>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end pt-2"><SaveButton saving={saving} savedAt={savedAt} /></div>
      </form>
    </SectionCard>
  );
}

function AddressSection({ user, onUpdated }: { user: User; onUpdated: (user: User) => void }) {
  const [street, setStreet] = useState(user.address_street ?? "");
  const [kelurahan, setKelurahan] = useState(user.address_kelurahan ?? "");
  const [kecamatan, setKecamatan] = useState(user.address_kecamatan ?? "");
  const [city, setCity] = useState(user.address_city);
  const [province, setProvince] = useState(user.address_province);
  const [postal, setPostal] = useState(user.address_postal_code ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api.put<ApiResponse<User>>("/api/auth/profile/", {
        address_street: street,
        address_kelurahan: kelurahan,
        address_kecamatan: kecamatan,
        address_city: city,
        address_province: province,
        address_postal_code: postal,
      });
      if (res.data.data) {
        onUpdated(res.data.data);
        setSavedAt(Date.now());
      }
    } catch {
      setError("Gagal menyimpan alamat.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Alamat Admin" subtitle="Data domisili untuk keperluan audit akun" Icon={MapPin}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Jalan / Detail Alamat">
          <input value={street} onChange={(event) => setStreet(event.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Kelurahan / Desa">
            <input value={kelurahan} onChange={(event) => setKelurahan(event.target.value)} className={inputCls} />
          </Field>
          <Field label="Kecamatan">
            <input value={kecamatan} onChange={(event) => setKecamatan(event.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Kota / Kabupaten">
            <input value={city} onChange={(event) => setCity(event.target.value)} className={inputCls} required />
          </Field>
          <Field label="Provinsi">
            <select value={province} onChange={(event) => setProvince(event.target.value)} className={inputCls} required>
              {PROVINCES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Kode Pos">
            <input value={postal} onChange={(event) => setPostal(event.target.value)} className={inputCls} maxLength={5} />
          </Field>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end pt-2"><SaveButton saving={saving} savedAt={savedAt} /></div>
      </form>
    </SectionCard>
  );
}

function PasswordSection() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8 || newPassword !== confirmPassword) {
      setError("Password baru minimal 8 karakter dan konfirmasi harus cocok.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post<ApiResponse<null>>("/api/auth/change-password/", {
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSavedAt(Date.now());
    } catch {
      setError("Gagal mengganti password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Keamanan" subtitle="Ganti password akun admin" Icon={Lock}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Password Lama">
          <PasswordInput value={oldPassword} onChange={setOldPassword} show={showPassword} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Password Baru">
            <PasswordInput value={newPassword} onChange={setNewPassword} show={showPassword} />
          </Field>
          <Field label="Konfirmasi Password Baru">
            <PasswordInput value={confirmPassword} onChange={setConfirmPassword} show={showPassword} />
          </Field>
        </div>
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-[#1E2A4A]"
        >
          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showPassword ? "Sembunyikan password" : "Tampilkan password"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end pt-2"><SaveButton saving={saving} savedAt={savedAt} /></div>
      </form>
    </SectionCard>
  );
}

function PasswordInput({ value, onChange, show }: { value: string; onChange: (value: string) => void; show: boolean }) {
  return (
    <input
      type={show ? "text" : "password"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={inputCls}
      minLength={8}
      required
    />
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
