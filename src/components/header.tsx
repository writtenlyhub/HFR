"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className="w-full bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100"
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

        {/* Primary CTA & Mobile Hamburger */}
        <div className="flex items-center gap-3">
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
        <div className="lg:hidden bg-white border-b border-neutral-200 px-6 py-4 space-y-3">
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

