"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { tileData } from "@/lib/tile-data";

export default function TileNavigation() {
  const [activeSection, setActiveSection] = useState("hero");
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const root = document.getElementById('snap-container') || undefined;
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5, root, rootMargin: '-50% 0px -50% 0px' }
    );
    const sections = document.querySelectorAll('section');
    sections.forEach((s) => observer.current?.observe(s));
    return () => sections.forEach((s) => observer.current?.unobserve(s));
  }, []);

  return (
    <nav className="fixed top-16 right-6 z-30 flex flex-col space-y-1">
      {tileData.map((tile) => (
        <Link
          key={tile.id}
          href={`#${tile.id}`}
          className="group relative"
          title={tile.title}
        >
          {/* Hamburger line */}
          <div 
            className={`w-6 h-0.5 transition-all duration-300 ${
              activeSection === tile.id
                ? "bg-[#4B9CD3] shadow-lg shadow-[#4B9CD3]/50"
                : "bg-[#B87333] hover:bg-[#4B9CD3] hover:shadow-md hover:shadow-[#4B9CD3]/30"
            }`}
          />
          
          {/* Tooltip on hover */}
          <div className="absolute left-8 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            {tile.title}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
          </div>
        </Link>
      ))}
    </nav>
  );
}