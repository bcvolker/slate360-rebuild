"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const tileLinks = [
  { href: "#project-hub", label: "Project Hub" },
  { href: "#bim-studio", label: "BIM Studio" },
  { href: "#content-studio", label: "Content Studio" },
  { href: "#geospatial", label: "Geospatial & Robotics" },
  { href: "#tour-builder", label: "360 Tour Builder" },
  { href: "#xr", label: "AR/VR Studio" },
  { href: "#reports", label: "Analytics & Reports" },
];

const rightLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/login", label: "Login" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: Event) {
      if (!menuRef.current) return;
      const target = e.target as Node | null;
      if (target && !menuRef.current.contains(target)) setMenuOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if ((e as KeyboardEvent).key === "Escape") {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-20">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 to-black/0" />
      <div className="h-20 backdrop-blur supports-[backdrop-filter]:bg-slate-900/70 bg-slate-900/85 border-b border-white/10">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center">
            <div className="relative h-8 w-8 overflow-hidden rounded">
              <Image src="/slate360logoforwebsite.png" alt="Slate360" fill sizes="32px" className="object-contain" />
            </div>
            <span className="sr-only">Slate360</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-100 hover:bg-white/5"
              >
                Menu
                <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
                  <path fill="currentColor" d="M5.5 7.5l4.5 4.5 4.5-4.5h-9z" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur"
                >
                  <nav className="flex flex-col py-2">
                    {tileLinks.map((n) => (
                      <a
                        key={n.href}
                        href={n.href}
                        className="px-4 py-2 text-sm text-gray-200 hover:bg-white/5"
                        onClick={() => setMenuOpen(false)}
                      >
                        {n.label}
                      </a>
                    ))}
                  </nav>
                </div>
              )}
            </div>

            <nav className="flex items-center gap-5">
              {rightLinks.map((n) => (
                <Link key={n.href} href={n.href} className="text-sm text-gray-300 hover:text-white transition-colors">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>

          <button
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-white"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            Menu
          </button>
        </div>

        {mobileOpen && (
          <div id="mobile-nav" className="md:hidden border-t border-white/10 bg-slate-900/95 backdrop-blur">
            <nav className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              <div className="grid gap-2">
                <div className="text-xs uppercase tracking-wide text-gray-400">Tiles</div>
                {tileLinks.map((n) => (
                  <a key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-gray-200 hover:bg-white/5" onClick={() => setMobileOpen(false)}>
                    {n.label}
                  </a>
                ))}
              </div>
              <hr className="my-3 border-white/10" />
              <div className="grid gap-2">
                {rightLinks.map((n) => (
                  <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-gray-200 hover:bg-white/5" onClick={() => setMobileOpen(false)}>
                    {n.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}