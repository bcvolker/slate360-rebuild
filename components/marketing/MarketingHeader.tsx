"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SlateLogo } from "@/components/shared/SlateLogo";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Product", href: "#apps" },
  { label: "Pricing", href: "#pricing" },
  { label: "Solutions", href: "#solutions" },
  { label: "Blog", href: "#" },
];

interface MarketingHeaderProps {
  isLoggedIn?: boolean;
}

export function MarketingHeader({ isLoggedIn = false }: MarketingHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 border-b"
      style={{
        backgroundColor: "#0B0F15",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" aria-label="Slate360 Home">
          <SlateLogo size="md" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium transition-colors"
              style={{ color: "#94A3B8" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "#3B82F6" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#2563EB")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#3B82F6")
              }
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: "#3B82F6" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#2563EB")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#3B82F6")
                }
              >
                Log In
              </Link>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden border-t"
          style={{
            backgroundColor: "#0B0F15",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <nav className="flex flex-col px-4 py-4 gap-1" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t mt-2" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: "#3B82F6" }}
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: "#3B82F6" }}
                >
                  Log In
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
