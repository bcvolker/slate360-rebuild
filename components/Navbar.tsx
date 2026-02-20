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
    href: "/features/project-hub",
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
    label: "SlateDrop",
    href: "/features/slatedrop",
    desc: "Finder-style file system for every project",
    icon: "📂",
  },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

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
          <img src="/logo.svg" alt="Slate360" className="h-8 w-auto" />
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
         Mobile menu — slides in, click outside to close
         ══════════════════════════════════════════════════ */}
      {mobileOpen && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40 md:hidden" />

          <div
            ref={mobileMenuRef}
            className="fixed top-0 right-0 w-[85vw] max-w-sm h-full bg-white z-50 shadow-2xl flex flex-col md:hidden animate-slide-in"
          >
            {/* Header: logo + close */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2"
              >
                <img src="/logo.svg" alt="Slate360" className="h-7 w-auto" />
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* Dashboard first */}
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors mb-1"
              >
                <span className="text-lg">📊</span>
                <span className="text-sm font-semibold text-gray-900">
                  Dashboard
                </span>
              </Link>

              <div className="h-px bg-gray-100 my-2" />

              {/* Tabs in exact sidebar order */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 mb-2 mt-2">
                Platform
              </p>
              {features.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-sm font-medium text-gray-800">
                    {f.label}
                  </span>
                </Link>
              ))}

              <div className="h-px bg-gray-100 my-3" />

              {/* Secondary links */}
              <Link
                href="/plans"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                About
              </Link>

              <div className="h-px bg-gray-100 my-3" />

              {/* Account links */}
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sign in
              </Link>
            </div>

            {/* Sticky CTA */}
            <div className="px-4 py-4 border-t border-gray-100">
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-full py-3.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
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
