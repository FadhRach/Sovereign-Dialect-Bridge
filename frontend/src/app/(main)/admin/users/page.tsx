"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  X, Search, ShieldCheck, User as UserIcon, Loader2, CheckCircle2,
  Ban, Users, UserCheck, UserX, Mail, Phone, MapPin, Calendar, Activity,
} from "lucide-react";
import { useAuth } from "@/components/features/auth/AuthProvider";
import api from "@/lib/api";
import AdminShell from "@/components/layout/AdminSidebar";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import type { User, ApiResponse, UserRole } from "@/types";

type AccountStatusFilter = "" | "active" | "banned";

const ROLE_FILTERS: { value: "" | UserRole; label: string }[] = [
  { value: "", label: "Semua role" },
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

const STATUS_FILTERS: { value: AccountStatusFilter; label: string }[] = [
  { value: "", label: "Semua status" },
  { value: "active", label: "Aktif" },
  { value: "banned", label: "Nonaktif" },
];

export default function AdminUsersPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");
  const [statusFilter, setStatusFilter] = useState<AccountStatusFilter>("");
  const [selected, setSelected] = useState<User | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/dashboard");
  }, [authLoading, isAdmin, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await api.get<ApiResponse<User[]>>(`/api/admin/users/?${params}`);
      setUsers(res.data.data ?? []);
    } catch {
      setError("Gagal memuat data pengguna.");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.phone?.toLowerCase().includes(q) ||
        user.address_city?.toLowerCase().includes(q) ||
        user.address_province?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const summary = useMemo(() => buildUserSummary(users), [users]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" label="Memuat..." />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <AdminShell title="Manajemen Pengguna" subtitle={`${users.length} pengguna dalam filter aktif`}>
      <div className="p-4 lg:p-6 space-y-4">
        {error && <Alert message={error} onDismiss={() => setError(null)} />}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Total" value={summary.total} Icon={Users} color="blue" />
          <SummaryCard label="Admin" value={summary.admins} Icon={ShieldCheck} color="violet" />
          <SummaryCard label="User Aktif" value={summary.activeUsers} Icon={UserCheck} color="emerald" />
          <SummaryCard label="Nonaktif" value={summary.banned} Icon={UserX} color="red" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="grid grid-cols-1 gap-3 border-b border-gray-100 p-4 lg:grid-cols-[1fr_170px_170px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama, email, telepon, kota, atau provinsi..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as "" | UserRole)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            >
              {ROLE_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AccountStatusFilter)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            >
              {STATUS_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-gray-50/50">
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Nama</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Kontak</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Domisili</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Aduan</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Bergabung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center"><Spinner size="md" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                      Tidak ada pengguna yang cocok.
                    </td>
                  </tr>
                ) : filtered.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelected(user)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-[#EFF6FF] rounded-full flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-4 h-4 text-[#2563EB]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1E2A4A] truncate">{user.full_name}</p>
                          <p className="text-xs text-gray-400 truncate">ID #{user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700 truncate max-w-[190px]">{user.email}</p>
                      <p className="text-xs text-gray-400">{user.phone || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700 truncate max-w-[190px]">
                        {user.address_city}, {user.address_province}
                      </p>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-[#1E2A4A]">{user.complaints_total ?? 0}</p>
                      <p className="text-[11px] text-gray-400">{user.complaints_pending ?? 0} menunggu</p>
                    </td>
                    <td className="px-4 py-3"><AccountStatusBadge active={user.is_active !== false} /></td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(user.date_joined)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <UserDetailModal
          user={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updatedUser) => {
            setUsers((prev) => prev.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
            setSelected(updatedUser);
          }}
        />
      )}
    </AdminShell>
  );
}

function buildUserSummary(users: User[]) {
  return users.reduce(
    (summary, user) => {
      summary.total += 1;
      if (user.role === "admin") summary.admins += 1;
      if (user.is_active === false) summary.banned += 1;
      if (user.role === "user" && user.is_active !== false) summary.activeUsers += 1;
      return summary;
    },
    { total: 0, admins: 0, activeUsers: 0, banned: 0 }
  );
}

function SummaryCard({ label, value, Icon, color }: {
  label: string;
  value: number;
  Icon: React.ElementType;
  color: "blue" | "violet" | "emerald" | "red";
}) {
  const style = {
    blue: "bg-blue-50 text-[#2563EB]",
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  }[color];
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${style}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-extrabold text-[#1E2A4A]">{value}</p>
      <p className="text-xs font-semibold text-gray-500">{label}</p>
    </div>
  );
}

function UserDetailModal({ user, onClose, onUpdated }: {
  user: User;
  onClose: () => void;
  onUpdated: (user: User) => void;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [active, setActive] = useState(user.is_active !== false);
  const [banReason, setBanReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiresReason = active === false && user.is_active !== false;

  async function save() {
    setError(null);
    if (requiresReason && banReason.trim().length < 10) {
      setError("Alasan ban minimal 10 karakter.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch<ApiResponse<User>>(`/api/admin/users/${user.id}/`, {
        role,
        is_active: active,
        ban_reason: banReason.trim() || undefined,
      });
      if (res.data.data) onUpdated(res.data.data);
    } catch (event: unknown) {
      const message = (event as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button aria-label="Tutup detail pengguna" className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl pointer-events-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Detail Pengguna</p>
              <h2 className="text-base font-extrabold text-[#1E2A4A]">{user.full_name}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Tutup">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="relative overflow-hidden rounded-2xl bg-[#1E2A4A] p-5 text-white">
              <div className="absolute inset-0 batik-overlay opacity-[0.08]" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg font-extrabold text-[#1E2A4A]">
                    {getInitials(user.full_name)}
                  </div>
                  <div>
                    <RoleBadge role={user.role} />
                    <p className="mt-2 text-lg font-extrabold">{user.full_name}</p>
                    <p className="text-xs text-blue-100">{user.email}</p>
                  </div>
                </div>
                <AccountStatusBadge active={user.is_active !== false} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoTile Icon={Mail} label="Email" value={user.email} />
              <InfoTile Icon={Phone} label="Telepon" value={user.phone} />
              <InfoTile Icon={MapPin} label="Alamat" value={formatAddress(user)} />
              <InfoTile Icon={Calendar} label="Bergabung" value={formatDate(user.date_joined)} />
              <InfoTile Icon={Activity} label="Total Aduan" value={`${user.complaints_total ?? 0} aduan`} />
              <InfoTile Icon={CheckCircle2} label="Selesai" value={`${user.complaints_resolved ?? 0} aduan selesai`} />
            </div>

            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-bold text-[#1E2A4A]">Kontrol Akun</p>
              <p className="mt-1 text-xs text-gray-500">Role dan status aktif user dikelola dari sini.</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {(["user", "admin"] as UserRole[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setRole(item)}
                    className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                      role === item
                        ? "bg-[#2563EB] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {item === "admin" ? "Admin" : "User"}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setActive((value) => !value)}
                className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                  active
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-red-50 text-red-700 ring-1 ring-red-200"
                }`}
              >
                {active ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                {active ? "Akun aktif" : "Akun nonaktif / banned"}
              </button>

              {requiresReason && (
                <div className="mt-3">
                  <label className="mb-1.5 block text-xs font-bold text-[#1E2A4A]">Alasan ban</label>
                  <textarea
                    value={banReason}
                    onChange={(event) => setBanReason(event.target.value)}
                    rows={3}
                    placeholder="Jelaskan alasan akun dinonaktifkan..."
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              )}

              {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}

              <button
                onClick={save}
                disabled={saving}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold ring-1 ring-violet-200">
        <ShieldCheck className="w-3 h-3" />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold ring-1 ring-gray-200">
      User
    </span>
  );
}

function AccountStatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold ring-1 ring-emerald-200">
      <CheckCircle2 className="w-3 h-3" />
      Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-semibold ring-1 ring-red-200">
      <Ban className="w-3 h-3" />
      Nonaktif
    </span>
  );
}

function InfoTile({ Icon, label, value }: { Icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#2563EB]" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      </div>
      <p className="mt-1 text-sm font-bold text-[#1E2A4A]">{value || "-"}</p>
    </div>
  );
}

function formatAddress(user: User): string {
  return [
    user.address_street,
    user.address_kelurahan,
    user.address_kecamatan,
    user.address_city,
    user.address_province,
    user.address_postal_code,
  ].filter(Boolean).join(", ");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
