"use client";

import { useEffect } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: "danger" | "primary";
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES = {
  danger: {
    iconWrap: "bg-red-50 text-red-600",
    confirm: "bg-red-600 hover:bg-red-700 focus:ring-red-500/30",
  },
  primary: {
    iconWrap: "bg-blue-50 text-[#2563EB]",
    confirm: "bg-[#2563EB] hover:bg-[#1D4ED8] focus:ring-[#2563EB]/30",
  },
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  loading = false,
  variant = "danger",
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const styles = VARIANT_STYLES[variant];

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, onCancel, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Tutup dialog"
        className="absolute inset-0 bg-[#1E2A4A]/45 backdrop-blur-sm"
        onClick={() => {
          if (!loading) onCancel();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white text-center shadow-2xl shadow-slate-900/20"
      >
        <div className={`absolute inset-x-0 top-0 h-1 ${variant === "danger" ? "bg-red-600" : "bg-[#2563EB]"}`} />
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          aria-label="Tutup dialog"
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${styles.iconWrap}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 id="confirm-dialog-title" className="text-lg font-extrabold text-[#1E2A4A]">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            {description}
          </p>
          {children && <div className="mt-4 text-left">{children}</div>}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors focus:outline-none focus:ring-4 disabled:opacity-60 ${styles.confirm}`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Memproses..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
