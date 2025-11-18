"use client";
import React, { useState, useEffect } from "react";

const TILE_IDS = [
  { id: "slate360", title: "Home" },
  { id: "bim-studio", title: "BIM Studio" },
  { id: "project-hub", title: "Project Hub" },
  { id: "content-studio", title: "Content Studio" },
  { id: "tour-builder", title: "360 Tour Builder" },
  { id: "geospatial", title: "Geospatial" },
  { id: "vr-lab", title: "VR Lab" },
  { id: "analytics", title: "Analytics" }
];

export default function ScrollRail() {
  const [activeTile, setActiveTile] = useState("slate360");

  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveTile(entry.target.id);
        }
      });
    };

    // JAVASCRIPT BUG FIX: We set root to `null` to use the browser viewport
    // This is more reliable than querySelector.
    const observer = new IntersectionObserver(observerCallback, {
      root: null, // This was the bug. It now watches the viewport.
      rootMargin: "-50% 0px -50% 0px", // Triggers when the tile is in the middle
      threshold: 0,
    });

    const tileElements = TILE_IDS.map(tile => document.getElementById(tile.id));
    tileElements.forEach((el) => {
      if (el) {
        observer.observe(el);
      }
    });

    return () => {
      tileElements.forEach((el) => {
        if (el) {
          observer.unobserve(el);
        }
      });
    };
  }, []);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    /* FIX 1: Reverted to top-1/2 -translate-y-1/2 to vertically center it */
    <nav className="fixed right-6 top-1/2 -translate-y-1/2 hidden md:flex z-40">
      {/* FIX 2: Changed w-8 to w-12 so the pill is wider */}
      <div className="flex h-[80vh] w-12 flex-col gap-4 items-center rounded-full bg-slate-950/80 border border-slate-800/70 shadow-lg px-3 py-4">
        {TILE_IDS.map((tile) => {
          const isActive = activeTile === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => handleClick(tile.id)}
              title={tile.title} /* This adds the hover tooltip */
              className={`
                w-full h-[3px] transition-colors rounded-full /* FIX 3: Kept thick horizontal line */
                ${isActive ? "bg-slate-200" : "bg-slate-500/70 hover:bg-slate-200"}
              `}
              aria-label={`Jump to ${tile.title}`}
            />
          );
        })}
      </div>
    </nav>
  );
}