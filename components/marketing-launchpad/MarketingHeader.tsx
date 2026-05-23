"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { NAV_LINK } from "@/components/marketing-launchpad/marketing-styles";

const PRODUCT_LINKS = [
  { label: "📷 Site Walk Field Engine", href: "#site-walk-start" },
  { label: "🌐 Digital Twin Studio", href: "#digital-twin-start" },
] as const;

const DROPDOWN_ITEM =
  "block rounded-lg p-3 text-sm font-medium text-slate-300 transition-all duration-150 hover:bg-white/[0.03] hover:text-[#00E699]";

export function MarketingHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setIsOpen(false), []);

  const scrollToSection = useCallback(
    (href: string) => {
      const id = href.slice(1);
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      closeMenu();
    },
    [closeMenu],
  );

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, closeMenu]);

  return (
    <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/[0.05] bg-[#0B0F15]/90 px-6 backdrop-blur-xl lg:px-12">
      <Link href="/" aria-label="Slate360 home" className="shrink-0">
        <Slate360Logo variant="dark" />
      </Link>

      <nav className="flex items-center gap-8">
        <div ref={menuRef} className="relative">
          <button
            type="button"
            className={NAV_LINK}
            aria-expanded={isOpen}
            aria-haspopup="true"
            onClick={() => setIsOpen((open) => !open)}
          >
            Product
          </button>

          {isOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-white/[0.08] bg-[#0B0F15]/95 p-2 shadow-2xl backdrop-blur-2xl">
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
            </div>
          ) : null}
        </div>

        <Link href="#pricing-matrix-section" className={NAV_LINK}>
          Pricing
        </Link>
        <Link href="/login" className={NAV_LINK}>
          Sign In
        </Link>
      </nav>
    </header>
  );
}
