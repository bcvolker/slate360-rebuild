"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { NAV_LINK } from "@/components/marketing-launchpad/marketing-styles";
import { cn } from "@/lib/utils";

const MOBILE_NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Sign In", href: "/login" },
] as const;

const DROPDOWN_ITEM =
  "block rounded-lg p-3 text-sm font-medium text-zinc-300 transition-all duration-150 hover:bg-white/[0.03] hover:text-teal-300/90";

const HAMBURGER_BTN =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-all duration-150 hover:border-teal-400/25 hover:text-teal-300/90 active:scale-[0.98] md:hidden";

type MarketingHeaderProps = {
  /** Homepage uses transparent dark chrome over the graphite canvas. */
  variant?: "homepage" | "default";
};

const HEADER_VARIANT = {
  homepage:
    "absolute top-0 z-50 w-full pt-[env(safe-area-inset-top,0px)] border-none bg-transparent supports-[backdrop-filter]:backdrop-blur-[2px]",
  default:
    "sticky top-0 z-50 w-full pt-[env(safe-area-inset-top,0px)] border-b border-white/[0.06] bg-[#0B0F15]/90 backdrop-blur-xl",
} as const;

const MOBILE_MENU_VARIANT = {
  homepage: "bg-[#0B0F15]/95",
  default: "bg-[#0B0F15]/95",
} as const;

export function MarketingHeader({ variant = "default" }: MarketingHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className={HEADER_VARIANT[variant]}>
      <div className="relative mx-auto flex h-16 w-full items-center justify-between px-4 md:grid md:grid-cols-[minmax(280px,auto)_1fr_auto] md:items-center md:px-6 lg:px-12">
        <Link
          href="/"
          aria-label="Slate360 home"
          className="relative z-50 shrink-0 origin-left scale-125 select-none tracking-wide md:absolute md:left-6 md:top-6"
        >
          <Slate360Logo variant="dark" />
        </Link>

        <nav className="hidden md:flex items-center justify-self-end gap-8 md:col-start-2">
          <Link href="/" className={NAV_LINK}>
            Home
          </Link>
          <Link href="/login" className={NAV_LINK}>
            Sign In
          </Link>
        </nav>

        <button
          type="button"
          className={cn(HAMBURGER_BTN, "ml-auto shrink-0 md:col-start-3 md:ml-0 md:justify-self-end")}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div
          className={`absolute left-0 right-0 top-full border-b border-white/[0.08] px-6 py-4 backdrop-blur-2xl md:hidden ${MOBILE_MENU_VARIANT[variant]}`}
        >
          <div className="space-y-1">
            {MOBILE_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={DROPDOWN_ITEM}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
