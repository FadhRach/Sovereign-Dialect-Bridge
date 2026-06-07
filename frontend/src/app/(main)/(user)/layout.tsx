import Navbar from "@/components/layout/Navbar";

/**
 * Layout untuk area user biasa (dashboard, submit, profile, complaint detail).
 *
 * Server Component — hanya render shell (background + Navbar + main).
 * Navbar tetap "use client" (pakai useState mobile menu + useAuth) tapi
 * di-treat sebagai client island di dalam Server Component layout ini.
 *
 * Route group "(user)" tidak masuk URL — `/dashboard` tetap `/dashboard`.
 */
export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#F4F5F7]">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
