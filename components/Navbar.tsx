"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { SlateLogo } from "@/components/shared/SlateLogo";

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
    <header className="fixed top-0 inset-x-0 z-50 border-b border-header bg-header-glass text-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <SlateLogo
            size="lg"
            className="w-auto transition-all duration-300 ease-in-out"
            style={{ height: isHome && !scrolled ? "2.75rem" : "2rem" }}
          />
        </Link>

        {/* ── Desktop CTA ──────────────────────────────── */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium text-header-muted hover:text-teal hover:bg-teal-soft transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-primary-foreground bg-primary transition-all hover:opacity-90 hover:scale-105"
          >
            Start free trial
          </Link>
        </div>

        {/* ── Hamburger button ─────────────────────────── */}
        <button
          className="md:hidden p-2 rounded-lg text-header-muted hover:bg-primary/10 transition-colors"
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
          <div className="fixed inset-0 top-16 bg-background/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />

          <div
            ref={mobileMenuRef}
            className="absolute top-16 left-0 right-0 z-50 flex max-h-[calc(100dvh-4rem)] flex-col overflow-hidden rounded-b-3xl border-t border-border bg-card/95 shadow-2xl backdrop-blur-xl md:hidden"
          >
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6">
              {/* Primary Links */}
              <div className="flex flex-col gap-1 mb-6">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="py-2 text-lg font-semibold text-foreground hover:text-teal transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="py-2 text-lg font-semibold text-foreground hover:text-teal transition-colors"
                >
                  Contact
                </Link>
              </div>
            </div>

            {/* Sticky CTA */}
            <div className="border-t border-border bg-muted/30 px-6 py-4">
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-full py-3.5 rounded-xl text-sm font-semibold text-primary-foreground bg-primary transition-all hover:opacity-90 shadow-sm"
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
