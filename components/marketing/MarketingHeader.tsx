"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Apps", href: "#apps" },
  { label: "Pricing", href: "#pricing" },
];

const APP_LINKS = [
  { label: "Site Walk", href: "#apps", desc: "Field documentation & reporting" },
  { label: "360 Tours", href: "#apps", desc: "Immersive walkthroughs" },
  { label: "Design Studio", href: "#apps", desc: "Plans, models & reviews" },
  { label: "Content Studio", href: "#apps", desc: "Media, video & deliverables" },
];

export default function MarketingHeader({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);

  return (
    <header
      style={{ backgroundColor: "#0B0F15" }}
      className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/10"
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 12L8 4L13 12H3Z" fill="white" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-white">
              Slate<span className="text-blue-400">360</span>
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) =>
            link.label === "Apps" ? (
              <div key="apps" className="relative">
                <button
                  onClick={() => setAppsOpen(!appsOpen)}
                  className="flex items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-white"
                >
                  Apps
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform duration-200", appsOpen && "rotate-180")}
                  />
                </button>
                {appsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setAppsOpen(false)} />
                    <div className="absolute left-1/2 top-9 z-50 w-64 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#151B24] p-2 shadow-2xl">
                      {APP_LINKS.map((app) => (
                        <Link
                          key={app.label}
                          href={app.href}
                          onClick={() => setAppsOpen(false)}
                          className="flex flex-col rounded-xl px-4 py-3 transition-colors hover:bg-white/5"
                        >
                          <span className="text-sm font-medium text-white">{app.label}</span>
                          <span className="text-xs text-slate-500">{app.desc}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                Start Free Trial
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#0B0F15] px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-medium text-slate-300 transition-colors hover:text-white"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
