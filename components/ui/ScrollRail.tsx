"use client";

import React from "react";

const TILE_IDS = [
  "slate360",
  "bim",
  "project-hub",
  "content",
  "tour",
  "geospatial",
  "vr",
  "analytics",
];

export default function ScrollRail() {
  const [activeId, setActiveId] = React.useState<string>("slate360");

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  };

  return (
    <nav
      aria-label="Homepage sections"
      className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-2 md:flex"
    >
      {TILE_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => handleClick(id)}
          className="group flex items-center gap-2"
        >
          <span
            className={`h-[2px] rounded-full transition-all duration-200 ${
              activeId === id
                ? "w-10 bg-slate-50"
                : "w-5 bg-slate-500 group-hover:w-8 group-hover:bg-slate-200"
            }`}
          />
          <span className="pointer-events-none text-xs font-medium uppercase tracking-[0.18em] text-slate-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {id.replace("-", " ")}
          </span>
        </button>
      ))}
    </nav>
  );
}
