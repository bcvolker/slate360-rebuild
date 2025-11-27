"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { siteNavLinks } from "@/lib/config";

export default function SideNav() {
  const pathname = usePathname();
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    // Only observe sections that correspond to our siteNavLinks IDs
    const selector = siteNavLinks
      .map((item) => `section#${item.id}`)
      .join(",");

    if (!selector) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the most visible section rather than first/last intersecting,
        // so behavior is stable both scrolling down and up.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        root: null,
        threshold: [0.25, 0.5, 0.75],
      }
    );

    const sections = document.querySelectorAll(selector);
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
            className="group relative flex items-center justify-end"
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
              className={`w-3 rounded-full shadow-md transition-all duration-300 ${
                isActive
                  ? "h-10 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" // Active: Blue, taller, glow
                  : "h-6 bg-slate-300/60 group-hover:h-8 group-hover:bg-blue-600" // Inactive: Light grey -> Blue on hover
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
