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
  { id: "project-hub", label: "Project Hub" },
  { id: "bim", label: "BIM Studio" },
  { id: "content", label: "Content Studio" },
  { id: "geospatial", label: "Geospatial & Robotics" },
  { id: "tour", label: "360 Tour Builder" },
  { id: "vr", label: "AR/VR Studio" },
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

  // Close dropdowns when clicking outside
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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-700/50 bg-slate-950/95 backdrop-blur-md shadow-lg">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-8">
        {/* Logo - Made larger and more prominent */}
        <Link
          href="/"
          className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md"
          onClick={() => handleTileClick("slate360")}
        >
          <div className="relative h-11 w-44 sm:h-12 sm:w-52">
            <Image
              src="/assets/slate360logoforwebsite.png"
              alt="Slate360 logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-6 text-sm font-medium text-slate-100 md:flex">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-600/60 bg-slate-900/70 px-4 py-1.5 text-sm shadow-sm hover:bg-slate-800"
            >
              <span>Menu</span>
              <span className="text-xs">▾</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 max-h-[60vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
                <div className="p-2 space-y-0.5">
                  {TILE_LINKS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTileClick(item.id)}
                      className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800/90 hover:text-white transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link href="/about" className="hover:text-sky-400 transition-colors">
            About
          </Link>
          <Link href="/contact" className="hover:text-sky-400 transition-colors">
            Contact
          </Link>
          <Link href="/subscribe" className="hover:text-sky-400 transition-colors">
            Subscribe
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-sky-500/70 bg-sky-500/20 px-4 py-2 text-sky-100 hover:bg-sky-500/30 hover:border-sky-400/70 transition-colors"
          >
            Login
          </Link>
        </div>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-600/70 bg-slate-800/90 text-slate-100 hover:bg-slate-700 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <span className="sr-only">Toggle menu</span>
            {/* Simple hamburger icon */}
            <div className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 rounded bg-slate-100" />
              <span className="block h-0.5 w-5 rounded bg-slate-100" />
              <span className="block h-0.5 w-5 rounded bg-slate-100" />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown panel - solid background to prevent text showing through */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-700/60 bg-slate-950 shadow-xl">
          <div className="mx-auto max-w-6xl px-4 py-4 space-y-4">
            <div className="flex flex-col gap-1 text-sm">
              <Link
                href="/about"
                className="py-2 px-3 text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="py-2 px-3 text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Contact
              </Link>
              <Link
                href="/subscribe"
                className="py-2 px-3 text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Subscribe
              </Link>
              <Link
                href="/login"
                className="py-2 px-3 text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
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
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800/90 hover:text-white transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
