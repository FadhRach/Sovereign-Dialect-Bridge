"use client";

/**
 * Hook generic untuk fetch data: loading + error + refetch dalam satu paket.
 *
 * Pakai:
 *   const { data, isLoading, error, refetch } = useFetch<DashboardStats>(
 *     "/api/dashboard/stats/",
 *     { errorMessage: "Gagal memuat statistik." }
 *   );
 *
 * Pass `null` ke url untuk skip fetch (conditional).
 */

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";

interface UseFetchOptions {
  errorMessage?: string;
  skip?: boolean;
}

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFetch<T>(
  url: string | null,
  options: UseFetchOptions = {}
): UseFetchResult<T> {
  const { errorMessage = "Gagal memuat data.", skip = false } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(!skip && url !== null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!url || skip) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse<T>>(url);
      setData(res.data.data);
    } catch {
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [url, skip, errorMessage]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}
