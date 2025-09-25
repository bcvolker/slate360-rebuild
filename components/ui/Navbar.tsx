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
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#4B9CD3]/95 backdrop-blur-sm border-b border-slate-300 z-40 flex items-center justify-end md:justify-center px-6">
      {/* Desktop Links */}
      <nav className="hidden md:flex items-center gap-8">
        {tileData.map((tile) => (
          <Link
            key={tile.id}
            href={`#${tile.id}`}
            className={`text-sm font-medium transition-all ${
              activeSection === tile.id
                ? "text-[#B87333] scale-110"
                : "text-white hover:text-[#FFD7B5]"
            }`}
          >
            {tile.title}
          </Link>
        ))}
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
          <div className="absolute top-16 left-0 w-full bg-[#4B9CD3]/95 border-t border-slate-200 shadow-lg">
            <ul className="flex flex-col items-center py-4 space-y-3">
              {tileData.map((tile) => (
                <li key={tile.id}>
                  <Link href={`#${tile.id}`} onClick={() => setIsOpen(false)} className="text-lg text-white hover:text-[#FFD7B5]">
                    {tile.title}
                  </Link>
                </li>
              ))}
              <li><Link href="/about" className="text-lg text-white hover:text-[#FFD7B5]">About</Link></li>
              <li><Link href="/contact" className="text-lg text-white hover:text-[#FFD7B5]">Contact</Link></li>
              <li><Link href="/pricing" className="text-lg text-white hover:text-[#FFD7B5]">Pricing</Link></li>
              <li><Link href="/login" className="text-lg text-white hover:text-[#FFD7B5]">Login</Link></li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
