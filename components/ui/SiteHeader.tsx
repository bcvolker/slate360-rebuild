"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { siteNavLinks } from "@/lib/config";

const NAV_LINKS = siteNavLinks;

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("slate360");
  const menuRef = useRef<HTMLDivElement | null>(null);
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

    NAV_LINKS.forEach(section => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const anchorFor = (id: string) => `/#${id}`;

  return (
    <>
      {/* Fixed header with dark ribbon so the logo sits on a clean, high-contrast band. */}
      {/* Removed site-header class to avoid conflicts. Added explicit Tailwind styles for background and blur. */}
      {/* Changed to dark charcoal with subtle bottom border and shadow for "pop" */}
      <header className="fixed top-0 z-[100] w-full border-b border-white/10 bg-slate360-charcoal/95 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-all duration-300">
        <nav className="relative z-[101] flex w-full items-center justify-between pl-6 pr-6 py-2 landscape:py-1 lg:py-2 lg:pl-8 lg:pr-8">
          {/* LOGO: slightly larger with a subtle halo so it never feels muted. */}
          {/* LOGO: closer to left edge */}
          <Link
            href={anchorFor("slate360")}
            className="flex items-center gap-3 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme rounded-md"
            onClick={closeMenus}
          >
            {/* Adjusted negative margin to pull logo further left on mobile/tablet */}
            {/* Added drop-shadow to make logo pop against the dark header */}
            <div className="relative h-16 w-64 sm:h-[4.5rem] sm:w-80 lg:h-[4.5rem] lg:w-80 transition-all duration-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]">
              <Image
                src="/assets/slate360logoforwebsite.png"
                alt="Slate360 logo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          {/* DESKTOP NAV: pushed all the way to the right */}
          <div className="ml-auto hidden items-center gap-4 md:gap-6 text-xs md:text-sm font-medium text-white lg:flex">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-brand-blue/50 bg-brand-blue/10 px-6 py-2 text-xs font-bold uppercase tracking-widest text-brand-blue transition-all hover:text-brand-copper hover:border-brand-copper hover:bg-brand-copper/10 hover:shadow-[0_0_15px_rgba(179,112,49,0.4)] landscape:px-4 landscape:py-1 lg:px-6 lg:py-2 font-orbitron"
              >
                <span>Features</span>
                <span className="text-xs">▾</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-slate360-charcoal/95 border border-white/10 shadow-[0_22px_45px_rgba(0,0,0,0.9)] backdrop-blur-xl py-2">
                  <div className="max-h-[60vh] overflow-y-auto space-y-0.5 px-2">
                    {NAV_LINKS.map((item) => (
                      <Link
                        key={item.id}
                        href={anchorFor(item.id)}
                        onClick={closeMenus}
                        className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-white hover:bg-brand-copper/15 hover:text-brand-copper transition-colors duration-150 font-orbitron"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

                        <nav className="hidden md:flex items-center gap-8">
              {/* Updated Desktop Nav: Light text on dark background */}
              {["Plans & Pricing", "About"].map((label) => (
                <Link 
                  key={label} 
                  href={label === "Plans & Pricing" ? "/subscribe" : `/${label.toLowerCase()}`} 
                  className="group relative text-xs font-bold uppercase tracking-widest text-slate-200 transition-all duration-300 hover:text-brand-blue font-orbitron"
                >
                  {label}
                  <span className="absolute -bottom-2 left-0 h-[2px] w-full scale-x-0 bg-gradient-to-r from-brand-blue via-[#8CC5FF] to-brand-blue transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </Link>
              ))}
              <Link href="/login" className="ml-4 rounded-full border border-white/30 bg-white/5 px-6 py-2 text-xs font-bold uppercase tracking-widest text-white transition-all hover:text-brand-blue hover:border-brand-blue hover:bg-brand-blue/10 font-orbitron">
                Login
              </Link>
            </nav>
          </div>

          {/* MOBILE HAMBURGER: also aligned to the right */}
          <div className="ml-auto flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-blue/50 bg-brand-blue/20 shadow-[0_0_15px_rgba(79,137,212,0.4)] transition-all hover:border-brand-copper hover:bg-brand-copper/20 hover:shadow-[0_0_15px_rgba(179,112,49,0.4)]"
              aria-label="Toggle navigation menu"
            >
              <span className="sr-only">Toggle menu</span>
              <div className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-5 rounded bg-white group-hover:bg-brand-copper transition-colors" />
                <span className="block h-0.5 w-5 rounded bg-white group-hover:bg-brand-copper transition-colors" />
                <span className="block h-0.5 w-5 rounded bg-white group-hover:bg-brand-copper transition-colors" />
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
            className="absolute inset-0 h-full w-full bg-black/60 backdrop-blur-sm cursor-pointer border-none outline-none"
            onClick={() => setMobileOpen(false)}
            onTouchEnd={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          
          {/* Menu Panel - Sits on top of backdrop */}
          <div 
            className="relative z-10 flex flex-col border-b border-white/10 bg-slate360-charcoal/95 p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              {/* Added Logo to Menu Header */}
              <div className="relative h-12 w-40 -ml-2">
                <Image
                  src="/assets/slate360logoforwebsite.png"
                  alt="Slate360 logo"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <span className="sr-only">Close menu</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

              <div className="space-y-6">
                <nav className="flex flex-col gap-4">
                  {/* Reordered Mobile Links: Login, Get Started, About, Contact */}
                  <Link 
                    href="/login" 
                    onClick={() => setMobileOpen(false)}
                    className="inline-block w-fit rounded-full border border-brand-blue/50 bg-brand-blue/10 px-6 py-2 text-xs font-bold uppercase tracking-widest text-brand-blue hover:bg-brand-copper/10 hover:text-brand-copper hover:border-brand-copper font-orbitron"
                  >
                    Login
                  </Link>
                  
                  <Link
                    href="/subscribe"
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-bold uppercase tracking-widest text-brand-blue hover:text-brand-copper font-orbitron"
                  >
                    Get Started
                  </Link>

                  {['About', 'Contact'].map((label) => (
                    <Link
                      key={label}
                      href={`/${label.toLowerCase()}`}
                      onClick={() => setMobileOpen(false)}
                      className="text-lg font-bold uppercase tracking-widest text-brand-blue hover:text-brand-copper font-orbitron"
                    >
                      {label}
                    </Link>
                  ))}
                </nav>              <div className="h-px bg-white/10" />

              {/* Condense links into 2 columns */}
              <div className="grid grid-cols-2 gap-2">
                {NAV_LINKS.map((item) => (
                  <Link
                    key={item.id}
                    href={anchorFor(item.id)}
                    onClick={closeMenus}
                    className="w-full rounded-lg px-2 py-2 text-left text-xs text-white hover:bg-white/10 hover:text-brand-blue transition-colors truncate font-orbitron"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECONDARY NAV: Stacked on the right */}
      <div className="hidden xl:flex flex-col fixed top-[calc(var(--navbar-height)+0.5rem)] right-8 items-end gap-1 z-40">
        {NAV_LINKS.map((item) => (
          <Link
            key={item.id}
            href={anchorFor(item.id)}
            onClick={() => setMenuOpen(false)}
            className={`text-[9px] lg:text-[10px] font-orbitron tracking-wider transition-colors duration-300 ${
              activeId === item.id
                ? "text-brand-blue font-bold"
                : "text-slate-500 font-medium hover:text-brand-blue"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </>
  );
}