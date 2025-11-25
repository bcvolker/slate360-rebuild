"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { siteNavLinks } from "@/lib/config";

const NAV_LINKS = siteNavLinks;

export default function SiteHeader() {
  const pathname = usePathname();
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
      {/* Fixed header: Metallic gradient background */}
      <header className="fixed top-0 z-[100] w-full bg-metallic-header">
        
        <nav className="relative z-[101] flex w-full items-center justify-between pl-6 pr-6 py-2 landscape:py-1 lg:py-2 lg:pl-8 lg:pr-8">
          {/* LOGO: Enhanced pop with brightness and larger shadow */}
          <Link
            href={anchorFor("slate360")}
            className="group flex items-center gap-3 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--slate360-blue)] rounded-md relative z-[102]"
            onClick={closeMenus}
          >
            <div className="relative h-16 w-64 sm:h-[4.5rem] sm:w-80 lg:h-[4.5rem] lg:w-80 transition-all duration-300 drop-shadow-[0_0_25px_rgba(79,137,212,1)] brightness-110 hover:scale-105 group-hover:drop-shadow-[0_0_35px_rgba(255,255,255,0.9)]">
              <Image
                src="/assets/slate360logoforwebsite.png"
                alt="Slate360 logo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          {/* DESKTOP NAV: right-aligned, high-contrast on metallic header */}
          <div className="ml-auto hidden items-center gap-4 md:gap-6 text-xs md:text-sm font-medium text-slate-100 lg:flex">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/20 px-6 py-2 text-xs font-bold uppercase tracking-widest text-white transition-all hover:text-[#4F89D4] hover:border-[#4F89D4] hover:bg-[#4F89D4]/30 landscape:px-4 landscape:py-1 lg:px-6 lg:py-2 font-orbitron shadow-[0_0_18px_rgba(79,137,212,0.65)] hover:shadow-[0_0_22px_rgba(79,137,212,0.7)]"
              >
                <span>Features</span>
                <span className="text-xs">▾</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-[#181717] border border-slate-700 shadow-xl py-2">
                  <div className="max-h-[60vh] overflow-y-auto space-y-0.5 px-2">
                    {NAV_LINKS.map((item) => (
                      <Link
                        key={item.id}
                        href={anchorFor(item.id)}
                        onClick={closeMenus}
                        className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-100 hover:bg-[#4F89D4]/20 hover:text-[#4F89D4] transition-colors duration-150 font-orbitron"
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
                      className="group relative text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 hover:text-[#4F89D4] font-orbitron drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
                >
                  {label}
                    <span className="absolute -bottom-2 left-0 h-[2px] w-full scale-x-0 bg-[#4F89D4] transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </Link>
              ))}
                <Link href="/login" className="ml-4 rounded-full border border-white/70 bg-white/15 px-6 py-2 text-xs font-bold uppercase tracking-widest text-white transition-all hover:text-[#4F89D4] hover:border-[#4F89D4] hover:bg-[#4F89D4]/30 font-orbitron">
                Login
              </Link>
            </nav>
          </div>

          {/* MOBILE HAMBURGER: also aligned to the right */}
          <div className="ml-auto flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#929292]/40 bg-[#363434] shadow-sm transition-all hover:border-[#B37031] hover:bg-[#4F89D4]/20"
              aria-label="Toggle navigation menu"
            >
              <span className="sr-only">Toggle menu</span>
              <div className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-5 rounded bg-slate-100 group-hover:bg-[#B37031] transition-colors" />
                <span className="block h-0.5 w-5 rounded bg-slate-100 group-hover:bg-[#B37031] transition-colors" />
                <span className="block h-0.5 w-5 rounded bg-slate-100 group-hover:bg-[#B37031] transition-colors" />
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
            className="relative z-10 flex flex-col border-b border-[#929292]/40 bg-[#181717] p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
                        <div className="flex items-center justify-between mb-6">
              {/* Added Logo to Menu Header */}
              <div className="relative h-14 w-48 -ml-2 drop-shadow-[0_0_14px_rgba(79,137,212,0.7)]">
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
                className="rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <span className="sr-only">Close menu</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

              <div className="space-y-6">
                <nav className="flex flex-col gap-4">
                  {/* Reordered Mobile Links: Login, Plans, About, Contact */}
                  <Link 
                    href="/login" 
                    onClick={() => setMobileOpen(false)}
                    className="inline-block w-fit rounded-full border border-[#4F89D4]/70 bg-[#4F89D4]/10 px-6 py-2 text-xs font-bold uppercase tracking-widest text-[#E5F0FF] hover:bg-[#B37031]/20 hover:text-[#FFF5EC] hover:border-[#B37031] font-orbitron"
                  >
                    Login
                  </Link>
                  
                  <div className="h-px w-full bg-slate-100 my-2" />

                  <Link
                    href="/subscribe"
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-bold text-slate-100 hover:text-[#4F89D4] font-orbitron"
                  >
                    Plans & Pricing
                  </Link>
                  <Link
                    href="/about"
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-bold text-slate-100 hover:text-[#4F89D4] font-orbitron"
                  >
                    About
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-bold text-slate-100 hover:text-[#4F89D4] font-orbitron"
                  >
                    Contact
                  </Link>

                  <div className="h-px w-full bg-slate-100 my-2" />
                  
                  {/* Features Grid - Condensed */}
                  <p className="text-xs font-bold uppercase tracking-widest text-[#929292] font-orbitron mb-2">Features</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {NAV_LINKS.map((item) => (
                      <Link
                        key={item.id}
                        href={anchorFor(item.id)}
                        onClick={setMobileOpen.bind(null, false)}
                        className="text-sm font-bold text-slate-100 hover:text-[#4F89D4] font-orbitron truncate"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </nav>
              </div>
          </div>
        </div>
      )}

      {/* SECONDARY NAV: Stacked on the right */}
      {pathname === "/" && (
        <div className="hidden xl:flex flex-col fixed top-1/2 -translate-y-1/2 right-4 items-end gap-1 z-40 backdrop-blur-md p-2 rounded-lg">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.id}
              href={anchorFor(item.id)}
              onClick={() => setMenuOpen(false)}
              className={`text-[10px] font-orbitron tracking-wider transition-colors duration-300 ${
                activeId === item.id
                  ? "text-black font-black"
                  : "text-slate-700 font-bold hover:text-blue-600"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}