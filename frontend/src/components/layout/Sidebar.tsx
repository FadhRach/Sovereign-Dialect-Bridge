"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

// TODO: gunakan di admin layout jika dibutuhkan
export default function Sidebar() {
  const { isAdmin: adminRole } = useAuth();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-4">
      <nav className="flex flex-col gap-2">
        <Link href="/dashboard" className="text-sm text-gray-700 hover:text-blue-600">Dashboard</Link>
        <Link href="/submit" className="text-sm text-gray-700 hover:text-blue-600">Submit Aduan</Link>
        {adminRole && (
          <>
            <Link href="/admin" className="text-sm text-gray-700 hover:text-blue-600">Admin Panel</Link>
            <Link href="/admin/map" className="text-sm text-gray-700 hover:text-blue-600">Peta Aduan</Link>
            <Link href="/admin/users" className="text-sm text-gray-700 hover:text-blue-600">Kelola User</Link>
          </>
        )}
      </nav>
    </aside>
  );
}
