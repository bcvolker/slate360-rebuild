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
  { id: "bim", label: "Design Studio" },
  { id: "project-hub", label: "Project Hub" },
  { id: "content", label: "Content Studio" },
  { id: "tour", label: "360 Tour Builder" },
  { id: "geospatial", label: "Geospatial & Robotics" },
  { id: "vr", label: "Virtual Studio" },
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
    <header className="fixed top-0 z-50 w-full border-b border-slate360-copper/20 bg-slate360-charcoal/60 backdrop-blur-md transition-all">
      <div className="absolute top-0 left-1/2 bg-red-600 text-white font-bold z-[100] px-4 py-2">VERSION 5 - CACHE CHECK</div>
      <nav className="flex w-full items-center justify-between px-6 py-4 lg:px-8">
        {/* LOGO: closer to left edge */}
        <Link
          href="/"
          className="flex items-center gap-3 flex-shrink-0 -ml-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md"
          onClick={() => handleTileClick("slate360")}
        >
          <div className="relative h-14 w-60 sm:h-16 sm:w-72">
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
        <div className="ml-auto hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
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

          <nav className="hidden md:flex items-center gap-8">
            {['Contact', 'About', 'Subscribe'].map((label) => (
              <Link 
                key={label} 
                href={`/${label.toLowerCase()}`} 
                className="group relative text-xs font-bold uppercase tracking-widest text-slate-300 transition-colors hover:text-slate360-blue"
              >
                {label}
                {/* The Copper Line Animation */}
                <span className="absolute -bottom-2 left-0 h-[2px] w-full scale-x-0 bg-gradient-to-r from-slate360-blue via-slate360-copper to-slate360-blue transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </Link>
            ))}
            <Link href="/login" className="ml-4 rounded-full border border-slate360-blue/50 bg-slate360-blue/10 px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate360-blue hover:bg-slate360-blue/20 hover:shadow-blueGlow transition-all">
              Login
            </Link>
          </nav>
        </div>

        {/* MOBILE HAMBURGER: also aligned to the right */}
        <div className="ml-auto flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-600/70 bg-slate-800/90 text-slate-100 hover:bg-slate-700 transition-colors"
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
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-16 right-3 left-3 rounded-2xl bg-[#0B1014] border border-[#B46E3A]/30 z-50 md:hidden shadow-2xl">
            <div className="mx-auto max-w-6xl px-4 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex flex-col gap-1 text-sm">
                <Link
                  href="/about"
                  className="py-2 px-3 text-slate-100 hover:text-[#4B9CD3] hover:bg-[#11161C] rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  About
                </Link>
                <Link
                  href="/contact"
                  className="py-2 px-3 text-slate-100 hover:text-[#4B9CD3] hover:bg-[#11161C] rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Contact
                </Link>
                <Link
                  href="/subscribe"
                  className="py-2 px-3 text-slate-100 hover:text-[#4B9CD3] hover:bg-[#11161C] rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Subscribe
                </Link>
                <Link
                  href="/login"
                  className="py-2 px-3 text-slate-100 hover:text-[#4B9CD3] hover:bg-[#11161C] rounded-lg transition-colors"
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
        </>
      )}
    </header>
  );
}
