/**
 * Tabel aduan untuk admin dashboard — sortable + clickable row.
 *
 * Klik row → trigger onRowClick(id) di parent (mis. buka QuickReviewModal).
 */

"use client";

import { Search, ChevronUp, ChevronDown } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import UrgencyIndicator from "@/components/ui/UrgencyIndicator";
import DialectBadge from "@/components/ui/DialectBadge";
import { SkeletonRow } from "@/components/ui/Skeleton";
import type { Complaint } from "@/types";
import { formatDate, type SortKey } from "./constants";

interface AdminComplaintTableProps {
  complaints: Complaint[];
  isLoading: boolean;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  activeFilterCount: number;
  onSort: (key: SortKey) => void;
  onRowClick: (id: number) => void;
  onResetFilters: () => void;
}

export default function AdminComplaintTable({
  complaints, isLoading, sortKey, sortDir, activeFilterCount,
  onSort, onRowClick, onResetFilters,
}: AdminComplaintTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px]">
        <thead className="bg-gray-50/50">
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Pelapor</th>
            <SortHeader label="Wilayah" sortKey="wilayah" currentKey={sortKey} dir={sortDir} onClick={onSort} />
            <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden md:table-cell">Dialek</th>
            <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden lg:table-cell">Kategori</th>
            <SortHeader label="Urgensi" sortKey="urgency_level" currentKey={sortKey} dir={sortDir} onClick={onSort} />
            <SortHeader label="Status" sortKey="status" currentKey={sortKey} dir={sortDir} onClick={onSort} />
            <SortHeader label="Tanggal" sortKey="created_at" currentKey={sortKey} dir={sortDir} onClick={onSort} />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : complaints.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-16 text-center">
                <div className="inline-flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <Search className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Tidak ada aduan yang sesuai filter</p>
                  {activeFilterCount > 0 && (
                    <button onClick={onResetFilters} className="text-xs text-[#2563EB] hover:underline mt-1">
                      Reset filter
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            complaints.map((c) => (
              <tr
                key={c.id}
                onClick={() => onRowClick(c.id)}
                className="hover:bg-blue-50/40 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-[#1E2A4A] leading-none truncate max-w-[140px]">
                    {c.user.full_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[140px]">{c.user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-700 max-w-[140px] truncate">{c.wilayah || "—"}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {c.detected_dialect && c.detected_dialect !== "xx" ? (
                    <DialectBadge code={c.detected_dialect} />
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <p className="text-sm text-gray-700">{c.category?.name ?? "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <UrgencyIndicator level={c.urgency_level} variant="badge" />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} withIcon={false} />
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-gray-500 whitespace-nowrap">{formatDate(c.created_at)}</p>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortHeader({
  label, sortKey, currentKey, dir, onClick,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: "asc" | "desc";
  onClick: (key: SortKey) => void;
}) {
  const isActive = sortKey === currentKey;
  return (
    <th
      onClick={() => onClick(sortKey)}
      className="text-left text-xs font-semibold text-gray-500 px-4 py-3 cursor-pointer hover:bg-gray-100/50 transition-colors select-none"
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          dir === "asc" ? <ChevronUp className="w-3 h-3 text-[#2563EB]" /> : <ChevronDown className="w-3 h-3 text-[#2563EB]" />
        ) : (
          <ChevronDown className="w-3 h-3 text-gray-300" />
        )}
      </div>
    </th>
  );
}
