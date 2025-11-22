"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type TileLink = {
  id: string;
  label: string;
};

const TILE_LINKS: TileLink[] = [
  { id: "slate360", label: "Slate360" },
  { id: "design-studio", label: "Design Studio" },
  { id: "project-hub", label: "Project Hub" },
  { id: "content-studio", label: "Content Studio" },
  { id: "tour-builder", label: "360 Tour Builder" },
  { id: "geospatial", label: "Geospatial & Robotics" },
  { id: "virtual-studio", label: "Virtual Studio" },
  { id: "analytics", label: "Analytics & Reports" },
];

function scrollToTile(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleTileClick = (id: string) => {
    scrollToTile(id);
    setMenuOpen(false);
    setMobileOpen(false);
  };

  return (
    <header className="site-header fixed top-0 z-50 w-full">
      <nav className="flex w-full items-center justify-between px-6 py-2 lg:px-8">
        {/* LOGO: closer to left edge */}
        <Link
          href="/"
          className="flex items-center gap-3 flex-shrink-0 -ml-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme rounded-md"
          onClick={() => handleTileClick("slate360")}
        >
          <div className="relative h-16 w-64 sm:h-[4.5rem] sm:w-80">
            <Image
              src="/assets/slate360logoforwebsite.png"
              alt="Slate360 logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* DESKTOP NAV: pushed all the way to the right */}
        <div className="ml-auto hidden items-center gap-6 text-sm font-medium text-slate-200 lg:flex">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm shadow-sm hover:bg-white/10 text-slate-200"
            >
              <span>Menu</span>
              <span className="text-xs">▾</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-theme-overlay/95 border border-theme-accentSecondary/30 shadow-[0_22px_45px_rgba(15,23,42,0.9)] backdrop-blur-xl py-2">
                <div className="max-h-[60vh] overflow-y-auto space-y-0.5 px-2">
                  {TILE_LINKS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTileClick(item.id)}
                      className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-100 hover:bg-theme-accentSecondary/15 hover:text-theme-accent transition-colors duration-150"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {['Contact', 'About', 'Subscribe'].map((label) => (
              <Link 
                key={label} 
                href={`/${label.toLowerCase()}`} 
                className="group relative text-xs font-bold uppercase tracking-widest text-theme-muted transition-colors hover:text-theme-accent"
              >
                {label}
                {/* The Copper Line Animation */}
                <span className="absolute -bottom-2 left-0 h-[2px] w-full scale-x-0 bg-gradient-to-r from-theme-accent via-theme-accentSecondary to-theme-accent transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </Link>
            ))}
            <Link href="/login" className="ml-4 rounded-full border border-theme-accent/50 bg-theme-accent/10 px-6 py-2 text-xs font-bold uppercase tracking-widest text-theme-accent hover:bg-theme-accent/20 hover:shadow-blueGlow transition-all">
              Login
            </Link>
          </nav>
        </div>

        {/* MOBILE HAMBURGER: also aligned to the right */}
        <div className="ml-auto flex items-center gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-theme-border/60 bg-theme-overlay/30 text-slate-100 hover:bg-theme-overlay/45 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <span className="sr-only">Toggle menu</span>
            <div className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 rounded bg-slate-100" />
              <span className="block h-0.5 w-5 rounded bg-slate-100" />
              <span className="block h-0.5 w-5 rounded bg-slate-100" />
            </div>
          </button>
        </div>
      </nav>

      {/* MOBILE MENU OVERLAY */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-16 right-3 left-3 rounded-2xl bg-theme-overlay/90 border border-theme-accentSecondary/30 z-50 lg:hidden shadow-2xl backdrop-blur-xl">
            <div className="mx-auto max-w-6xl px-4 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex flex-col gap-1 text-sm">
                <Link
                  href="/about"
                  className="py-2 px-3 text-slate-100 hover:text-theme-accent hover:bg-theme-overlay/70 rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  About
                </Link>
                <Link
                  href="/contact"
                  className="py-2 px-3 text-slate-100 hover:text-theme-accent hover:bg-theme-overlay/70 rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Contact
                </Link>
                <Link
                  href="/subscribe"
                  className="py-2 px-3 text-slate-100 hover:text-theme-accent hover:bg-theme-overlay/70 rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Subscribe
                </Link>
                <Link
                  href="/login"
                  className="py-2 px-3 text-slate-100 hover:text-theme-accent hover:bg-theme-overlay/70 rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
              </div>

              <div className="h-px bg-slate-700/60" />

              <div className="space-y-0.5">
                {TILE_LINKS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTileClick(item.id)}
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-theme-overlay/80 hover:text-white transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
