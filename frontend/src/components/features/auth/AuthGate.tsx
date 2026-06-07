"use client";

/**
 * Client island untuk auth check.
 *
 * Dipakai oleh src/app/(main)/layout.tsx — supaya layout induk bisa tetap
 * Server Component. Dengan begitu, halaman child yang Server Component
 * (mis. /submit) tidak ikut terbawa client bundle.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import Spinner from "@/components/ui/Spinner";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" label="Memuat..." />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
