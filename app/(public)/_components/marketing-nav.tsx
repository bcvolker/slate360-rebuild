"use client";

import Link from "next/link";
import { useState } from "react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { MKT_BTN_GHOST } from "@/app/(public)/_components/marketing-styles";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "/contact" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="absolute top-0 z-50 w-full pt-[env(safe-area-inset-top,0px)] border-b border-white/[0.06] bg-[var(--graphite-canvas)]/80 backdrop-blur-xl">
      <div className={cn("mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-10")}>
        <Link href="/" aria-label="Slate360 home" className="shrink-0">
          <Slate360Logo variant="dark" size="header" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--graphite-muted)] transition-colors hover:text-[var(--graphite-text-header)]"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="text-sm font-medium text-[var(--graphite-muted)] transition-colors hover:text-[var(--graphite-text-header)]">
            Sign In
          </Link>
          <Link
            href="/signup"
            className={cn(MKT_BTN_GHOST, "border-[color-mix(in_srgb,var(--graphite-primary)_30%,transparent)] text-[var(--graphite-primary)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)]")}
          >
            Start free trial
          </Link>
        </nav>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[var(--graphite-muted)] md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconX size={20} /> : <IconMenu2 size={20} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/[0.06] bg-[var(--graphite-canvas)]/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--graphite-text-body)]"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--graphite-text-body)]" onClick={() => setOpen(false)}>
              Sign In
            </Link>
            <Link href="/signup" className={cn(MKT_BTN_GHOST, "w-full")} onClick={() => setOpen(false)}>
              Start free trial
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
