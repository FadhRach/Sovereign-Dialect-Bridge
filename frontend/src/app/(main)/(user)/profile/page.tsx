"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, User as UserIcon, MapPin, Lock, Save, Loader2, Eye, EyeOff, CheckCircle2,
  Mail, Phone, ShieldCheck, Home,
} from "lucide-react";
import api from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import { PROVINCES } from "@/components/features/auth/PROVINCES";
import type { ApiResponse, User } from "@/types";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<User>>("/api/auth/profile/");
      setUser(res.data.data);
    } catch {
      setError("Gagal memuat profil.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" label="Memuat profil..." />
      </div>
    );
  }
  if (!user) {
    return <div className="container mx-auto py-6 max-w-3xl">{error && <Alert message={error} />}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1E2A4A] mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E2A4A]">Profil Saya</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola data diri, alamat, dan keamanan akun</p>
      </div>

      <div className="space-y-5">
        <ProfileSummary user={user} />
        <IdentitySection user={user} onUpdated={setUser} />
        <AddressSection user={user} onUpdated={setUser} />
        <PasswordSection />
      </div>
    </div>
  );
}

function ProfileSummary({ user }: { user: User }) {
  const completeness = getProfileCompleteness(user);
  const joinedAt = new Date(user.date_joined).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#1E2A4A] p-5 sm:p-6 text-white">
      <div className="absolute inset-0 batik-overlay opacity-[0.08]" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl font-extrabold text-[#1E2A4A] shadow-lg">
            {getInitials(user.full_name)}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">Akun Warga</p>
            <h2 className="text-xl font-bold">{user.full_name}</h2>
            <p className="mt-1 text-xs text-blue-100">Bergabung sejak {joinedAt}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SummaryPill Icon={Mail} label="Email" value={user.email} />
          <SummaryPill Icon={Phone} label="Telepon" value={user.phone} />
          <SummaryPill Icon={Home} label="Domisili" value={`${user.address_city}, ${user.address_province}`} />
          <SummaryPill Icon={ShieldCheck} label="Kelengkapan" value={`${completeness}% data`} />
        </div>
      </div>
      <div className="relative mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-blue-100">
          <span>Kelengkapan profil</span>
          <span>{completeness}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-[#60A5FA]" style={{ width: `${completeness}%` }} />
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getProfileCompleteness(user: User): number {
  const fields = [
    user.full_name,
    user.email,
    user.phone,
    user.address_city,
    user.address_province,
    user.address_street,
    user.address_kelurahan,
    user.address_kecamatan,
    user.address_postal_code,
  ];
  const filled = fields.filter((field) => Boolean(field && String(field).trim())).length;
  return Math.round((filled / fields.length) * 100);
}

function SectionCard({
  title, subtitle, Icon, children,
}: { title: string; subtitle: string; Icon: React.ElementType; children: React.ReactNode }) {
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

function IdentitySection({ user, onUpdated }: { user: User; onUpdated: (u: User) => void }) {
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await api.put<ApiResponse<User>>("/api/auth/profile/", { full_name: fullName, phone });
      if (res.data.data) {
        onUpdated(res.data.data);
        setSavedAt(Date.now());
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErr(msg || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Data Diri"
      subtitle="Nama lengkap & nomor telepon"
      Icon={UserIcon}
    >
      <form onSubmit={save} className="space-y-4">
        <Field label="Nama Lengkap">
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} required />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email (read-only)">
            <input type="email" value={user.email} disabled className={inputCls + " opacity-60 cursor-not-allowed"} />
          </Field>
          <Field label="Nomor Telepon">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} required />
          </Field>
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex justify-end pt-2">
          <SaveButton saving={saving} savedAt={savedAt} />
        </div>
      </form>
    </SectionCard>
  );
}

function AddressSection({ user, onUpdated }: { user: User; onUpdated: (u: User) => void }) {
  const [street, setStreet] = useState(user.address_street ?? "");
  const [kel, setKel] = useState(user.address_kelurahan ?? "");
  const [kec, setKec] = useState(user.address_kecamatan ?? "");
  const [city, setCity] = useState(user.address_city);
  const [province, setProvince] = useState(user.address_province);
  const [postal, setPostal] = useState(user.address_postal_code ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await api.put<ApiResponse<User>>("/api/auth/profile/", {
        address_street: street,
        address_kelurahan: kel,
        address_kecamatan: kec,
        address_city: city,
        address_province: province,
        address_postal_code: postal,
      });
      if (res.data.data) {
        onUpdated(res.data.data);
        setSavedAt(Date.now());
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErr(msg || "Gagal menyimpan alamat.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Alamat Lengkap" subtitle="Edit detail alamat tempat tinggal" Icon={MapPin}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Jalan / Detail Alamat">
          <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} className={inputCls} placeholder="Contoh: Jl. Sukamaju No. 12 RT 03 RW 05" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Kelurahan / Desa">
            <input type="text" value={kel} onChange={(e) => setKel(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Kecamatan">
            <input type="text" value={kec} onChange={(e) => setKec(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Kota / Kabupaten *">
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Provinsi *">
            <select value={province} onChange={(e) => setProvince(e.target.value)} className={inputCls} required>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Kode Pos">
            <input type="text" inputMode="numeric" maxLength={5} value={postal} onChange={(e) => setPostal(e.target.value)} className={inputCls} />
          </Field>
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex justify-end pt-2">
          <SaveButton saving={saving} savedAt={savedAt} />
        </div>
      </form>
    </SectionCard>
  );
}

function PasswordSection() {
  const [oldP, setOldP] = useState("");
  const [newP, setNewP] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const valid = oldP.length >= 6 && newP.length >= 8 && newP === confirm;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setErr("Periksa: password lama, baru min 8 karakter, dan konfirmasi cocok.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await api.post<ApiResponse<null>>("/api/auth/change-password/", {
        old_password: oldP,
        new_password: newP,
        new_password_confirm: confirm,
      });
      setSavedAt(Date.now());
      setOldP(""); setNewP(""); setConfirm("");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErr(msg || "Gagal mengubah password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Keamanan" subtitle="Ganti password akun" Icon={Lock}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Password Lama">
          <div className="relative">
            <input
              type={showOld ? "text" : "password"}
              value={oldP}
              onChange={(e) => setOldP(e.target.value)}
              className={inputCls + " pr-11"}
              required
            />
            <button type="button" onClick={() => setShowOld((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Password Baru (min 8 karakter)">
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newP}
                onChange={(e) => setNewP(e.target.value)}
                className={inputCls + " pr-11"}
                minLength={8}
                required
              />
              <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="Konfirmasi Password Baru">
            <input
              type={showNew ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
              required
            />
          </Field>
        </div>
        {confirm.length > 0 && newP !== confirm && (
          <p className="text-xs text-red-600">Konfirmasi password tidak cocok</p>
        )}
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex justify-end pt-2">
          <SaveButton saving={saving} savedAt={savedAt} />
        </div>
      </form>
    </SectionCard>
  );
}
