"use client";

import Link from "next/link";
import { useState } from "react";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { NAV_LINK } from "@/components/marketing-launchpad/marketing-styles";

const PRODUCT_LINKS = [
  { label: "📷 Site Walk", href: "#site-walk-start" },
  { label: "🌐 Digital Twin", href: "#digital-twin-start" },
] as const;

export function MarketingHeader() {
  const [productOpen, setProductOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between border-b border-white/[0.05] bg-[#0B0F15]/80 px-6 backdrop-blur-xl lg:px-12">
      <Link href="/" aria-label="Slate360 home">
        <Slate360Logo variant="dark" />
      </Link>
      <nav className="flex items-center gap-8">
        <div
          className="relative"
          onMouseEnter={() => setProductOpen(true)}
          onMouseLeave={() => setProductOpen(false)}
        >
          <button type="button" className={NAV_LINK} aria-expanded={productOpen}>
            Product
          </button>
          {productOpen ? (
            <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/[0.08] bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
              {PRODUCT_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/[0.05] hover:text-[#00E699]"
                >
                  {link.label}
                </Link>
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
