
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
      <div className="relative mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* LOGO: Absolutely positioned to decouple from header height */}
        <Link href="/" aria-label="Go to Homepage" className="absolute top-1/2 left-4 sm:left-6 -translate-y-1/2">
          <div className="relative h-[56px] w-[220px]">
            <Image src="/assets/slate360logoforwebsite.v2.png" alt="Slate360 Logo" fill priority unoptimized className="object-contain" />
          </div>
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center space-x-8 w-full justify-end">
          {tileData.map((tile) => ( <a key={tile.id} href={`#${tile.id}`} onClick={(e) => handleScroll(e, `#${tile.id}`)} className="text-sm font-medium text-slate-300 hover:text-brand-blue transition-colors">{tile.title}</a> ))}
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden ml-auto">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-300 focus:outline-none"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg></button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-slate-900 md:hidden">
          <nav className="flex flex-col items-center space-y-4 py-4">
            {/* Mobile menu uses the same robust scroll handler */}
            {tileData.map((tile) => ( <a key={tile.id} href={`#${tile.id}`} onClick={(e) => handleScroll(e, `#${tile.id}`)} className="text-lg font-medium text-slate-300">{tile.title}</a> ))}
          </nav>
        </div>
      )}
    </header>
  );
}
