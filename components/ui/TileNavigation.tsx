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
    <nav className="fixed top-20 right-6 z-30 flex flex-col space-y-1">
      {tileData.map((tile) => (
        <Link
          key={tile.id}
          href={`#${tile.id}`}
          className={`text-sm transition-colors ${
            activeSection === tile.id
              ? "text-[#B87333] font-semibold"
              : "text-gray-700 hover:text-[#B87333]"
          }`}
        >
          {tile.title}
        </Link>
      ))}
    </nav>
  );
}