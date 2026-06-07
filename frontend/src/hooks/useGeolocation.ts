"use client";

/**
 * Hook wrapper untuk browser geolocation API.
 *
 * Pakai:
 *   const { coords, loading, error, request } = useGeolocation();
 *   <button onClick={request}>Pakai Lokasi Saya</button>
 *
 * Catatan: request() butuh user gesture (klik tombol). Browser modern
 * akan reject jika dipanggil dari useEffect tanpa interaksi user.
 */

import { useCallback, useState } from "react";

interface Coords {
  latitude: number;
  longitude: number;
}

interface UseGeolocationResult {
  coords: Coords | null;
  loading: boolean;
  error: string | null;
  request: () => void;
  reset: () => void;
}

export function useGeolocation(): UseGeolocationResult {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Browser Anda tidak mendukung geolokasi.");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLoading(false);
      },
      () => {
        setError("Gagal mengambil lokasi. Pastikan izin sudah diberikan.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const reset = useCallback(() => {
    setCoords(null);
    setError(null);
    setLoading(false);
  }, []);

  return { coords, loading, error, request, reset };
}
