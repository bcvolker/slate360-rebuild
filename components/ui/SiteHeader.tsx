"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { siteNavLinks, siteSections } from "@/lib/config";

import { clsx } from "clsx";

const NAV_LINKS = siteNavLinks;

interface SiteHeaderProps {
  variant?: "dark" | "light";
}

export default function SiteHeader({ variant }: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Determine if we should use the light variant
  // Use prop if provided, otherwise default to light for non-home pages
  const isLight = variant === "light" || (variant === undefined && pathname !== "/");

  const closeMenus = () => {
    setMenuOpen(false);
    setMobileOpen(false);
  };

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

  const anchorFor = (id: string) => {
    if (pathname === "/") {
      return `#${id}`;
    }
    return `/#${id}`;
  };

  const handleLogoClick = useCallback(() => {
    closeMenus();
  }, []);

  return (
    <>
      {/* Fixed header: Blueprint Ultra gradient background */}
      <header 
        className={clsx(
          "fixed top-0 left-0 right-0 z-[9999] w-full border-b backdrop-blur-sm transition-colors duration-300",
          isLight 
            ? "bg-white/85 border-slate-200" 
            : "bg-[#050814]/95 border-slate-800 shadow-md backdrop-blur-lg"
        )}
      >
        
        <nav className="relative z-[10000] flex w-full items-center justify-between pl-6 pr-6 py-2 landscape:py-1 lg:py-2 lg:pl-8 lg:pr-8">
          {/* LOGO: Blueprint Compass */}
          <Link
            href={anchorFor("slate360")}
            className="group flex items-center gap-3 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-blueprint"
            onClick={handleLogoClick}
          >
            <img
              src="/slate360-logo-blueprint-compass-light.svg"
              alt="Slate360 Logo"
              className="h-12 md:h-14 w-auto"
            />
          </Link>

          {/* DESKTOP NAV: right-aligned, high-contrast on blueprint header */}
          <div className={clsx(
            "ml-auto hidden items-center gap-4 md:gap-6 text-xs md:text-sm font-medium lg:flex",
            isLight ? "text-blue-600" : "text-blue-600"
          )}>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full border px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all landscape:px-4 landscape:py-1 lg:px-6 lg:py-2 font-orbitron shadow-lg",
                  isLight 
                    ? "border-slate-300 bg-white/50 text-blue-600 hover:bg-slate-100 hover:border-slate-400 hover:text-[#B87333] hover:shadow-md"
                    : "border-slate-700 bg-white/10 text-blue-600 hover:bg-slate-800 hover:border-slate-600 hover:text-[#B87333] hover:shadow-[0_0_15px_rgba(184,115,51,0.3)]"
                )}
              >
                <span>Features</span>
                <span className="text-xs">▾</span>
              </button>
              {menuOpen && (
                <div className={clsx(
                  "absolute right-0 mt-3 w-64 rounded-2xl border shadow-xl py-2 backdrop-blur-md",
                  isLight 
                    ? "bg-white border-slate-200"
                    : "bg-slate-900 border-slate-700"
                )}>
                  <div className="max-h-[60vh] overflow-y-auto space-y-0.5 px-2">
                    {NAV_LINKS.map((item) => (
                      <Link
                        key={item.id}
                        href={anchorFor(item.id)}
                        onClick={closeMenus}
                        className={clsx(
                          "block w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 font-orbitron",
                          isLight
                            ? "text-blue-600 hover:bg-slate-100 hover:text-[#B87333]"
                            : "text-blue-500 hover:bg-slate-800 hover:text-[#B87333]"
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <nav className="hidden md:flex items-center gap-8">
              {/* Desktop Nav: dark text on metallic, pure blue hover */}
              {["Plans & Pricing", "About"].map((label) => (
                <Link 
                  key={label} 
                  href={label === "Plans & Pricing" ? "/subscribe" : `/${label.toLowerCase()}`} 
                  className={clsx(
                    "group relative text-xs font-bold uppercase tracking-widest transition-all duration-300 font-orbitron drop-shadow-md",
                    isLight 
                      ? "text-blue-600 hover:text-[#B87333]"
                      : "text-blue-500 hover:text-[#B87333]"
                  )}
                >
                  {label}
                  <span className="absolute -bottom-2 left-0 h-[2px] w-full scale-x-0 bg-[#B87333] transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </Link>
              ))}
            </nav>
          </div>

          {/* MOBILE HAMBURGER: also aligned to the right */}
          <div className="ml-auto flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-sm transition-all hover:border-[color:var(--slate-blueprint-accent)] hover:bg-[color:var(--slate-blueprint-accent)]/20"
              aria-label="Toggle navigation menu"
            >
              <span className="sr-only">Toggle menu</span>
              <div className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-5 rounded bg-slate-100 group-hover:bg-blue-600 transition-colors" />
                <span className="block h-0.5 w-5 rounded bg-slate-100 group-hover:bg-blue-600 transition-colors" />
                <span className="block h-0.5 w-5 rounded bg-slate-100 group-hover:bg-blue-600 transition-colors" />
              </div>
            </button>
          </div>
        </nav>

      </header>

      {/* MOBILE MENU OVERLAY - Moved outside header to avoid stacking context issues */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[9000] md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          
          {/* Menu Container - Auto height, max 85vh */}
          <div className="absolute top-0 left-0 right-0 bg-slate-50 flex flex-col max-h-[85vh] shadow-2xl rounded-b-3xl overflow-hidden">
            {/* Top Bar */}
            <div className="flex h-16 items-center justify-between px-4 bg-slate-950 text-slate-50 shrink-0">
              {/* Added Logo to Menu Header */}
              <div className="relative h-10 w-40 -ml-2 flex items-center gap-2">
                 {/* Favicon/Icon */}
                 <div className="relative h-8 w-8">
                    <Image
                      src="/favicon.svg"
                      alt="Slate360 Icon"
                      fill
                      className="object-contain"
                    />
                 </div>
                 <span className="font-orbitron font-bold text-lg tracking-widest text-white">SLATE360</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="overflow-y-auto px-4 py-6 space-y-4">
              {/* Primary Links Reordered: Login -> Plans & Pricing -> About */}
              <div className="space-y-2">
                {["Login", "Plans & Pricing", "About"].map((label) => (
                <Link
                  key={label}
                  href={label === "Plans & Pricing" ? "/subscribe" : label === "Login" ? "/login" : `/${label.toLowerCase()}`}
                  onClick={closeMenus}
                  className="block rounded-xl px-4 py-3 text-base font-bold text-blue-600 bg-white border border-slate-200/50 hover:bg-slate-50 hover:text-[#B87333] transition-colors font-orbitron shadow-sm"
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Features Accordion (Last) */}
            <details className="group rounded-2xl bg-white/80 shadow-sm border border-slate-200/50 open:bg-white transition-all">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none">
                <span className="font-bold text-blue-600 font-orbitron tracking-wide">Features</span>
                <span className="text-xs text-slate-500 group-open:hidden">Tap to expand</span>
                <span className="text-xs text-slate-500 hidden group-open:block">Collapse</span>
              </summary>

              <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-3 text-sm border-t border-slate-100 mt-1">
                {siteSections.map((item) => (
                  <Link
                    key={item.id}
                    href={anchorFor(item.id)}
                    onClick={closeMenus}
                    className="text-left rounded-xl px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-[#B87333] font-medium text-xs leading-tight border border-slate-100"
                  >
                    {item.navLabel || item.title}
                  </Link>
                ))}
              </div>
            </details>
          </nav>
          </div>
        </div>
      )}
    </>
  );
}