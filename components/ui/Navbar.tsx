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
  const [activeId, setActiveId] = useState<string>("slate360");
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

  // Track active section for secondary nav
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.id) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { threshold: 0.55 }
    );

    TILE_LINKS.forEach(section => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleTileClick = (id: string) => {
    scrollToTile(id);
    setMenuOpen(false);
    setMobileOpen(false);
  };

  return (
    <>
      <header className="site-header fixed top-0 z-50 w-full border-b border-[#A97142]/50">
        <nav className="flex w-full items-center justify-between pl-0 pr-6 py-2 lg:pl-0 lg:pr-8">
          {/* LOGO: closer to left edge */}
          <Link
            href="/"
            className="flex items-center gap-3 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme rounded-md"
            onClick={() => handleTileClick("slate360")}
          >
            <div className="relative h-16 w-64 sm:h-[4.5rem] sm:w-80 -ml-4">
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
          <div className="ml-auto hidden items-center gap-4 md:gap-6 text-xs md:text-sm font-medium text-slate-200 md:flex">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-[#4FA9FF]/50 bg-[#4FA9FF]/10 px-6 py-2 text-xs font-bold uppercase tracking-widest text-[#4FA9FF] transition-all hover:text-[#A97142] hover:border-[#A97142] hover:bg-[#A97142]/10 hover:shadow-[0_0_15px_rgba(169,113,66,0.4)]"
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
                        className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-100 hover:bg-[#A97142]/15 hover:text-[#A97142] transition-colors duration-150"
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
                  className="group relative text-xs font-bold uppercase tracking-widest text-[#4FA9FF] transition-all duration-300 hover:text-[#A97142] hover:drop-shadow-[0_0_8px_rgba(169,113,66,0.5)]"
                >
                  {label}
                  <span className="absolute -bottom-2 left-0 h-[2px] w-full scale-x-0 bg-gradient-to-r from-[#A97142] via-[#D49A6A] to-[#A97142] transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </Link>
              ))}
              <Link href="/login" className="ml-4 rounded-full border border-[#4FA9FF]/50 bg-[#4FA9FF]/10 px-6 py-2 text-xs font-bold uppercase tracking-widest text-[#4FA9FF] transition-all hover:text-[#A97142] hover:border-[#A97142] hover:bg-[#A97142]/10 hover:shadow-[0_0_15px_rgba(169,113,66,0.4)]">
                Login
              </Link>
            </nav>
          </div>

          {/* MOBILE HAMBURGER: also aligned to the right */}
          <div className="ml-auto flex items-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#4FA9FF]/50 bg-[#4FA9FF]/20 shadow-[0_0_15px_rgba(79,169,255,0.4)] transition-all hover:border-[#A97142] hover:bg-[#A97142]/20 hover:shadow-[0_0_15px_rgba(169,113,66,0.4)]"
              aria-label="Toggle navigation menu"
            >
              <span className="sr-only">Toggle menu</span>
              <div className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-5 rounded bg-white group-hover:bg-[#A97142] transition-colors" />
                <span className="block h-0.5 w-5 rounded bg-white group-hover:bg-[#A97142] transition-colors" />
                <span className="block h-0.5 w-5 rounded bg-white group-hover:bg-[#A97142] transition-colors" />
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
                    className="py-2 px-3 text-slate-100 hover:text-[#A97142] hover:bg-[#A97142]/15 rounded-lg transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    About
                  </Link>
                  <Link
                    href="/contact"
                    className="py-2 px-3 text-slate-100 hover:text-[#A97142] hover:bg-[#A97142]/15 rounded-lg transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    Contact
                  </Link>
                  <Link
                    href="/subscribe"
                    className="py-2 px-3 text-slate-100 hover:text-[#A97142] hover:bg-[#A97142]/15 rounded-lg transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    Subscribe
                  </Link>
                  <Link
                    href="/privacy"
                    className="py-2 px-3 text-slate-100 hover:text-[#A97142] hover:bg-[#A97142]/15 rounded-lg transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    Privacy
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

      {/* SECONDARY NAV: Row of text links to tiles */}
      <div className="hidden xl:flex fixed top-[100px] w-full justify-center gap-8 pt-1 px-4 z-40">
        {TILE_LINKS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleTileClick(item.id)}
            className={`text-sm font-bold uppercase tracking-widest transition-colors duration-300 ${
              activeId === item.id
                ? "text-[#4FA9FF] drop-shadow-[0_0_8px_rgba(79,169,255,0.5)]"
                : "text-slate-400 hover:text-[#4FA9FF]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}