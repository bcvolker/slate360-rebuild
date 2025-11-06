"use client";
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { tileData } from '@/lib/tile-data';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!isMenuOpen) return;
      const target = e.target as Node;
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isMenuOpen]);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    e.preventDefault();
    const anchorTarget = document.querySelector(href);
    if (anchorTarget) anchorTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setIsMenuOpen(false);
    const targetId = href.replace(/.*#/, '');

    if (pathname !== '/') {
      router.push(`/#${targetId}`);
      requestAnimationFrame(() => {
        const el = document.getElementById(targetId);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      });
      return;
    }

    const scrollContainer = document.getElementById('scroll-container');
    const scrollTarget = document.getElementById(targetId);
    if (!scrollTarget) return;

    const headerHeight = 80;
    if (isDesktop && scrollContainer) {
      const previousSnap = scrollContainer.style.scrollSnapType;
      scrollContainer.style.scrollSnapType = 'none';
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      let attempts = 0;
      const maxAttempts = 12;
      const check = () => {
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = scrollTarget.getBoundingClientRect();
        if (Math.abs(targetRect.top - containerRect.top - headerHeight) < 3 || attempts >= maxAttempts) {
          scrollContainer.style.scrollSnapType = previousSnap || 'y proximity';
          return;
        }
        attempts++;
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    } else {
      const y = scrollTarget.getBoundingClientRect().top + window.pageYOffset - headerHeight;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    try { window.history.replaceState(null, '', `${window.location.pathname}#${targetId}`); } catch (e) { /* ignore */ }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-20 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-2 sm:px-4">
        <Link href="/" aria-label="Go to Homepage" className="flex items-center">
          <Image src="/slate360logoforwebsite.png" alt="Slate360 Logo" width={180} height={50} priority className="h-16 w-auto drop-shadow-md" />
        </Link>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6">
            <div className="relative" ref={desktopMenuRef}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsMenuOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
                className="text-sm font-medium text-slate-300 hover:text-white inline-flex items-center gap-2 cursor-pointer"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsMenuOpen((v) => !v); }}
              >
                Menu
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd"/></svg>
              </div>
              {isMenuOpen && (
                <div className="absolute left-0 mt-2 w-56 rounded-md bg-slate-900/95 border border-slate-700/70 shadow-lg p-2">
                  {tileData.map((tile) => (
                    <a key={tile.id} href={`/#${tile.id}`} onClick={(e) => handleScroll(e, `/#${tile.id}`)} className="block px-3 py-2 text-sm text-slate-200 hover:text-white hover:bg-slate-800 rounded">
                      {tile.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <Link href="/about" className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200">About</Link>
            <Link href="/contact" className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200">Contact</Link>
            <Link href="/subscribe" className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200">Subscribe</Link>
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200">Login</Link>
          </nav>
          <button onClick={() => setIsMenuOpen((v) => !v)} className="md:hidden text-slate-300 focus:outline-none">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <>
          <div className="fixed inset-0 top-20 z-40 md:hidden" onClick={() => setIsMenuOpen(false)} />
          <div className="absolute top-20 left-0 w-full bg-slate-900 md:hidden border-t border-slate-700/60 z-50">
            <nav className="flex flex-col items-stretch space-y-1 py-3 px-3">
              {tileData.map((tile) => (
                <a key={tile.id} href={`/#${tile.id}`} onClick={(e) => handleScroll(e, `/#${tile.id}`)} className="px-3 py-2 text-slate-200 rounded hover:bg-slate-800">
                  {tile.title}
                </a>
              ))}
              <div className="border-t border-slate-700/60 my-2" />
              <Link href="/about" className="px-3 py-2 text-slate-200 rounded hover:bg-slate-800" onClick={() => setIsMenuOpen(false)}>
                About
              </Link>
              <Link href="/contact" className="px-3 py-2 text-slate-200 rounded hover:bg-slate-800" onClick={() => setIsMenuOpen(false)}>
                Contact
              </Link>
              <Link href="/subscribe" className="px-3 py-2 text-slate-200 rounded hover:bg-slate-800" onClick={() => setIsMenuOpen(false)}>
                Subscribe
              </Link>
              <Link href="/login" className="px-3 py-2 text-slate-200 rounded hover:bg-slate-800" onClick={() => setIsMenuOpen(false)}>
                Login
              </Link>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
