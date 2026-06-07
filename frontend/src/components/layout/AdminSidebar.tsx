"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, MapPin, Users, LogOut, Menu, X, Globe,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/components/features/auth/AuthProvider";
import NotificationBell from "./NotificationBell";

const NAV_ITEMS = [
  { href: "/admin",       label: "Dashboard",  Icon: LayoutDashboard },
  { href: "/admin/map",   label: "Peta Aduan", Icon: MapPin },
  { href: "/admin/users", label: "Pengguna",   Icon: Users },
];

interface AdminShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function AdminShell({ title, subtitle, children }: AdminShellProps) {
  const { fullName, email, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="relative bg-[#1E2A4A] p-5 overflow-hidden">
        <div className="absolute inset-0 batik-overlay opacity-[0.08] pointer-events-none" />
        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#2563EB] rounded-xl flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight min-w-0">
            <p className="font-bold text-white text-sm leading-none truncate">Dialect-Bridge</p>
            <p className="text-blue-300/70 text-[10px] leading-none mt-1">Sovereign Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2 mt-1">
          Menu
        </p>
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== "/admin" && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#EFF6FF] text-[#2563EB]"
                  : "text-gray-600 hover:bg-gray-100 hover:text-[#1E2A4A]"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-gray-100 p-3 space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-9 h-9 bg-[#EFF6FF] rounded-full flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#1E2A4A] truncate leading-none">{fullName}</p>
            <p className="text-[10px] text-gray-400 truncate mt-0.5">{email}</p>
          </div>
        </div>
        <button
          onClick={() => { setOpen(false); logout(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex bg-[#F4F5F7]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-60 bg-white border-r border-gray-200 z-20">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed top-0 left-0 bottom-0 w-72 bg-white border-r border-gray-200 z-50 lg:hidden animate-slide-in-right">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white hover:bg-white/10 z-10"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 lg:pl-60 min-w-0 flex flex-col">
        <header className="sticky top-0 z-10 bg-[#F4F5F7]/95 backdrop-blur-sm border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-[#1E2A4A] truncate">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 hidden sm:block truncate">{subtitle}</p>}
          </div>
          <NotificationBell />
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
