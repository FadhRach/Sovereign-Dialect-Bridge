"use client";

import { useEffect, useRef, useState } from "react";

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => Promise<string | null>;
  onError: (message: string) => void;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccounts {
  id: {
    initialize: (options: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
      auto_select?: boolean;
    }) => void;
    renderButton: (
      element: HTMLElement,
      options: {
        theme: "outline" | "filled_blue";
        size: "large" | "medium" | "small";
        width?: number;
        text?: "signin_with" | "continue_with";
        shape?: "rectangular" | "pill";
      }
    ) => void;
  };
}

declare global {
  interface Window {
    google?: { accounts?: GoogleAccounts };
  }
}

const GOOGLE_SCRIPT_ID = "google-identity-services";

export default function GoogleSignInButton({ onCredential, onError }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !containerRef.current) return;
    const configuredClientId = clientId;

    function renderButton() {
      if (!window.google?.accounts || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: configuredClientId,
        auto_select: false,
        callback: async (response) => {
          if (!response.credential) {
            onError("Credential Google tidak ditemukan.");
            return;
          }
          setLoading(true);
          const error = await onCredential(response.credential);
          if (error) {
            onError(error);
            setLoading(false);
          }
        },
      });
      containerRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 320,
      });
    }

    if (window.google?.accounts) {
      renderButton();
      return;
    }

    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", renderButton, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    script.onerror = () => onError("Gagal memuat Google Sign-In.");
    document.head.appendChild(script);
  }, [clientId, onCredential, onError]);

  if (!clientId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-center text-xs text-gray-500">
        Login Google belum dikonfigurasi.
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div ref={containerRef} className={loading ? "hidden" : ""} />
      {loading && <GoogleAuthLoader />}
    </div>
  );
}

function GoogleAuthLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative w-full overflow-hidden rounded-2xl border border-[#D7E4FF] bg-[#F8FBFF] px-4 py-3.5 shadow-[0_16px_40px_rgba(37,99,235,0.10)]"
    >
      <div className="auth-bridge-bar absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2563EB] via-[#60A5FA] to-[#2563EB]" />
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white shadow-inner">
          <span className="auth-bridge-orbit absolute h-9 w-9 rounded-full border border-[#2563EB]/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB] shadow-[0_0_18px_rgba(37,99,235,0.60)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-[#1E2A4A]">Menghubungkan akun Google</p>
          <p className="mt-0.5 text-xs text-gray-500">Verifikasi identitas sedang berjalan.</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E5EDFF]">
            <span className="auth-bridge-scan block h-full w-1/2 rounded-full bg-gradient-to-r from-[#2563EB] via-[#60A5FA] to-[#2563EB]" />
          </div>
        </div>
      </div>
    </div>
  );
}
