"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, User as UserIcon, LogOut, Shield } from "lucide-react";
import { signOut } from "next-auth/react";

interface HeaderProps {
  session?: {
    user?: {
      name?: string | null;
      email?: string | null;
      role?: string | null;
      image?: string | null;
    } | null;
  } | null;
}

export function Header({ session }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = session?.user;

  return (
    <header
      className="w-full bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 font-sans"
      data-purpose="site-header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3.5 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          className="flex items-center gap-3 group"
          data-purpose="brand-logo"
          href="/"
        >
          <div className="w-9 h-9 border-[1.75px] border-black flex flex-col justify-end p-1.5 relative rounded-sm transition-transform group-hover:scale-105 shrink-0">
            <div className="w-full h-[2px] bg-black mb-1"></div>
            <div className="w-2/3 h-[2px] bg-black mb-1"></div>
            <div className="w-full flex justify-between items-end">
              <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
              <div className="w-2 h-3.5 border-t-[2px] border-l-[2px] border-black"></div>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-extrabold tracking-wider uppercase text-black leading-none">
              HOTEL FEDERATION RAJASTHAN
            </span>
            <span className="text-[10px] font-semibold tracking-[0.2em] text-neutral-500 uppercase mt-0.5">
              Dev Stays · Civil Lines Jaipur
            </span>
          </div>
        </Link>

        {/* Clean Top Nav (Desktop) */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-neutral-600">
          <a className="hover:text-black transition-colors" href="#overview">
            Overview
          </a>
          <a
            className="hover:text-black transition-colors"
            href="#property-gallery"
          >
            Gallery
          </a>
          <a
            className="hover:text-black text-black font-bold border-b border-black pb-0.5"
            href="#accommodations"
          >
            Accommodations
          </a>
          <a
            className="hover:text-black transition-colors"
            href="#estate-story"
          >
            The Estate
          </a>
          <a className="hover:text-black transition-colors" href="#reviews">
            Reviews
          </a>
          <a className="hover:text-black transition-colors" href="#location">
            Location
          </a>
          <a className="hover:text-black transition-colors" href="#host">
            Host
          </a>
        </nav>

        {/* Primary CTA, Auth State & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          {/* Admin link if user is ADMIN */}
          {user?.role === "ADMIN" && (
            <Link
              href="/admin/calendar-sync"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] font-semibold uppercase tracking-wider hover:bg-amber-100 transition"
            >
              <Shield className="w-3.5 h-3.5 text-amber-700" />
              <span>Admin Portal</span>
            </Link>
          )}

          {/* User Session Action */}
          {user ? (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800 font-medium"
                title={`Signed in as ${user.email} (${user.role})`}
              >
                <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold">
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </div>
                <span className="max-w-[100px] truncate">{user.name || user.email}</span>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-neutral-300 hover:border-black text-neutral-700 hover:text-black text-xs font-semibold tracking-wider uppercase transition"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          <a
            className="hidden sm:flex bg-black hover:bg-neutral-800 text-white rounded-full py-2.5 px-5 text-xs font-semibold tracking-wide items-center gap-2 transition-all shadow-sm group"
            href="#sidebar-booking-card"
          >
            <span>Check Availability</span>
            <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              ↗
            </span>
          </a>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-neutral-700 hover:text-black focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-neutral-200 px-6 py-4 space-y-4">
          {/* Mobile Auth Bar */}
          <div className="pb-3 border-b border-neutral-100 flex items-center justify-between text-xs">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <div>
                  <p className="font-semibold text-neutral-900">{user.name || user.email}</p>
                  <p className="text-[11px] text-neutral-500 font-mono">
                    {user.email} · <span className="text-amber-700 font-bold">{user.role}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {user.role === "ADMIN" && (
                    <Link
                      href="/admin/calendar-sync"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium"
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="p-1.5 text-neutral-500 hover:text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2 text-center rounded-lg bg-neutral-100 text-neutral-800 font-semibold"
              >
                Sign In to Your Account
              </Link>
            )}
          </div>

          <nav className="flex flex-col space-y-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-700">
            <a
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-black"
              href="#overview"
            >
              Overview
            </a>
            <a
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-black"
              href="#property-gallery"
            >
              Gallery
            </a>
            <a
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-black text-black font-bold"
              href="#accommodations"
            >
              Accommodations
            </a>
            <a
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-black"
              href="#estate-story"
            >
              The Estate
            </a>
            <a
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-black"
              href="#reviews"
            >
              Reviews
            </a>
            <a
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-black"
              href="#location"
            >
              Location
            </a>
            <a
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-black"
              href="#host"
            >
              Host
            </a>
          </nav>
          <div className="pt-2">
            <a
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex justify-center bg-black hover:bg-neutral-800 text-white rounded-full py-2.5 px-5 text-xs font-semibold tracking-wide items-center gap-2"
              href="#sidebar-booking-card"
            >
              <span>Check Availability</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}


