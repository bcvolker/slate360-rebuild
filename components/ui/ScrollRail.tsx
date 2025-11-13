"use client";

import { useEffect, useState } from "react";

const SECTIONS: { id: string; label: string }[] = [
  { id: "slate360", label: "Slate360" },
  { id: "project-hub", label: "Project Hub" },
  { id: "bim", label: "BIM Studio" },
  { id: "content", label: "Content Studio" },
  { id: "geospatial", label: "Geospatial & Robotics" },
  { id: "tour", label: "360 Tour Builder" },
  { id: "vr", label: "AR/VR Studio" },
  { id: "analytics", label: "Analytics & Reports" },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function ScrollRail() {
  const [activeId, setActiveId] = useState<string>("slate360");

  useEffect(() => {
    const sections = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean
    ) as HTMLElement[];

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry closest to viewport center
        let bestId = activeId;
        let bestScore = -Infinity;

        entries.forEach((entry) => {
          const rect = entry.target.getBoundingClientRect();
          const viewportCenter = window.innerHeight / 2;
          const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
          const score = entry.isIntersecting ? -distance : -Infinity;
          if (score > bestScore) {
            bestScore = score;
            bestId = entry.target.id;
          }
        });

        if (bestId && bestId !== activeId) {
          setActiveId(bestId);
        }
      },
      {
        root: null,
        threshold: [0.25, 0.6],
      }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeId]);

  return (
    <div className="pointer-events-none fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 transform md:flex">
      <div className="rounded-full bg-slate-950/85 border border-slate-700/70 px-3 py-4 shadow-xl">
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
                  className={`h-0.5 w-7 rounded-full transition-colors ${
                    isActive
                      ? "bg-sky-400"
                      : "bg-slate-300/80 group-hover:bg-sky-300"
                  }`}
                />
                <span className="pointer-events-none absolute right-full mr-3 rounded-md bg-slate-950/90 px-2 py-1 text-xs text-slate-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
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
