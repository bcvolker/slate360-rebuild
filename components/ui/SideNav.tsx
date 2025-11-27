"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { siteNavLinks } from "@/lib/config";

export default function SideNav() {
  const pathname = usePathname();
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    // Use viewport as root (root: null) since body is scrolling
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        root: null,
        threshold: 0.5,
      }
    );

    // Observe all sections that have an ID
    const sections = document.querySelectorAll("section[id]");
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
      observer.disconnect();
    };
  }, []);

  const anchorFor = (id: string) => {
    if (pathname === "/") {
      return `#${id}`;
    }
    return `/#${id}`;
  };

  return (
    <nav className="fixed top-1/2 right-6 z-[50] hidden -translate-y-1/2 flex-col gap-3 md:flex">
      {siteNavLinks.map((item) => {
        const isActive = activeId === item.id;
        return (
          <Link
            key={item.id}
            href={anchorFor(item.id)}
            className="group relative flex items-center justify-end py-1"
            aria-label={`Scroll to ${item.label}`}
          >
            {/* Tooltip - Left of the line */}
            <span
              className={`absolute right-6 mr-4 rounded bg-[color:var(--slate-blueprint)] px-2 py-1 text-xs font-bold uppercase tracking-widest text-[color:var(--slate-text-main)] shadow-lg backdrop-blur transition-all duration-300 ${
                isActive ? "opacity-0 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"
              } pointer-events-none whitespace-nowrap`}
            >
              {item.label}
            </span>

            {/* The Line (Ruler Mark) */}
            <div
              className={`w-1.5 rounded-full shadow-md transition-all duration-300 ${
                isActive
                  ? "h-10 bg-[#B87333] shadow-orange-900/20"
                  : "h-6 bg-white/50 group-hover:h-8 group-hover:bg-white"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
