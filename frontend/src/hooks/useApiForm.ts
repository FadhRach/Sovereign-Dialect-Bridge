"use client";

/**
 * Hook untuk submit form ke API dengan handling loading + error + extract message.
 *
 * Pakai:
 *   const { submit, loading, error } = useApiForm(async (payload: Payload) => {
 *     return api.post<ApiResponse<Result>>("/api/something/", payload);
 *   }, { onSuccess: () => router.push("/dashboard") });
 *
 *   <form onSubmit={(e) => { e.preventDefault(); submit(data); }}>...
 */

import { useCallback, useState } from "react";

interface UseApiFormOptions<TResponse> {
  onSuccess?: (res: TResponse) => void;
  defaultError?: string;
}

interface UseApiFormResult<TPayload> {
  submit: (payload: TPayload) => Promise<void>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

export function useApiForm<TPayload, TResponse>(
  fn: (payload: TPayload) => Promise<TResponse>,
  options: UseApiFormOptions<TResponse> = {}
): UseApiFormResult<TPayload> {
  const { onSuccess, defaultError = "Gagal memproses. Coba lagi." } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (payload: TPayload) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fn(payload);
        onSuccess?.(res);
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg || defaultError);
      } finally {
        setLoading(false);
      }
    },
    [fn, onSuccess, defaultError]
  );

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return { submit, loading, error, reset };
}
