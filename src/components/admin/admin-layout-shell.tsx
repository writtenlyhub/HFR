"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  Tag,
  Calendar,
  Images,
  FileText,
  RefreshCw,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Shield,
  ChevronRight,
  User as UserIcon,
} from "lucide-react";

interface AdminLayoutShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    image?: string | null;
  };
}

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Properties",
    href: "/admin/properties",
    icon: Building2,
  },
  {
    name: "Bookings",
    href: "/admin/bookings",
    icon: CalendarCheck,
  },
  {
    name: "Pricing & Rates",
    href: "/admin/pricing",
    icon: Tag,
  },
  {
    name: "Availability Calendar",
    href: "/admin/calendar",
    icon: Calendar,
  },
  {
    name: "Media Gallery",
    href: "/admin/media",
    icon: Images,
  },
  {
    name: "Website Content",
    href: "/admin/content",
    icon: FileText,
  },
  {
    name: "Calendar Sync (iCal)",
    href: "/admin/calendar-sync",
    icon: RefreshCw,
  },
  {
    name: "Settings & Audit",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminLayoutShell({ children, user }: AdminLayoutShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSuperAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col font-sans text-neutral-900 antialiased">
      {/* Top Utility Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Left: Mobile Toggle & Breadcrumb Identity */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 flex items-center justify-center text-amber-300 font-serif font-black text-sm shadow-xs">
              D
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-900 block leading-tight">
                DevStay
              </span>
              <span className="text-[10px] text-neutral-400 font-medium tracking-wider uppercase block">
                Hospitality Admin
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1.5 pl-4 ml-4 border-l border-neutral-200 text-xs text-neutral-400">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>STAGING</span>
            </span>
          </div>
        </div>

        {/* Right: Live Site Link & User Profile & Logout */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <Link
            href="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition shadow-2xs"
          >
            <span>Live Website</span>
            <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
          </Link>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 sm:pl-3 sm:border-l border-neutral-200">
            <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 font-bold text-xs uppercase">
              {user.name ? user.name[0] : user.email ? user.email[0] : "A"}
            </div>
            <div className="hidden lg:block text-left">
              <span className="text-xs font-bold text-neutral-900 block leading-tight">
                {user.name || user.email?.split("@")[0]}
              </span>
              <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider block">
                {user.role}
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg text-neutral-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-100 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Sign out of Admin Dashboard"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main App Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-neutral-200/80 p-4 space-y-1 shrink-0">
          <div className="px-3 py-2 text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
            Management Modules
          </div>

          <nav className="space-y-1 flex-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition group ${
                    isActive
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-105 ${
                        isActive ? "text-amber-300" : "text-neutral-400 group-hover:text-neutral-900"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer Info */}
          <div className="pt-4 border-t border-neutral-100 px-3 py-2 text-[11px] text-neutral-400 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-neutral-600">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>DevStay Enterprise</span>
            </div>
            <p className="text-[10px] text-neutral-400 font-mono">
              Role: {user.role} · v1.2-stage
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <div className="relative w-72 max-w-full bg-white h-full p-4 flex flex-col shadow-2xl z-10">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center text-amber-300 font-serif font-black text-xs">
                    D
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                    DevStay Admin
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1 flex-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? "text-amber-300" : "text-neutral-400"
                          }`}
                        />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-neutral-100 space-y-2">
                <div className="p-3 bg-neutral-50 rounded-xl text-xs space-y-0.5">
                  <span className="font-bold text-neutral-900 block">{user.email}</span>
                  <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider block">
                    Role: {user.role}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/admin/login" })}
                  className="w-full py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
