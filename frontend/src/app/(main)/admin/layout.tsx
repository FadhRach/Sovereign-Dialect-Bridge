/**
 * Layout untuk area admin (dashboard, map, users).
 *
 * Server Component — sengaja TIDAK render Navbar. Setiap halaman admin
 * pakai AdminSidebar (via AdminShell) untuk navigasi sendiri.
 *
 * Pemisahan ini supaya halaman /admin/* tidak terbebani Navbar yang
 * tidak relevan, dan layout induk (main)/layout.tsx tidak perlu cek
 * `pathname.startsWith("/admin")` (yang dulu maksa "use client").
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
