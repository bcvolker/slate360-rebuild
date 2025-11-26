"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { siteNavLinks } from "@/lib/config";

export default function SideNav() {
  const pathname = usePathname();
  const [activeId, setActiveId] = useState<string>("");
  // Track which sections are currently visible using a Ref to avoid state issues
  const visibleSections = useRef(new Set<string>());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections.current.add(entry.target.id);
          } else {
            visibleSections.current.delete(entry.target.id);
          }
        });

        // Determine active section: The last one in the list that is visible
        let newActiveId = "";
        for (let i = siteNavLinks.length - 1; i >= 0; i--) {
          const id = siteNavLinks[i].id;
          if (visibleSections.current.has(id)) {
            newActiveId = id;
            break;
          }
        }
        setActiveId(newActiveId);
      },
      {
        threshold: 0.1,
        rootMargin: "-80px 0px -40% 0px",
      }
    );

    // Small timeout to ensure DOM elements are present
    const timer = setTimeout(() => {
      siteNavLinks.forEach((section) => {
        const el = document.getElementById(section.id);
        if (el) observer.observe(el);
      });
    }, 100);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const anchorFor = (id: string) => {
    if (pathname === "/") {
      return `#${id}`;
    }
    return `/#${id}`;
  };

  return (
    <nav className="fixed top-1/2 right-6 z-[50] hidden -translate-y-1/2 flex-col gap-3 lg:flex">
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
              className={`absolute right-6 mr-4 rounded bg-slate-900/90 px-2 py-1 text-xs font-bold uppercase tracking-widest text-white shadow-lg backdrop-blur transition-all duration-300 ${
                isActive ? "opacity-0 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"
              } pointer-events-none whitespace-nowrap`}
            >
              {item.label}
            </span>

            {/* The Line (Ruler Mark) */}
            <div
              className={`w-3 rounded-full shadow-md transition-all duration-300 ${
                isActive
                  ? "h-10 bg-[#B37031]" // Active: Copper, taller
                  : "h-6 bg-[#020617] group-hover:h-8 group-hover:bg-[#020617]" // Inactive: Charcoal, grows on hover
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
