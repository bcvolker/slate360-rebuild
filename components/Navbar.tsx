"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const nav = [
  { href: "#project-hub", label: "Project Hub" },
  { href: "#bim-studio", label: "BIM Studio" },
  { href: "#content-studio", label: "Content" },
  { href: "#geospatial", label: "Geospatial & Robotics" },
  { href: "#tour-builder", label: "360 Tours" },
  { href: "#xr", label: "VR/AR" },
  { href: "#reports", label: "Reports & Analytics" },
];

export default function Navbar() {
  const pathname = usePathname(); // reserved for future route-aware styles
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-20">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 to-black/0" />
      <div className="h-20 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 bg-slate-900/80 border-b border-white/10">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded">
              <Image
                src="/logo.png"
                alt="Slate360"
                fill
                sizes="32px"
                className="object-contain"
                onError={() => {}}
              />
            </div>
            <span className="text-lg font-semibold tracking-wide text-white">Slate360</span>
          </Link>

          <nav className="hidden md:flex items-center gap-5">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="text-sm text-gray-300 hover:text-white transition-colors">
                {n.label}
              </a>
            ))}
          </nav>

          <button
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-white"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            Menu
          </button>
        </div>

        {open && (
          <div id="mobile-nav" className="md:hidden border-t border-white/10 bg-slate-900/95 backdrop-blur">
            <nav className="mx-auto grid max-w-7xl gap-2 px-4 py-3 sm:px-6">
              {nav.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  className="rounded-lg px-3 py-2 text-gray-200 hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  {n.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}