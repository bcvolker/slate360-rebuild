"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { tileData } from "@/lib/tile-data";

export default function TileNavigation() {
  const [activeSection, setActiveSection] = useState("hero");
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
    <nav className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 p-3 w-fit">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        {tileData.map((tile) => (
          <Link
            key={tile.id}
            href={`#${tile.id}`}
            className={`px-2 py-1 rounded transition-all whitespace-nowrap text-center ${
              activeSection === tile.id
                ? "bg-[#B87333] text-white font-semibold"
                : "text-slate-700 hover:bg-[#B87333]/10 hover:text-[#B87333]"
            }`}
          >
            {tile.title}
          </Link>
        ))}
      </div>
    </nav>
  );
}