"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { siteNavLinks } from "@/lib/config";

export default function SideNav() {
  const pathname = usePathname();
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        // Slightly more forgiving so sections become active earlier
        threshold: 0.35,
        rootMargin: "-80px 0px -40% 0px", // account for fixed header height
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

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      if (pathname !== "/") {
        // Let Next.js handle cross-page navigation
        return;
      }

      event.preventDefault();

      const el = document.getElementById(id);
      if (el) {
        // Use nearest so browser respects scroll-margin-top on the section
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        // Fallback to hash if element is not yet in the DOM for some reason
        window.location.hash = `#${id}`;
      }
    },
    [pathname]
  );

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
            onClick={(event) => handleClick(event, item.id)}
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
              className={`w-1 rounded-full shadow-md transition-all duration-300 ${
                isActive
                  ? "h-10 bg-[#B37031]" // Active: Copper, taller
                  : "h-6 bg-white/50 group-hover:h-8 group-hover:bg-white" // Inactive: White/50, grows on hover
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
