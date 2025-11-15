"use client";

import { useEffect, useState } from "react";

const SECTIONS: { id: string; label: string }[] = [
  { id: "slate360", label: "Slate360" },
  { id: "bim", label: "Design Studio" },
  { id: "project-hub", label: "Project Hub" },
  { id: "content", label: "Content Studio" },
  { id: "tour", label: "360 Tour Builder" },
  { id: "geospatial", label: "Geospatial & Robotics" },
  { id: "vr", label: "Virtual Studio" },
  { id: "analytics", label: "Analytics & Reports" },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;

  // Height of the fixed navbar in pixels
  const headerHeight = 80; // keep this in sync with the actual nav height

  const rect = el.getBoundingClientRect();
  const sectionHeight = rect.height;
  const viewportHeight = window.innerHeight;

  // We want the *center* of the section to line up with the
  // center of the viewport, accounting for the fixed header.
  const sectionCenterInDocument = window.scrollY + rect.top + sectionHeight / 2;
  const viewportCenter = headerHeight + (viewportHeight - headerHeight) / 2;

  const targetScrollTop = sectionCenterInDocument - viewportCenter;

  window.scrollTo({
    top: Math.max(targetScrollTop, 0),
    behavior: "smooth",
  });
}

export default function ScrollRail() {
  const [activeId, setActiveId] = useState<string>("slate360");

  // SCROLL TRACKING: Uses IntersectionObserver with viewport as root
  useEffect(() => {
    const sections = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean
    ) as HTMLElement[];

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry with highest intersection ratio
        let bestId = activeId;
        let bestRatio = 0;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestId = entry.target.id;
          }
        });

        if (bestId && bestId !== activeId) {
          setActiveId(bestId);
        }
      },
      {
        root: null,
        threshold: 0.5,
      }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeId]);

  return (
    <div className="pointer-events-none fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 transform md:flex">
      <div className="rounded-full bg-slate-900/80 border border-slate-700/70 px-2 py-3 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col items-center gap-2">
          {SECTIONS.map((section) => {
            const isActive = section.id === activeId;
            return (
              <button
                key={section.id}
                type="button"
                className="group relative flex h-6 items-center pointer-events-auto"
                onClick={() => scrollToSection(section.id)}
              >
                <span
                  className={`h-0.5 w-6 rounded-full transition-all ${
                    isActive
                      ? "bg-blue-400 shadow-lg shadow-blue-400/50"
                      : "bg-slate-500 group-hover:bg-blue-300"
                  }`}
                />
                <span className="pointer-events-none absolute right-full mr-3 rounded-md bg-slate-900/95 border border-slate-700 px-2 py-1 text-xs text-slate-100 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                  {section.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
