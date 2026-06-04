"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const { isAuthenticated, isAdmin: adminRole, fullName, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="container mx-auto max-w-5xl flex items-center justify-between">
        <Link href={isAuthenticated ? "/dashboard" : "/"} className="font-bold text-blue-600 text-sm">
          Dialect-Bridge
        </Link>

        {isAuthenticated ? (
          <div className="flex items-center gap-5">
            <Link href="/submit" className="text-sm text-gray-600 hover:text-blue-600 transition">
              Kirim Aduan
            </Link>
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-blue-600 transition">
              Aduan Saya
            </Link>
            {adminRole && (
              <Link href="/admin" className="text-sm text-gray-600 hover:text-blue-600 transition">
                Admin
              </Link>
            )}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
              <span className="text-xs text-gray-500 hidden sm:block">{fullName}</span>
              <button
                onClick={logout}
                className="text-xs text-red-500 hover:text-red-700 transition font-medium"
              >
                Keluar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-blue-600 transition">
              Masuk
            </Link>
            <Link
              href="/register"
              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Daftar
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
