import AuthGate from "@/components/features/auth/AuthGate";

/**
 * Layout induk untuk semua route protected.
 *
 * Sengaja dibikin Server Component (tanpa "use client") — supaya halaman
 * child yang Server Component tidak ikut terbawa ke client bundle.
 * Auth check di-handle oleh AuthGate (client island). Navbar di-render
 * di nested layout (user)/layout.tsx — admin route punya layout sendiri
 * tanpa Navbar (pakai AdminSidebar).
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
