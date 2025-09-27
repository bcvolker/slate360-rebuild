
'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { tileData } from '@/lib/tile-data';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsMenuOpen(false);
    const targetId = href.replace(/.*#/, "");
    const elem = document.getElementById(targetId);
    if (elem) {
      const headerOffset = 64; // Corresponds to h-16 in Tailwind
      const elementPosition = elem.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-3 sm:px-4">
        {/* Left: Desktop nav with Menu placed before About */}
        <nav className="hidden md:flex items-center gap-6">
          {/* Menu dropdown for tile links (desktop) placed to the left of About */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              className="text-sm font-medium text-slate-300 hover:text-white inline-flex items-center gap-2"
            >
              Menu
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd"/></svg>
            </button>
            {isMenuOpen && (
              <div className="absolute left-0 mt-2 w-56 rounded-md bg-slate-900/95 border border-slate-700/70 shadow-lg p-2">
                {tileData.map((tile) => (
                  <a
                    key={tile.id}
                    href={`#${tile.id}`}
                    onClick={(e) => handleScroll(e, `#${tile.id}`)}
                    className="block px-3 py-2 text-sm text-slate-200 hover:text-white hover:bg-slate-800 rounded"
                  >
                    {tile.title}
                  </a>
                ))}
              </div>
            )}
          </div>
          <Link href="/about" className="text-sm font-medium text-slate-300 hover:text-white">About</Link>
          <Link href="/contact" className="text-sm font-medium text-slate-300 hover:text-white">Contact</Link>
          <Link href="/subscribe" className="text-sm font-medium text-slate-300 hover:text-white">Subscribe</Link>
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white">Login</Link>
        </nav>

        {/* Right: Logo larger and to the right */}
        <Link href="/" aria-label="Go to Homepage" className="flex items-center">
          <Image
            src="/assets/slate360logoforwebsite.v2.png"
            alt="Slate360 Logo"
            width={300}
            height={90}
            priority
            unoptimized
            className="h-12 sm:h-14 w-auto object-contain"
          />
        </Link>

        {/* Mobile Hamburger */}
        <button onClick={() => setIsMenuOpen((v) => !v)} className="md:hidden text-slate-300 focus:outline-none">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
        </button>
      </div>

      {/* Mobile Menu Overlay: shows tile links when hamburger open */}
      {isMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-slate-900 md:hidden border-t border-slate-700/60">
          <nav className="flex flex-col items-stretch space-y-1 py-3 px-3">
            {tileData.map((tile) => (
              <a key={tile.id} href={`#${tile.id}`} onClick={(e) => handleScroll(e, `#${tile.id}`)} className="px-3 py-2 text-slate-200 rounded hover:bg-slate-800">
                {tile.title}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
