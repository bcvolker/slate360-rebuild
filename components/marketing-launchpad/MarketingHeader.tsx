"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Menu, X } from "lucide-react";
import { Popover } from "radix-ui";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { NAV_LINK } from "@/components/marketing-launchpad/marketing-styles";
import { cn } from "@/lib/utils";

const PRODUCT_LINKS = [
  { label: "Site Walk Field Engine", href: "#site-walk-start" },
  { label: "Digital Twin Studio", href: "#digital-twin-start" },
] as const;

const MOBILE_NAV_LINKS = [
  { label: "Pricing", href: "#pricing-matrix-section" },
  { label: "Sign In", href: "/login" },
] as const;

const DROPDOWN_ITEM =
  "block rounded-lg p-3 text-sm font-medium text-slate-300 transition-all duration-150 hover:bg-white/[0.03] hover:text-[#00E699]";

const HAMBURGER_BTN =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-slate-900/40 text-slate-300 transition-all duration-150 hover:border-[#00E699]/30 hover:text-[#00E699] active:scale-[0.98] md:hidden";

export function MarketingHeader() {
  const [productOpen, setProductOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollToSection = useCallback((href: string) => {
    if (href.startsWith("#")) {
      const id = href.slice(1);
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
    setProductOpen(false);
    setMobileOpen(false);
  }, []);

  return (
    <header className="fixed top-0 z-50 h-16 w-full border-b border-white/[0.05] bg-[#0B0F15]/90 backdrop-blur-xl">
      <div className="relative mx-auto grid h-full w-full grid-cols-[auto_1fr_auto] items-center px-6 lg:px-12">
        <Link href="/" aria-label="Slate360 home" className="shrink-0">
          <Slate360Logo variant="dark" />
        </Link>

        <nav className="hidden items-center justify-self-end gap-8 md:flex">
          <Popover.Root open={productOpen} onOpenChange={setProductOpen}>
            <Popover.Trigger asChild>
              <button type="button" className={NAV_LINK} aria-haspopup="dialog">
                Product
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                sideOffset={8}
                align="start"
                className="z-50 mt-2 w-64 rounded-xl border border-white/[0.08] bg-[#0B0F15]/95 p-2 shadow-2xl backdrop-blur-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
              >
                {PRODUCT_LINKS.map((link) => (
                  <button
                    key={link.href}
                    type="button"
                    className={`${DROPDOWN_ITEM} w-full text-left`}
                    onClick={() => scrollToSection(link.href)}
                  >
                    {link.label}
                  </button>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          <Link href="#pricing-matrix-section" className={NAV_LINK}>
            Pricing
          </Link>
          <Link href="/login" className={NAV_LINK}>
            Sign In
          </Link>
        </nav>

        <button
          type="button"
          className={cn(HAMBURGER_BTN, "justify-self-end")}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="absolute left-0 right-0 top-16 border-b border-white/[0.08] bg-[#0B0F15]/95 px-6 py-4 backdrop-blur-2xl md:hidden">
          <div className="space-y-1">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[#A3AED0]">
              Product
            </p>
            {PRODUCT_LINKS.map((link) => (
              <button
                key={link.href}
                type="button"
                className={cn(DROPDOWN_ITEM, "w-full text-left")}
                onClick={() => scrollToSection(link.href)}
              >
                {link.label}
              </button>
            ))}
            {MOBILE_NAV_LINKS.map((link) =>
              link.href.startsWith("#") ? (
                <button
                  key={link.href}
                  type="button"
                  className={cn(DROPDOWN_ITEM, "w-full text-left")}
                  onClick={() => scrollToSection(link.href)}
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={DROPDOWN_ITEM}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ),
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
