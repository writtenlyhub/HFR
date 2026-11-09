"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  User as UserIcon,
  LogOut,
  Shield,
  ChevronRight,
  Phone,
} from "lucide-react";
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

interface NavSection {
  id: string;
  label: string;
  number: string;
}

const NAV_SECTIONS: NavSection[] = [
  { id: "overview", label: "Overview", number: "01" },
  { id: "gallery", label: "Gallery", number: "02" },
  { id: "accommodations", label: "Accommodations", number: "03" },
  { id: "estate-story", label: "The Estate", number: "04" },
  { id: "reviews", label: "Reviews", number: "05" },
  { id: "location", label: "Location", number: "06" },
  { id: "host", label: "Host", number: "07" },
  { id: "house-rules", label: "Guidelines", number: "08" },
  { id: "contact", label: "Contact", number: "09" },
];

export function Header({ session }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("overview");
  const pathname = usePathname();
  const user = session?.user;
  const isHomePage = pathname === "/";

  // Handle header elevation on scroll
  useEffect(() => {
    const handleScrollElevation = () => {
      setIsScrolled(window.scrollY > 15);
    };

    window.addEventListener("scroll", handleScrollElevation, { passive: true });
    handleScrollElevation();
    return () => window.removeEventListener("scroll", handleScrollElevation);
  }, []);

  // Scroll spy to dynamically track active section on the homepage
  useEffect(() => {
    if (!isHomePage) return;

    const handleScrollSpy = () => {
      const scrollPosition = window.scrollY + 140; // Navbar offset

      // Check if at the bottom of the page
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 60
      ) {
        setActiveSection("contact");
        return;
      }

      let currentSection = "overview";
      for (const section of NAV_SECTIONS) {
        // Also check alias 'property-gallery' for gallery
        const el =
          document.getElementById(section.id) ||
          (section.id === "gallery"
            ? document.getElementById("property-gallery")
            : null);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            currentSection = section.id;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScrollSpy, { passive: true });
    handleScrollSpy();
    return () => window.removeEventListener("scroll", handleScrollSpy);
  }, [isHomePage]);

  // Handle smooth scroll when on the homepage
  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
      if (isHomePage) {
        e.preventDefault();
        const target =
          document.getElementById(targetId) ||
          (targetId === "gallery"
            ? document.getElementById("property-gallery")
            : null);

        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
          window.history.pushState(null, "", `#${targetId}`);
          setActiveSection(targetId);
        }
        setMobileMenuOpen(false);
      } else {
        setMobileMenuOpen(false);
      }
    },
    [isHomePage]
  );

  // Handle "Check Availability" CTA
  const handleCheckAvailability = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (pathname.startsWith("/properties/")) {
        const detailWidget = document.getElementById(
          "accommodation-booking-widget"
        );
        if (detailWidget) {
          e.preventDefault();
          detailWidget.scrollIntoView({ behavior: "smooth" });
          setMobileMenuOpen(false);
          return;
        }
      }
      if (isHomePage) {
        const homeWidget =
          document.getElementById("sidebar-booking-card") ||
          document.getElementById("estate-story");
        if (homeWidget) {
          e.preventDefault();
          homeWidget.scrollIntoView({ behavior: "smooth" });
          setMobileMenuOpen(false);
          return;
        }
      }
      setMobileMenuOpen(false);
    },
    [pathname, isHomePage]
  );

  return (
    <header
      className={`w-full sticky top-0 z-50 transition-all duration-300 font-sans ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-[0_2px_15px_rgba(0,0,0,0.04)] border-b border-neutral-200/80 py-2.5"
          : "bg-white/90 backdrop-blur-md border-b border-neutral-100 py-3.5"
      }`}
      data-purpose="site-header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex items-center justify-between gap-4">
        {/* Brand Monogram & Identity */}
        <Link
          className="flex items-center gap-2.5 sm:gap-3 group shrink-0"
          data-purpose="brand-logo"
          href="/"
          onClick={(e) => {
            if (isHomePage) {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
              setActiveSection("overview");
            }
          }}
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 border-[1.75px] border-black flex flex-col justify-end p-1 sm:p-1.5 relative rounded-sm transition-transform group-hover:scale-105 shrink-0 bg-white">
            <div className="w-full h-[2px] bg-black mb-1"></div>
            <div className="w-2/3 h-[2px] bg-black mb-1"></div>
            <div className="w-full flex justify-between items-end">
              <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
              <div className="w-2 h-3 sm:h-3.5 border-t-[2px] border-l-[2px] border-black"></div>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] sm:text-xs xl:text-sm font-extrabold tracking-wider uppercase text-black leading-none">
              HOTEL FEDERATION RAJASTHAN
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold tracking-[0.2em] text-neutral-500 uppercase mt-0.5">
              Dev Stays · Civil Lines Jaipur
            </span>
          </div>
        </Link>

        {/* Clean Desktop Navigation Bar with Dynamic Scroll-Spy */}
        <nav
          className="hidden lg:flex items-center gap-2.5 xl:gap-4 2xl:gap-5 text-[10.5px] xl:text-[11.5px] 2xl:text-xs font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap"
          aria-label="Main Navigation"
        >
          {NAV_SECTIONS.map((section) => {
            const isActive = isHomePage && activeSection === section.id;
            const targetHref = isHomePage ? `#${section.id}` : `/#${section.id}`;

            return (
              <Link
                key={section.id}
                href={targetHref}
                onClick={(e) => handleNavClick(e, section.id)}
                className={`relative py-1 transition-colors duration-200 ${
                  isActive
                    ? "text-black font-bold"
                    : "text-neutral-500 hover:text-black font-medium"
                }`}
              >
                {section.label}
                {isActive && (
                  <span
                    className="absolute -bottom-1 left-0 right-0 h-[1.75px] bg-black rounded-full transition-all duration-300"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Controls: Admin, Sign In & Primary Booking CTA */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Admin link if user is ADMIN */}
          {user?.role === "ADMIN" && (
            <Link
              href="/admin/calendar-sync"
              className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-[10.5px] font-semibold uppercase tracking-wider hover:bg-amber-100 transition shadow-xs"
            >
              <Shield className="w-3.5 h-3.5 text-amber-700" />
              <span>Admin</span>
            </Link>
          )}

          {/* User Session Action */}
          {user ? (
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800 font-medium text-[11px]"
                title={`Signed in as ${user.email} (${user.role})`}
              >
                <div className="w-4 h-4 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[9px] font-bold">
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </div>
                <span className="max-w-[70px] xl:max-w-[100px] truncate">
                  {user.name || user.email}
                </span>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 hover:border-black text-neutral-700 hover:text-black text-[11px] font-semibold tracking-wider uppercase transition"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          {/* Check Availability CTA Button */}
          <Link
            className="hidden sm:inline-flex bg-black hover:bg-neutral-800 text-white rounded-full py-2 px-4 xl:py-2.5 xl:px-5 text-[11px] xl:text-xs font-semibold tracking-wide items-center gap-1.5 transition-all shadow-xs group"
            href={
              pathname.startsWith("/properties/")
                ? "#accommodation-booking-widget"
                : isHomePage
                ? "#estate-story"
                : "/#estate-story"
            }
            onClick={handleCheckAvailability}
          >
            <span>Check Availability</span>
            <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-xs">
              ↗
            </span>
          </Link>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-neutral-700 hover:text-black rounded-lg hover:bg-neutral-100 focus:outline-none transition"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Luxury Mobile Menu Drawer with Complete Navigation Sections */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white/98 backdrop-blur-xl border-b border-neutral-200 px-6 py-5 shadow-xl animate-in slide-in-from-top-2 duration-200">
          {/* User Session Bar in Mobile */}
          <div className="pb-4 mb-3 border-b border-neutral-100 flex items-center justify-between text-xs">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">
                    {user.name || user.email}
                  </p>
                  <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                    {user.email} ·{" "}
                    <span className="text-amber-700 font-bold">
                      {user.role}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {user.role === "ADMIN" && (
                    <Link
                      href="/admin/calendar-sync"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold"
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="p-1.5 text-neutral-500 hover:text-red-600 rounded-md hover:bg-neutral-100 transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-semibold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In to Your Account</span>
              </Link>
            )}
          </div>

          {/* All 9 Numbered Navigation Sections */}
          <nav
            className="flex flex-col divide-y divide-neutral-100/80 my-1"
            aria-label="Mobile Navigation"
          >
            {NAV_SECTIONS.map((section) => {
              const isActive = isHomePage && activeSection === section.id;
              const targetHref = isHomePage ? `#${section.id}` : `/#${section.id}`;

              return (
                <Link
                  key={section.id}
                  href={targetHref}
                  onClick={(e) => handleNavClick(e, section.id)}
                  className={`py-3 flex items-center justify-between transition-colors ${
                    isActive
                      ? "text-black font-bold"
                      : "text-neutral-700 hover:text-black font-medium"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono tracking-widest text-neutral-400">
                      {section.number}
                    </span>
                    <span className="text-xs uppercase tracking-wider">
                      {section.label}
                    </span>
                  </div>
                  <ChevronRight
                    size={14}
                    className={
                      isActive
                        ? "text-black translate-x-0.5"
                        : "text-neutral-300"
                    }
                  />
                </Link>
              );
            })}
          </nav>

          {/* Bottom Action Controls in Mobile */}
          <div className="pt-4 mt-2 border-t border-neutral-100 space-y-2.5">
            <Link
              onClick={handleCheckAvailability}
              className="w-full flex justify-center bg-black hover:bg-neutral-800 text-white rounded-full py-3 px-5 text-xs font-semibold tracking-wider uppercase items-center gap-2 shadow-sm transition"
              href={
                pathname.startsWith("/properties/")
                  ? "#accommodation-booking-widget"
                  : isHomePage
                  ? "#estate-story"
                  : "/#estate-story"
              }
            >
              <span>Check Availability</span>
              <span>↗</span>
            </Link>

            <a
              href="tel:+911412894400"
              className="w-full flex justify-center text-neutral-600 hover:text-black py-2 text-[11px] font-semibold items-center gap-1.5 transition"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Concierge Desk: +91 141 289 4400</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
