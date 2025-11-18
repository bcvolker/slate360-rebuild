"use client";
import React from "react";

const TILE_IDS = [
  "slate360",      // Hero / main
  "bim-studio",
  "project-hub",
  "content-studio",
  "tour-builder",
  "geospatial",
  "vr-lab",
  "analytics",     // Last tile (make sure this matches your tiles array)
];

export default function ScrollRail() {
  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="fixed right-6 top-1/2 -translate-y-1/2 hidden md:flex z-40">
      <div className="flex h-[80vh] w-8 flex-col gap-4 items-center rounded-full bg-slate-950/80 border border-slate-800/70 shadow-lg px-3 py-4">
        {TILE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => handleClick(id)}
            className="w-full h-[2px] bg-slate-500/70 hover:bg-slate-200 transition-colors rounded-full"
            aria-label={`Jump to ${id}`}
          />
        ))}
      </div>
    </nav>
  );
}