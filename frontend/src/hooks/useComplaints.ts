"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import type { Complaint, ApiResponse } from "@/lib/types";

interface UseComplaintsOptions {
  status?: string;
  urgency?: string;
  pollingId?: number | null;
}

export function useComplaints(options: UseComplaintsOptions = {}) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplaints = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (options.status) params.set("status", options.status);
      if (options.urgency) params.set("urgency", options.urgency);
      const res = await api.get<ApiResponse<Complaint[]>>(`/api/complaints/?${params}`);
      setComplaints(res.data.data ?? []);
      setError(null);
    } catch {
      setError("Gagal memuat aduan.");
    } finally {
      setIsLoading(false);
    }
  }, [options.status, options.urgency]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  return { complaints, isLoading, error, refetch: fetchComplaints };
}

export function useComplaintDetail(id: number) {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<Complaint>>(`/api/complaints/${id}/`);
      setComplaint(res.data.data);
      setError(null);
    } catch {
      setError("Gagal memuat detail aduan.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
    // Polling setiap 3 detik selama summary belum tersedia (NLP masih diproses)
    const interval = setInterval(() => {
      if (complaint && !complaint.summary) fetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetch, complaint]);

  return { complaint, isLoading, error, refetch: fetch };
}
