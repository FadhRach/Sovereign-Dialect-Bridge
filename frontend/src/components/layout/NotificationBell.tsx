"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Bell, Check, X, Inbox } from "lucide-react";
import api from "@/lib/api";
import type { ApiResponse, Notification, NotificationResponse } from "@/types";

function relativeTime(iso: string): string {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "baru saja";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m lalu`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}j lalu`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d}h lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [data, setData] = useState<NotificationResponse>({ results: [], unread: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<NotificationResponse>>("/api/notifications/");
      if (res.data.data) setData(res.data.data);
    } catch {
      // silent fail — bell tetap render
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30000); // refresh tiap 30 detik
    return () => clearInterval(t);
  }, [fetchData]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function markAllRead() {
    try {
      await api.post<ApiResponse<null>>("/api/notifications/read/");
      setData((d) => ({
        ...d,
        unread: 0,
        results: d.results.map((n) => ({ ...n, is_read: true })),
      }));
    } catch {/* noop */}
  }

  async function markRead(id: number) {
    try {
      await api.post<ApiResponse<null>>(`/api/notifications/${id}/read/`);
      setData((d) => ({
        unread: Math.max(0, d.unread - 1),
        results: d.results.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      }));
    } catch {/* noop */}
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-[#1E2A4A] transition-colors"
        aria-label={`Notifikasi (${data.unread} belum dibaca)`}
      >
        <Bell className="w-4 h-4" />
        {data.unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
            {data.unread > 9 ? "9+" : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#1E2A4A]">Notifikasi</p>
              <p className="text-[10px] text-gray-400">
                {data.unread > 0 ? `${data.unread} belum dibaca` : "Semua sudah dibaca"}
              </p>
            </div>
            {data.unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold"
              >
                <Check className="w-3 h-3" />
                Tandai semua
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {data.results.length === 0 ? (
              <div className="py-12 text-center">
                <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Belum ada notifikasi</p>
              </div>
            ) : (
              data.results.map((n) => {
                const inner = (
                  <div
                    className={`mx-2 my-1 rounded-2xl border px-3 py-3 transition-all duration-200 hover:border-blue-100 hover:bg-blue-50/50 hover:shadow-sm ${
                      !n.is_read ? "border-blue-100 bg-blue-50/50" : "border-gray-100 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full mt-2 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold text-[#1E2A4A] ${expandedId === n.id ? "" : "truncate"}`}>
                          {n.title}
                        </p>
                        <p className={`text-xs text-gray-600 mt-1 leading-relaxed ${expandedId === n.id ? "line-clamp-none" : "line-clamp-2"}`}>
                          {n.message}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-[10px] text-gray-400">{relativeTime(n.created_at)}</p>
                          {expandedId !== n.id && (
                            <span className="text-[10px] font-semibold text-[#2563EB] opacity-0 transition-opacity group-hover:opacity-100">
                              Hover untuk detail
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
                if (n.complaint_id) {
                  return (
                    <Link
                      key={n.id}
                      href={`/complaint/${n.complaint_id}`}
                      onMouseEnter={() => setExpandedId(n.id)}
                      onMouseLeave={() => setExpandedId((current) => (current === n.id ? null : current))}
                      onFocus={() => setExpandedId(n.id)}
                      onBlur={() => setExpandedId((current) => (current === n.id ? null : current))}
                      onClick={() => { setOpen(false); if (!n.is_read) markRead(n.id); }}
                      className="block group"
                    >
                      {inner}
                    </Link>
                  );
                }
                return (
                  <button
                    key={n.id}
                    onMouseEnter={() => setExpandedId(n.id)}
                    onMouseLeave={() => setExpandedId((current) => (current === n.id ? null : current))}
                    onFocus={() => setExpandedId(n.id)}
                    onBlur={() => setExpandedId((current) => (current === n.id ? null : current))}
                    onClick={() => { if (!n.is_read) markRead(n.id); }}
                    className="block w-full text-left group"
                  >
                    {inner}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
