"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe, Menu, X, LayoutDashboard,
  PlusSquare, ShieldCheck, LogOut, User,
} from "lucide-react";
import { useAuth } from "@/components/features/auth/AuthProvider";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { isAuthenticated, isAdmin, fullName, email, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, adminOnly: false },
    { href: "/submit", label: "Kirim Aduan", Icon: PlusSquare, adminOnly: false },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", Icon: ShieldCheck, adminOnly: true }] : []),
  ];

  function active(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  return (
    <>
      <nav className="h-14 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 z-40 relative">
        <div className="w-full flex items-center justify-between">

          {/* Logo */}
          <Link
            href={isAuthenticated ? (isAdmin ? "/admin" : "/dashboard") : "/"}
            className="flex items-center gap-2.5 flex-shrink-0"
          >
            <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight hidden sm:block">
              <p className="font-bold text-[#1E2A4A] text-sm leading-none">Dialect-Bridge</p>
              <p className="text-gray-400 text-[10px] leading-none mt-0.5">Sovereign Platform</p>
            </div>
          </Link>

          {isAuthenticated ? (
            <>
              {/* Desktop links */}
              <div className="hidden md:flex items-center gap-1">
                {links.map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active(href)
                        ? "bg-[#EFF6FF] text-[#2563EB]"
                        : "text-gray-600 hover:bg-gray-100 hover:text-[#1E2A4A]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                ))}
              </div>

              {/* Desktop user info */}
              <div className="hidden md:flex items-center gap-2 pl-4 border-l border-gray-200">
                <NotificationBell />
                <Link href="/profile" className="text-right hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
                  <p className="text-xs font-semibold text-[#1E2A4A] leading-none">{fullName}</p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5">{email}</p>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar
                </button>
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Buka menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm text-gray-600 hover:text-[#2563EB] font-medium px-3 py-2 transition-colors">
                Masuk
              </Link>
              <Link
                href="/register"
                className="text-sm px-4 py-2 bg-[#2563EB] text-white font-semibold rounded-lg hover:bg-[#1D4ED8] transition-colors"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {isAuthenticated && mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-14 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg md:hidden">
            <div className="p-4 space-y-1">
              {links.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                    active(href)
                      ? "bg-[#EFF6FF] text-[#2563EB]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
              <div className="pt-3 mt-2 border-t border-gray-100">
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 mb-1 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <div className="w-9 h-9 bg-[#EFF6FF] rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1E2A4A] leading-none truncate">{fullName}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{email}</p>
                  </div>
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); logout(); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar dari Akun
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
