"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type NavItem = { href: string; label: string };

const tileLinks: NavItem[] = [
  { href: "#slate360", label: "Slate360" },
  { href: "#new-tile", label: "New Tile" },
  { href: "#bim-studio", label: "BIM Studio" },
  { href: "#content-studio", label: "Content Studio" },
  { href: "#geospatial", label: "Geospatial & Robotics" },
  { href: "#tour-builder", label: "360 Tour Builder" },
  { href: "#xr", label: "AR/VR Studio" },
  { href: "#reports", label: "Analytics & Reports" },
];

const primaryLinks: NavItem[] = [
  { href: "/login", label: "Login" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function scrollToTile(hash: string) {
  const id = hash.replace("#", "");
  const target = document.getElementById(id);
  const scroller = document.getElementById("snap-container");
  if (!target || !scroller) return;
  const offsetTop = target.offsetTop - scroller.offsetTop;
  scroller.scrollTo({ top: offsetTop, behavior: "smooth" });
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
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

  const TileLink = ({ item, close }: { item: NavItem; close?: () => void }) => (
    <a
      href={item.href}
      className="rounded-lg px-3 py-2 text-gray-200 hover:bg-white/5"
      onClick={(e) => {
        e.preventDefault();
        scrollToTile(item.href);
        close?.();
      }}
    >
      {item.label}
    </a>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-20">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 to-black/0" />
      <div className="h-20 backdrop-blur supports-[backdrop-filter]:bg-slate-900/70 bg-slate-900/85 border-b border-white/10">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/slate360logoforwebsite.png"
              alt="Slate360"
              width={220}
              height={44}
              className="h-10 w-auto"
              priority
            />
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
                  className="absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur"
                >
                  <nav className="flex flex-col py-2">
                    {tileLinks.map((n) => (
                      <TileLink key={n.href} item={n} close={() => setMenuOpen(false)} />
                    ))}
                  </nav>
                </div>
              )}
            </div>
            <nav className="flex items-center gap-5">
              {primaryLinks.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
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
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div id="mobile-nav" className="md:hidden border-t border-white/10 bg-slate-900/95 backdrop-blur">
            <nav className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              <div className="grid gap-2">
                <div className="text-xs uppercase tracking-wide text-gray-400">Tiles</div>
                {tileLinks.map((n) => (
                  <TileLink key={n.href} item={n} close={() => setMobileOpen(false)} />
                ))}
              </div>
              <hr className="my-3 border-white/10" />
              <div className="grid gap-2">
                {primaryLinks.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="rounded-lg px-3 py-2 text-gray-200 hover:bg-white/5"
                    onClick={() => setMobileOpen(false)}
                  >
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
