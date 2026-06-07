"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  X, Search, ShieldCheck, User as UserIcon, Loader2, CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/components/features/auth/AuthProvider";
import api from "@/lib/api";
import AdminShell from "@/components/layout/AdminSidebar";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import type { User, ApiResponse, UserRole } from "@/types";

export default function AdminUsersPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<User | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/dashboard");
  }, [authLoading, isAdmin, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<User[]>>("/api/admin/users/");
      setUsers(res.data.data ?? []);
    } catch {
      setError("Gagal memuat data pengguna.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.address_city?.toLowerCase().includes(q) ||
        u.address_province?.toLowerCase().includes(q)
    );
  }, [users, search]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" label="Memuat..." />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <AdminShell title="Manajemen Pengguna" subtitle={`${users.length} pengguna terdaftar`}>
        <div className="p-4 lg:p-6 space-y-4">
          {error && <Alert message={error} onDismiss={() => setError(null)} />}

          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nama, email, kota, atau provinsi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-gray-50/50">
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Nama</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden md:table-cell">Telepon</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden lg:table-cell">Kota / Provinsi</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Role</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden sm:table-cell">Status</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden md:table-cell">Bergabung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={6} className="py-12 text-center"><Spinner size="md" /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                        Tidak ada pengguna yang cocok.
                      </td>
                    </tr>
                  ) : filtered.map((u) => (
                    <tr key={u.id} onClick={() => setSelected(u)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-[#EFF6FF] rounded-full flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-3.5 h-3.5 text-[#2563EB]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1E2A4A] truncate">{u.full_name}</p>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-sm text-gray-700">{u.phone}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-sm text-gray-700 truncate max-w-[180px]">
                          {u.address_city}, {u.address_province}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {u.role === "admin" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold ring-1 ring-violet-200">
                            <ShieldCheck className="w-3 h-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold ring-1 ring-gray-200">
                            Pengguna
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {u.is_active !== false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold ring-1 ring-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-semibold ring-1 ring-red-200">
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(u.date_joined).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
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
          onUpdated={(u) => {
            setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
            setSelected(u);
          }}
        />
      )}
    </AdminShell>
  );
}

function UserDetailModal({ user, onClose, onUpdated }: {
  user: User;
  onClose: () => void;
  onUpdated: (u: User) => void;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [active, setActive] = useState(user.is_active !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch<ApiResponse<User>>(`/api/admin/users/${user.id}/`, {
        role,
        is_active: active,
      });
      if (res.data.data) onUpdated(res.data.data);
    } catch {
      setError("Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1E2A4A]">Detail Pengguna</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#EFF6FF] rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-[#2563EB]" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-[#1E2A4A] truncate">{user.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoTile label="Telepon" value={user.phone} />
              <InfoTile label="Kota" value={user.address_city} />
              <InfoTile label="Provinsi" value={user.address_province} />
              <InfoTile label="Bergabung" value={new Date(user.date_joined).toLocaleDateString("id-ID")} />
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Role</label>
                <div className="flex gap-2">
                  {(["user", "admin"] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                        role === r
                          ? "bg-[#2563EB] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {r === "admin" ? "Admin" : "Pengguna"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status Akun</label>
                <button
                  onClick={() => setActive((v) => !v)}
                  className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors ${
                    active ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"
                  }`}
                >
                  {active ? "✓ Akun Aktif (klik untuk nonaktifkan)" : "Akun Nonaktif (klik untuk aktifkan)"}
                </button>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <button
                onClick={save}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
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

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2.5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-semibold text-[#1E2A4A] mt-0.5 truncate">{value || "—"}</p>
    </div>
  );
}
