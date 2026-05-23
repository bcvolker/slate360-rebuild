"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { NAV_LINK } from "@/components/marketing-launchpad/marketing-styles";

const PRODUCT_LINKS = [
  { label: "📷 Site Walk Field Engine", href: "#site-walk-start" },
  { label: "🌐 Digital Twin Studio", href: "#digital-twin-start" },
] as const;

export function MarketingHeader() {
  const [productOpen, setProductOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setProductOpen(false), []);

  useEffect(() => {
    if (!productOpen) return;

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
  }, [productOpen, closeMenu]);

  return (
    <>
      <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between border-b border-white/[0.05] bg-[#0B0F15]/80 px-6 backdrop-blur-xl lg:px-12">
        <Link href="/" aria-label="Slate360 home">
          <Slate360Logo variant="dark" />
        </Link>
        <nav className="flex items-center gap-8">
          <div ref={menuRef} className="relative">
            <button
              type="button"
              className={NAV_LINK}
              aria-expanded={productOpen}
              aria-haspopup="true"
              onClick={() => setProductOpen((open) => !open)}
            >
              Product
            </button>
          </div>
          <Link href="#pricing-matrix-section" className={NAV_LINK}>
            Pricing
          </Link>
          <Link href="/login" className={NAV_LINK}>
            Sign In
          </Link>
        </nav>
      </header>

      {productOpen ? (
        <div className="fixed left-0 right-0 top-20 z-40 border-b border-white/[0.08] bg-slate-900/90 backdrop-blur-xl">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
            {PRODUCT_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="block border-t border-white/[0.06] px-4 py-5 text-base font-medium text-[#F8FAFC] transition-colors first:border-t-0 hover:bg-white/[0.05] hover:text-[#00E699]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
