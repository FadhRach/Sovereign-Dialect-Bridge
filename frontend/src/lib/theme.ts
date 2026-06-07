/**
 * Design tokens — satu sumber kebenaran untuk warna brand.
 *
 * Sebagian besar tempat sebaiknya pakai Tailwind class (`bg-brand-blue`,
 * lihat tailwind.config.ts). File ini dipakai saat kita butuh warna sebagai
 * nilai runtime — misal chart inline style, marker leaflet, dll.
 */

export const COLORS = {
  // Brand
  navy: "#1E2A4A",
  blue: "#2563EB",
  blueDark: "#1D4ED8",
  blueLight: "#EFF6FF",
  accent: "#60A5FA",

  // Surface
  bg: "#F4F5F7",

  // Urgency (sinkron dengan UrgencyIndicator)
  urgencyCritical: "#E24B4A",
  urgencyHigh: "#EF9F27",
  urgencyMedium: "#A28A2A",
  urgencyLow: "#888780",
} as const;

/**
 * Palet kategori untuk donut/bar chart admin dashboard.
 * Urutan stabil supaya warna kategori sama antar render.
 */
export const CATEGORY_PALETTE = [
  "#2563EB", "#7C3AED", "#DB2777", "#F59E0B",
  "#10B981", "#06B6D4", "#EF4444", "#8B5CF6",
] as const;
