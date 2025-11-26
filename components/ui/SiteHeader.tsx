"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { siteNavLinks } from "@/lib/config";

import { clsx } from "clsx";

const NAV_LINKS = siteNavLinks;

interface SiteHeaderProps {
  variant?: "dark" | "light";
}

export default function SiteHeader({ variant }: SiteHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeId, setActiveId] = useState("");
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

  // Track active section for secondary nav
  const visibleSections = useRef(new Set<string>());

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname !== "/") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections.current.add(entry.target.id);
          } else {
            visibleSections.current.delete(entry.target.id);
          }
        });

        let newActiveId = "";
        for (let i = NAV_LINKS.length - 1; i >= 0; i--) {
          const id = NAV_LINKS[i].id;
          if (visibleSections.current.has(id)) {
            newActiveId = id;
            break;
          }
        }
        setActiveId(newActiveId);
      },
      {
        threshold: 0.1,
        rootMargin: "-80px 0px -40% 0px",
      }
    );

    // Small timeout to ensure DOM elements are present after navigation
    const timer = setTimeout(() => {
      NAV_LINKS.forEach((section) => {
        const el = document.getElementById(section.id);
        if (el) observer.observe(el);
      });
    }, 100);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [pathname]);

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
            : "bg-slate-900/90 border-slate-800 backdrop-blur-md"
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
              className="h-11 md:h-12 w-auto"
            />
          </Link>

          {/* DESKTOP NAV: right-aligned, high-contrast on blueprint header */}
          <div className={clsx(
            "ml-auto hidden items-center gap-4 md:gap-6 text-xs md:text-sm font-medium lg:flex",
            isLight ? "text-slate-700" : "text-[color:var(--slate-silver)]"
          )}>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full border px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all landscape:px-4 landscape:py-1 lg:px-6 lg:py-2 font-orbitron shadow-lg",
                  isLight 
                    ? "border-slate-300 bg-white/50 text-slate-800 hover:bg-slate-100 hover:border-slate-400 hover:shadow-md"
                    : "border-[color:var(--slate-border-light)] bg-white/10 text-[color:var(--slate-text-main)] hover:bg-[color:var(--slate-blueprint-accent)]/30 hover:border-[color:var(--slate-blueprint-accent)] hover:text-white hover:shadow-[0_0_15px_rgba(26,93,255,0.5)]"
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
                    : "bg-[color:var(--slate-blueprint)] border-[color:var(--slate-border-light)]"
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
                            ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                            : "text-[color:var(--slate-silver)] hover:bg-[color:var(--slate-blueprint-accent)]/20 hover:text-[color:var(--slate-text-main)]"
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
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-[color:var(--slate-silver)] hover:text-[color:var(--slate-text-main)]"
                  )}
                >
                  {label}
                  <span className="absolute -bottom-2 left-0 h-[2px] w-full scale-x-0 bg-[color:var(--slate-copper)] transition-transform duration-300 ease-out group-hover:scale-x-100" />
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
                <span className="block h-0.5 w-5 rounded bg-slate-100 group-hover:bg-[color:var(--slate-copper)] transition-colors" />
                <span className="block h-0.5 w-5 rounded bg-slate-100 group-hover:bg-[color:var(--slate-copper)] transition-colors" />
                <span className="block h-0.5 w-5 rounded bg-slate-100 group-hover:bg-[color:var(--slate-copper)] transition-colors" />
              </div>
            </button>
          </div>
        </nav>

      </header>

      {/* MOBILE MENU OVERLAY - Moved outside header to avoid stacking context issues */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col lg:hidden">
          {/* Backdrop - Full screen button to capture clicks */}
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-black/70 backdrop-blur-sm cursor-pointer border-none outline-none"
            onClick={() => setMobileOpen(false)}
            onTouchEnd={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          
          {/* Menu Panel - Sits on top of backdrop */}
          <div 
            className="relative z-10 flex flex-col border-b border-slate-200 bg-white p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              {/* Added Logo to Menu Header */}
              <div className="relative h-10 w-40 -ml-2">
                <Image
                  src="/slate360-logo-blueprint-compass-light.svg"
                  alt="Slate360 logo"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                aria-label="Close menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.id}
                  href={anchorFor(item.id)}
                  onClick={closeMenus}
                  className={`block rounded-lg px-4 py-3 text-base font-medium transition-colors font-orbitron ${
                    activeId === item.id
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-2 border-t border-slate-100" />
              {["Plans & Pricing", "About", "Login"].map((label) => (
                <Link
                  key={label}
                  href={label === "Plans & Pricing" ? "/subscribe" : label === "Login" ? "/login" : `/${label.toLowerCase()}`}
                  onClick={closeMenus}
                  className="block rounded-lg px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors font-orbitron"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}