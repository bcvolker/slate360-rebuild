"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { SlateIcon } from "@/components/shared/SlateIcon";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "What you get", href: "#what-you-get" },
  { label: "Client portal", href: "#portal" },
  { label: "How it works", href: "#how-it-works" },
] as const;

/**
 * Homepage nav — light marketing system (see marketing-styles-light.ts).
 * 78px bar / 40px logo, shrinking to 62px / 31px on scroll (~50% fill ratio
 * at both sizes — see docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md §3.1).
 * Login sits alone at the far top-right, visually secondary to the primary CTA.
 */
export function HomeNavLight() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-[var(--mkt-line)] bg-[var(--mkt-canvas)]/85 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1280px] items-center justify-between px-4 transition-[height] duration-300 sm:px-6 lg:px-10",
          scrolled ? "h-[62px]" : "h-[78px]",
        )}
      >
        <Link href="/" aria-label="Slate360 home" className="flex shrink-0 items-center gap-2.5">
          <SlateIcon
            className={cn("w-auto shrink-0 transition-[height] duration-300", scrolled ? "h-[31px]" : "h-10")}
          />
          <span
            className={cn(
              "font-semibold tracking-[0.13em] transition-[font-size] duration-300",
              scrolled ? "text-[16.5px]" : "text-[19px]",
            )}
          >
            <span className="text-[var(--mkt-ink)]">SLATE</span>
            <span className="text-[var(--mkt-brand-green)]">360</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-[var(--mkt-ink-muted)] transition-colors hover:text-[var(--mkt-ink)]">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <Link
            href="/#request-a-visit"
            className="inline-flex h-10 items-center justify-center rounded-[9px] bg-[var(--mkt-accent)] px-5 text-sm font-semibold text-white transition-all hover:brightness-110"
          >
            Request a site visit
          </Link>
          <Link href="/login" className="text-sm font-medium text-[var(--mkt-ink-muted)] transition-colors hover:text-[var(--mkt-ink)]">
            Login
          </Link>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--mkt-line)] text-[var(--mkt-ink-muted)] md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconX size={20} /> : <IconMenu2 size={20} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[var(--mkt-line)] bg-[var(--mkt-canvas)] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-[var(--mkt-ink)]"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/#request-a-visit"
              className="mt-2 inline-flex h-12 items-center justify-center rounded-[10px] bg-[var(--mkt-accent)] px-5 text-[15px] font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Request a site visit
            </Link>
            <Link
              href="/login"
              className="mt-1 inline-flex h-12 items-center justify-center rounded-lg px-3 text-[15px] font-medium text-[var(--mkt-ink-muted)]"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
