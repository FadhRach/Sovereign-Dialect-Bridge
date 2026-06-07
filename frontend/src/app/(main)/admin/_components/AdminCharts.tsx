/**
 * Charts untuk admin dashboard:
 *   - WeeklyTrendChart: bar chart 8 minggu terakhir
 *   - CategoryDonut: donut chart distribusi kategori (top 6)
 *
 * Keduanya pure-render — terima data via props, tidak punya state sendiri.
 */

import { CATEGORY_PALETTE, formatWeekLabel } from "./constants";

export function WeeklyTrendChart({ weekly }: { weekly?: { week: string; count: number }[] }) {
  const safeWeekly = weekly ?? [];
  const maxTrend = Math.max(...(safeWeekly.map((w) => w.count) ?? [1]), 1);
  const total = safeWeekly.reduce((s, w) => s + w.count, 0);
  const isEmpty = safeWeekly.length === 0 || safeWeekly.every((w) => w.count === 0);

  return (
    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-[#1E2A4A]">Tren Aduan 8 Minggu Terakhir</h2>
        <span className="text-xs text-gray-400">
          Total: <span className="font-bold text-[#1E2A4A]">{total}</span>
        </span>
      </div>
      {isEmpty ? (
        <p className="text-sm text-gray-400 text-center py-8">Belum ada data tren</p>
      ) : (
        <div className="flex items-end gap-2 h-36">
          {safeWeekly.map((w, i) => (
            <div key={w.week} className="flex-1 flex flex-col items-center gap-1 min-w-0 group">
              <span className="text-[10px] text-gray-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                {w.count}
              </span>
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ease-out hover:opacity-100 ${
                  i === safeWeekly.length - 1 ? "bg-[#2563EB]" : "bg-[#2563EB]/60"
                }`}
                style={{ height: `${Math.max((w.count / maxTrend) * 110, 6)}px` }}
              />
              <span className="text-[9px] text-gray-400 truncate w-full text-center font-medium">
                {formatWeekLabel(w.week)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryDonut({ categories }: { categories?: { name: string; count: number }[] }) {
  if (!categories || categories.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-[#1E2A4A] mb-4">Distribusi Kategori</h2>
        <p className="text-sm text-gray-400 text-center py-8">Belum ada data kategori</p>
      </div>
    );
  }

  const top = categories.slice(0, 6);
  const total = top.reduce((s, c) => s + c.count, 0) || 1;

  let cumulative = 0;
  const segments = top.map((cat, i) => {
    const start = (cumulative / total) * 360;
    cumulative += cat.count;
    const end = (cumulative / total) * 360;
    return { ...cat, start, end, color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] };
  });

  const gradient = segments.map((s) => `${s.color} ${s.start}deg ${s.end}deg`).join(", ");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="text-sm font-bold text-[#1E2A4A] mb-4">Distribusi Kategori</h2>
      <div className="flex items-center gap-5">
        <div
          className="relative w-28 h-28 rounded-full flex-shrink-0"
          style={{ background: `conic-gradient(${gradient})` }}
        >
          <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total</span>
            <span className="text-lg font-bold text-[#1E2A4A] leading-none">{total}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          {segments.map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-gray-600 truncate flex-1">{s.name}</span>
              <span className="text-xs font-bold text-[#1E2A4A] flex-shrink-0">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
