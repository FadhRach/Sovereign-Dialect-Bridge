"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings, Save, Loader2, Cpu, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import { useAuth } from "@/components/features/auth/AuthProvider";
import api from "@/lib/api";
import AdminShell from "@/components/layout/AdminSidebar";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";
import type { AdminSetting, AdminSettingsResponse, ApiResponse } from "@/types";

export default function AdminSettingsPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [modelStatus, setModelStatus] = useState<AdminSettingsResponse["model_status"]>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/dashboard");
  }, [authLoading, isAdmin, router]);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<AdminSettingsResponse>>("/api/admin/settings/");
      const payload = res.data.data;
      setSettings(payload?.settings ?? []);
      setModelStatus(payload?.model_status ?? {});
      setDrafts(Object.fromEntries((payload?.settings ?? []).map((item) => [item.key, item.value])));
    } catch {
      setError("Gagal memuat setting admin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const neuralEnabled = useMemo(() => {
    const item = settings.find((setting) => setting.key === "NLP_ENABLED");
    return (drafts.NLP_ENABLED ?? item?.value ?? "false") === "true";
  }, [drafts.NLP_ENABLED, settings]);

  async function saveSetting(setting: AdminSetting) {
    setSavingKey(setting.key);
    setError(null);
    try {
      const res = await api.patch<ApiResponse<AdminSetting>>("/api/admin/settings/", {
        key: setting.key,
        value: drafts[setting.key] ?? setting.value,
      });
      if (res.data.data) {
        setSettings((prev) => prev.map((item) => (item.key === setting.key ? res.data.data! : item)));
        setDrafts((prev) => ({ ...prev, [setting.key]: res.data.data!.value }));
        setSavedKey(setting.key);
      }
    } catch (event: unknown) {
      const message = (event as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Gagal menyimpan setting.");
    } finally {
      setSavingKey(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" label="Memuat setting..." />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <AdminShell title="Pengaturan Sistem" subtitle="Runtime config non-secret untuk pipeline dan model">
      <div className="p-4 lg:p-6 space-y-5">
        {error && <Alert message={error} onDismiss={() => setError(null)} />}

        <section className="relative overflow-hidden rounded-3xl bg-[#1E2A4A] p-5 text-white">
          <div className="absolute inset-0 batik-overlay opacity-[0.08]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#60A5FA]" />
                <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Admin Runtime Settings</p>
              </div>
              <h2 className="text-2xl font-extrabold">Kontrol pipeline tanpa buka secrets</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-100">
                Setting di sini hanya untuk value non-secret. Database URL, API key, dan credential tetap harus diatur lewat environment provider.
              </p>
            </div>
            <div className={`rounded-2xl px-4 py-3 ring-1 ${neuralEnabled ? "bg-emerald-500/15 text-emerald-100 ring-emerald-300/30" : "bg-white/10 text-blue-100 ring-white/10"}`}>
              <p className="text-xs font-bold uppercase tracking-wider">Mode NLP</p>
              <p className="mt-1 text-lg font-extrabold">{neuralEnabled ? "Neural aktif" : "Fallback ringan"}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-5">
          <section className="space-y-3">
            {settings.map((setting) => (
              <SettingCard
                key={setting.key}
                setting={setting}
                value={drafts[setting.key] ?? setting.value}
                saving={savingKey === setting.key}
                saved={savedKey === setting.key}
                onValueChange={(value) => setDrafts((prev) => ({ ...prev, [setting.key]: value }))}
                onSave={() => saveSetting(setting)}
              />
            ))}
          </section>

          <section className="h-fit rounded-3xl border border-gray-100 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#2563EB]" />
              <h2 className="text-sm font-extrabold text-[#1E2A4A]">Status Model</h2>
            </div>
            <div className="space-y-2">
              {Object.entries(modelStatus).map(([name, status]) => (
                <div key={name} className="rounded-2xl bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[#1E2A4A] uppercase">{name}</p>
                    <ModelStatusBadge status={status} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {status.error ? status.error : `${status.load_ms ?? status.elapsed_ms ?? 0} ms`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function SettingCard({
  setting,
  value,
  saving,
  saved,
  onValueChange,
  onSave,
}: {
  setting: AdminSetting;
  value: string;
  saving: boolean;
  saved: boolean;
  onValueChange: (value: string) => void;
  onSave: () => void;
}) {
  const dirty = value !== setting.value;

  return (
    <article className="rounded-3xl border border-gray-100 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-[#1E2A4A]">{setting.label}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              setting.source === "database" ? "bg-blue-50 text-[#2563EB]" : "bg-gray-100 text-gray-500"
            }`}>
              {setting.source}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">{setting.description}</p>
          <p className="mt-2 text-[11px] font-mono text-gray-400">{setting.key}</p>
        </div>

        <div className="w-full lg:w-64">
          <SettingInput setting={setting} value={value} onValueChange={onValueChange} />
          {setting.type === "csv" && (
            <p className="mt-1 text-[11px] text-gray-400">Pisahkan beberapa value dengan koma.</p>
          )}
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving || !dirty}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Menyimpan" : saved ? "Tersimpan" : "Simpan"}
        </button>
      </div>
    </article>
  );
}

function SettingInput({ setting, value, onValueChange }: {
  setting: AdminSetting;
  value: string;
  onValueChange: (value: string) => void;
}) {
  if (setting.type === "boolean") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {["true", "false"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onValueChange(item)}
            className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
              value === item ? "bg-[#2563EB] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {item === "true" ? "Aktif" : "Nonaktif"}
          </button>
        ))}
      </div>
    );
  }

  if (setting.type === "choice") {
    return (
      <select
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
      >
        {setting.choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
      </select>
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
    />
  );
}

function ModelStatusBadge({ status }: { status: { loading?: boolean; loaded?: boolean; failed?: boolean } }) {
  if (status.failed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
        <AlertCircle className="h-3 w-3" />
        Failed
      </span>
    );
  }
  if (status.loaded) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </span>
    );
  }
  if (status.loading) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-[#2563EB]">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">
      <Clock className="h-3 w-3" />
      Standby
    </span>
  );
}
