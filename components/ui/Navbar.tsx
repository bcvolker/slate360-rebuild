"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { tileData } from "@/lib/tile-data";

export default function Navbar() {
  const [activeSection, setActiveSection] = useState("hero");
  const [isOpen, setIsOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)?.target.id;
        if (visible) setActiveSection(visible);
      },
      { threshold: 0.5 }
    );
    const sections = document.querySelectorAll("section");
    sections.forEach((s) => observer.current?.observe(s));
    return () => sections.forEach((s) => observer.current?.unobserve(s));
  }, []);

  // Close features dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (featuresOpen && !(event.target as Element).closest('.relative')) {
        setFeaturesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [featuresOpen]);

  return (
    <>
      {/* Top Header - Static Links Only */}
      <header className="fixed top-0 left-0 right-0 h-12 bg-transparent z-40 flex items-center justify-end px-6">
        <nav className="hidden md:flex items-center gap-6">
          {/* Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setFeaturesOpen(!featuresOpen)}
              className="flex items-center gap-1 text-base font-semibold text-[#B87333] hover:text-[#B87333]/70 px-2 py-1 rounded transition-colors"
            >
              Menu
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {featuresOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                {tileData.map((tile) => (
                  <Link
                    key={tile.id}
                    href={`#${tile.id}`}
                    onClick={() => setFeaturesOpen(false)}
                    className={`block px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${
                      activeSection === tile.id
                        ? "text-[#B87333] font-semibold bg-slate-50"
                        : "text-slate-700 hover:text-[#B87333]"
                    }`}
                  >
                    {tile.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          <Link href="/about" className="text-base font-semibold text-[#B87333] hover:text-[#B87333]/70 px-2 py-1 rounded transition-colors">About</Link>
          <Link href="/contact" className="text-base font-semibold text-[#B87333] hover:text-[#B87333]/70 px-2 py-1 rounded transition-colors">Contact</Link>
          <Link href="/subscribe" className="text-base font-semibold text-[#B87333] hover:text-[#B87333]/70 px-2 py-1 rounded transition-colors">Subscribe</Link>
          <Link href="/login" className="text-base font-semibold text-[#B87333] hover:text-[#B87333]/70 px-2 py-1 rounded transition-colors">Login</Link>
        </nav>

        {/* Mobile Hamburger */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-[#B87333] focus:outline-none p-2 rounded transition-colors hover:bg-[#B87333]/10"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
          {isOpen && (
            <div className="absolute top-12 left-0 w-full bg-white/95 backdrop-blur-sm shadow-lg z-[60]">
              <div className="p-4">
                {/* Tile Navigation for Mobile */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#B87333]/80 mb-3 uppercase tracking-wide">Menu</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {tileData.map((tile) => (
                      <Link 
                        key={tile.id} 
                        href={`#${tile.id}`} 
                        onClick={() => setIsOpen(false)} 
                        className={`text-sm text-[#B87333] hover:text-[#B87333]/70 p-2 rounded transition-colors ${
                          activeSection === tile.id ? 'bg-[#B87333]/20 font-semibold' : ''
                        }`}
                      >
                        {tile.title}
                      </Link>
                    ))}
                  </div>
                </div>
                
                {/* Main Navigation for Mobile */}
                <div>
                  <h3 className="text-sm font-semibold text-[#B87333]/80 mb-3 uppercase tracking-wide">Company</h3>
                  <ul className="grid grid-cols-2 gap-2">
                    <li><Link href="/about" onClick={() => setIsOpen(false)} className="text-sm text-[#B87333] hover:text-[#B87333]/70 block p-2 rounded transition-colors">About</Link></li>
                    <li><Link href="/contact" onClick={() => setIsOpen(false)} className="text-sm text-[#B87333] hover:text-[#B87333]/70 block p-2 rounded transition-colors">Contact</Link></li>
                    <li><Link href="/subscribe" onClick={() => setIsOpen(false)} className="text-sm text-[#B87333] hover:text-[#B87333]/70 block p-2 rounded transition-colors">Subscribe</Link></li>
                    <li><Link href="/login" onClick={() => setIsOpen(false)} className="text-sm text-[#B87333] hover:text-[#B87333]/70 block p-2 rounded transition-colors">Login</Link></li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>


    </>
  );
}
