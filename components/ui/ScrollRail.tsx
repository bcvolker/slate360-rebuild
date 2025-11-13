"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
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
    const handleScroll = () => {
      let closestId = activeId;
      let closestDistance = Infinity;
      const viewportCenter = window.innerHeight / 2;

      SECTIONS.forEach((section) => {
        const el = document.getElementById(section.id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const distance = Math.abs(sectionCenter - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestId = section.id;
        }
      });

      setActiveId(closestId);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeId]);

  return (
    <div className="pointer-events-none fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
      {SECTIONS.map((section) => {
        const isActive = section.id === activeId;
        return (
          <button
            key={section.id}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection(section.id);
            }}
            className={`group relative pointer-events-auto h-8 w-[3px] rounded-full transition-colors ${
              isActive
                ? "bg-sky-400"
                : "bg-slate-400/50 hover:bg-sky-300"
            }`}
            aria-label={section.label}
          >
            <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-slate-900/95 px-2 py-1 text-xs text-slate-50 shadow-lg group-hover:block">
              {section.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
