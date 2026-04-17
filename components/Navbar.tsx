"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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
            src="/uploads/slate360-logo-reversed-v2.svg"
            alt="Slate360"
            className="w-auto transition-all duration-300 ease-in-out"
            style={{ height: isHome && !scrolled ? "2.75rem" : "2rem" }}
          />
        </Link>

        {/* ── Desktop CTA ──────────────────────────────── */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-[#D4AF37] hover:bg-gray-50 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
            style={{ backgroundColor: "#D4AF37" }}
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
                  className="text-lg font-semibold text-gray-900 hover:text-[#D4AF37] transition-colors py-2"
                >
                  Login
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-semibold text-gray-900 hover:text-[#D4AF37] transition-colors py-2"
                >
                  Contact
                </Link>
              </div>
            </div>

            {/* Sticky CTA */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-sm"
                style={{ backgroundColor: "#D4AF37" }}
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
