'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { tileData } from '@/lib/tile-data';

export default function Navbar() {
  const [active, setActive] = useState('hero');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)?.target.id;
        if (visible) setActive(visible);
      },
      { threshold: 0.5 }
    );
    const sections = document.querySelectorAll('section');
    sections.forEach((s) => observer.current?.observe(s));
    return () => sections.forEach((s) => observer.current?.unobserve(s));
  }, []);

  return (
    <nav className="flex w-full items-center justify-start">
      {/* Desktop */}
      <div className="hidden md:flex gap-x-5 text-sm">
        {tileData.map((tile) => (
          <Link
            key={tile.id}
            href={`#${tile.id}`}
            className={`text-sm font-medium transition-all duration-300 ${
              active === tile.id ? 'text-[#4B9CD3] scale-110' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tile.title}
          </Link>
        ))}
      </div>
      {/* Mobile */}
      <div className="md:hidden ml-auto">
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
        {isMenuOpen && (
          <div className="absolute top-[48px] left-0 w-full bg-slate-900 text-white">
            {tileData.map((tile) => (
              <Link key={tile.id} href={`#${tile.id}`} onClick={() => setIsMenuOpen(false)}>
                <div className={`p-4 ${active === tile.id ? 'text-[#4B9CD3]' : ''}`}>{tile.title}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
