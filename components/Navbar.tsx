"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";

/* ── feature list in exact dashboard sidebar order ─────── */
const features = [
  {
    label: "Design Studio",
    href: "/features/design-studio",
    desc: "3D modeling, plan markup & fabrication prep",
    icon: "✏️",
  },
  {
    label: "Project Hub",
    href: "/project-hub",
    desc: "RFIs, submittals, budgets & scheduling",
    icon: "📋",
  },
  {
    label: "Content Studio",
    href: "/features/content-studio",
    desc: "Marketing materials & client deliverables",
    icon: "🎨",
  },
  {
    label: "360 Tour Builder",
    href: "/features/360-tour-builder",
    desc: "Immersive 360° walkthroughs of any space",
    icon: "🔭",
  },
  {
    label: "Geospatial & Robotics",
    href: "/features/geospatial-robotics",
    desc: "Drone mapping, LiDAR & photogrammetry",
    icon: "🛰️",
  },
  {
    label: "Virtual Studio",
    href: "/features/virtual-studio",
    desc: "Renderings, animations & presentations",
    icon: "🎬",
  },
  {
    label: "Analytics & Reports",
    href: "/features/analytics-reports",
    desc: "Dashboards, trends & exportable reports",
    icon: "📊",
  },
  {
    label: "Slate360 Apps",
    href: "/features/ecosystem-apps",
    desc: "Downloadable & subscribable platform apps",
    icon: "🧩",
  },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";

  /* ── Scroll listener for logo animation ────────────────── */
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Desktop dropdown hover logic ──────────────────────── */
  function openDropdown() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setDropdownOpen(true);
  }
  function scheduleClose() {
    closeTimer.current = setTimeout(() => setDropdownOpen(false), 120);
  }

  /* ── Click-outside to close mobile menu ────────────────── */
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        mobileOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    },
    [mobileOpen],
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  /* ── Lock body scroll when mobile menu is open ─────────── */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <img
            src="/logo.svg"
            alt="Slate360"
            className="w-auto transition-all duration-300 ease-in-out"
            style={{ height: isHome && !scrolled ? "2.75rem" : "2rem" }}
          />
        </Link>

        {/* ── Desktop nav ──────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Features dropdown */}
          <div
            className="relative"
            onMouseEnter={openDropdown}
            onMouseLeave={scheduleClose}
          >
            <button
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname?.startsWith("/features")
                  ? "text-[#FF4D00]"
                  : "text-gray-700 hover:text-[#FF4D00] hover:bg-gray-50"
              }`}
              onClick={() => setDropdownOpen((v) => !v)}
              aria-expanded={dropdownOpen}
            >
              Features{" "}
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[540px] bg-white rounded-2xl shadow-xl border border-gray-100 p-4 grid grid-cols-2 gap-1"
                onMouseEnter={openDropdown}
                onMouseLeave={scheduleClose}
              >
                {features.map((f) => (
                  <Link
                    key={f.href}
                    href={f.href}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <span className="text-xl mt-0.5 flex-shrink-0">
                      {f.icon}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 group-hover:text-[#FF4D00] transition-colors">
                        {f.label}
                      </div>
                      <div className="text-xs text-gray-500 leading-snug mt-0.5">
                        {f.desc}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/plans"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/plans"
                ? "text-[#FF4D00]"
                : "text-gray-700 hover:text-[#FF4D00] hover:bg-gray-50"
            }`}
          >
            Pricing
          </Link>
          <Link
            href="/about"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/about"
                ? "text-[#FF4D00]"
                : "text-gray-700 hover:text-[#FF4D00] hover:bg-gray-50"
            }`}
          >
            About
          </Link>
        </nav>

        {/* ── Desktop CTA ──────────────────────────────── */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-[#FF4D00] hover:bg-gray-50 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
            style={{ backgroundColor: "#FF4D00" }}
          >
            Start free trial
          </Link>
        </div>

        {/* ── Hamburger button ─────────────────────────── */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
         Mobile menu — condensed dropdown
         ══════════════════════════════════════════════════ */}
      {mobileOpen && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 top-16 bg-black/20 z-40 md:hidden" onClick={() => setMobileOpen(false)} />

          <div
            ref={mobileMenuRef}
            className="absolute top-16 left-0 right-0 bg-white z-50 shadow-2xl flex flex-col md:hidden border-t border-gray-100 max-h-[calc(100dvh-4rem)] overflow-hidden rounded-b-3xl"
          >
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6">
              {/* Primary Links */}
              <div className="flex flex-col gap-1 mb-6">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-semibold text-gray-900 hover:text-[#FF4D00] transition-colors py-2"
                >
                  Login
                </Link>
                <Link
                  href="/plans"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-semibold text-gray-900 hover:text-[#FF4D00] transition-colors py-2"
                >
                  Pricing
                </Link>
                <Link
                  href="/about"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-semibold text-gray-900 hover:text-[#FF4D00] transition-colors py-2"
                >
                  About
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-semibold text-gray-900 hover:text-[#FF4D00] transition-colors py-2"
                >
                  Contact
                </Link>
              </div>

              <div className="h-px bg-gray-100 my-4" />

              {/* Features Section */}
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                Features
              </p>
              <div className="grid grid-cols-1 gap-1">
                {features.map((f) => (
                  <Link
                    key={f.href}
                    href={f.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 py-2 group min-h-[44px]"
                  >
                    <span className="text-xl bg-gray-50 w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-[#FF4D00]/10 transition-colors shrink-0">{f.icon}</span>
                    <span className="text-[15px] font-medium text-gray-700 group-hover:text-[#FF4D00] transition-colors">
                      {f.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Sticky CTA */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-sm"
                style={{ backgroundColor: "#FF4D00" }}
              >
                Start free trial
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
