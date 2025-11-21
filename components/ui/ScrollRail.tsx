"use client";

import { useEffect, useState } from "react";

type Section = {
  id: string;
  label: string;
};

const SECTIONS: Section[] = [
  { id: "slate360", label: "Slate360" },
  { id: "design-studio", label: "Design Studio" },
  { id: "project-hub", label: "Project Hub" },
  { id: "content-studio", label: "Content Studio" },
  { id: "tour-builder", label: "360 Tour Builder" },
  { id: "geospatial", label: "Geospatial & Robotics" },
  { id: "virtual-studio", label: "Virtual Studio" },
  { id: "analytics", label: "Analytics & Reports" },
];

function scrollToSection(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function ScrollRail() {
  const [activeId, setActiveId] = useState<string>("slate360");

  // Track which tile is in view
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.id) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { threshold: 0.55 }
    );

    SECTIONS.forEach(section => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Desktop only
  return (
    <div className="hidden lg:flex fixed right-12 top-1/2 -translate-y-1/2 z-40">
      <nav className="flex flex-col items-center justify-center gap-3 rounded-full border border-slate360-blue/40 bg-slate360-charcoal/90 px-4 py-5 shadow-blueGlow backdrop-blur-md">
        {SECTIONS.map(section => {
          const isActive = section.id === activeId;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className="group relative flex items-center py-1 focus:outline-none"
              aria-label={section.label}
            >
              {/* Thicker horizontal bar */}
              <span
                className={[
                  "h-[4px] w-8 rounded-full transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-gradient-to-r from-slate360-blue via-slate360-copper to-slate360-blue shadow-blueGlow"
                    : "bg-slate-500/70 group-hover:bg-slate360-blue/90",
                ].join(" ")}
              />

              {/* Slate360 tooltip bubble */}
              <span className="pointer-events-none absolute right-full mr-3 hidden rounded-xl border border-slate360-blue/40 bg-slate360-charcoalSoft/95 px-3 py-1 text-xs font-medium text-slate-100 shadow-lg group-hover:flex">
                {section.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}