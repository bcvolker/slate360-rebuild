"use client";
import React, { useState, useEffect } from "react";

const TILE_IDS = [
  { id: "slate360", title: "Slate360" },
  { id: "bim-studio", title: "Design Studio" },
  { id: "project-hub", title: "Project Hub" },
  { id: "content-studio", title: "360 Content" },
  { id: "tour-builder", title: "360 Tour Builder" },
  { id: "geospatial", title: "Geospatial" },
  { id: "vr-lab", title: "Virtual Studio" },
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

    // Use `null` for the root to observe intersections relative to the viewport.
    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "-50% 0px -50% 0px", // Triggers when the tile is in the vertical center
      threshold: 0,
    });

    const tileElements = TILE_IDS.map(tile => document.getElementById(tile.id));
    
    tileElements.forEach((el) => {
      if (el) {
        observer.observe(el);
      }
    });

    // Cleanup function
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
    /* THIS IS THE FIX:
      1. Positions the nav in the vertical center (top-1/2 -translate-y-1/2).
    */
    <nav className="fixed right-6 top-1/2 -translate-y-1/2 hidden md:flex z-40">
      {/* THIS IS THE FIX:
        1. h-auto: Makes the pill's height fit the content.
        2. w-12: Makes the pill wider (like your green box).
        3. justify-center: Stacks the pills in the middle.
      */}
      <div className="flex h-auto w-12 flex-col gap-4 items-center justify-center rounded-full bg-slate-950/80 border border-slate-800/70 shadow-lg px-3 py-4">
        {TILE_IDS.map((tile) => {
          const isActive = activeTile === tile.id;
          
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => handleClick(tile.id)}
              title={tile.title} /* This adds the hover tooltip */
              className={`
                w-full h-[3px] transition-colors rounded-full /* This makes the line horizontal and thick */
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