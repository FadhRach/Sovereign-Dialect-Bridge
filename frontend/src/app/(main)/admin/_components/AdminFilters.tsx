/**
 * Filter bar untuk admin complaint table — search + 3 dropdown + reset + export CSV.
 *
 * Stateless: parent (page.tsx) yang pegang state, komponen ini cuma render UI.
 */

"use client";

import { useState } from "react";
import { Search, FilterX, Download } from "lucide-react";
import { STATUS_FILTER, URGENCY_FILTER, DIALECT_FILTER } from "./constants";

interface AdminFiltersProps {
  statusFilter: string;
  urgencyFilter: string;
  dialectFilter: string;
  search: string;
  onStatusChange: (v: string) => void;
  onUrgencyChange: (v: string) => void;
  onDialectChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onReset: () => void;
  onExportCsv: () => void;
}

export default function AdminFilters({
  statusFilter, urgencyFilter, dialectFilter, search,
  onStatusChange, onUrgencyChange, onDialectChange, onSearchChange,
  onReset, onExportCsv,
}: AdminFiltersProps) {
  const [searchInput, setSearchInput] = useState(search);
  const activeFilterCount = [statusFilter, urgencyFilter, dialectFilter, search].filter(Boolean).length;

  return (
    <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari pelapor, wilayah, atau isi aduan..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSearchChange(searchInput); }}
            onBlur={() => onSearchChange(searchInput)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors"
          />
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={() => { setSearchInput(""); onReset(); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <FilterX className="w-3.5 h-3.5" />
            Reset ({activeFilterCount})
          </button>
        )}
        <button
          onClick={onExportCsv}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg transition-colors"
          title="Unduh CSV dengan filter saat ini"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterSelect value={statusFilter} onChange={onStatusChange} options={STATUS_FILTER} />
        <FilterSelect value={urgencyFilter} onChange={onUrgencyChange} options={URGENCY_FILTER} />
        <FilterSelect value={dialectFilter} onChange={onDialectChange} options={DIALECT_FILTER} />
      </div>
    </div>
  );
}

function FilterSelect({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 transition-colors ${
        value
          ? "bg-[#EFF6FF] text-[#2563EB] border-[#2563EB]/30"
          : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
      }`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
