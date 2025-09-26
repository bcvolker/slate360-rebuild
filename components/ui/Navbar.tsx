"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { tileData } from "@/lib/tile-data";

export default function Navbar() {
  const [activeSection, setActiveSection] = useState("hero");
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <>
      {/* Top Header - Static Links Only */}
      <header className="fixed top-0 left-0 right-0 h-12 bg-[#4B9CD3]/95 backdrop-blur-sm border-b border-slate-300 z-40 flex items-center justify-end px-6">
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/about" className="text-sm text-white hover:text-[#FFD7B5]">About</Link>
          <Link href="/contact" className="text-sm text-white hover:text-[#FFD7B5]">Contact</Link>
          <Link href="/pricing" className="text-sm text-white hover:text-[#FFD7B5]">Pricing</Link>
          <Link href="/login" className="text-sm text-white hover:text-[#FFD7B5]">Login</Link>
        </nav>

        {/* Mobile Hamburger */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-white focus:outline-none"
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
            <div className="absolute top-12 left-0 w-full bg-[#4B9CD3]/95 border-t border-slate-200 shadow-lg z-50">
              <div className="p-4">
                {/* Tile Navigation for Mobile */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">Features</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {tileData.map((tile) => (
                      <Link 
                        key={tile.id} 
                        href={`#${tile.id}`} 
                        onClick={() => setIsOpen(false)} 
                        className={`text-sm text-white hover:text-[#FFD7B5] p-2 rounded transition-colors ${
                          activeSection === tile.id ? 'bg-white/20 font-semibold' : ''
                        }`}
                      >
                        {tile.title}
                      </Link>
                    ))}
                  </div>
                </div>
                
                {/* Main Navigation for Mobile */}
                <div>
                  <h3 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">Company</h3>
                  <ul className="grid grid-cols-2 gap-2">
                    <li><Link href="/about" onClick={() => setIsOpen(false)} className="text-sm text-white hover:text-[#FFD7B5] block p-2 rounded transition-colors">About</Link></li>
                    <li><Link href="/contact" onClick={() => setIsOpen(false)} className="text-sm text-white hover:text-[#FFD7B5] block p-2 rounded transition-colors">Contact</Link></li>
                    <li><Link href="/pricing" onClick={() => setIsOpen(false)} className="text-sm text-white hover:text-[#FFD7B5] block p-2 rounded transition-colors">Pricing</Link></li>
                    <li><Link href="/login" onClick={() => setIsOpen(false)} className="text-sm text-white hover:text-[#FFD7B5] block p-2 rounded transition-colors">Login</Link></li>
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
