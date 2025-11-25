"use client";

import Link from "next/link";
import { useMemo, useState, useRef } from "react";
import type { CSSProperties } from "react";
import { Tile } from "@/lib/types";

interface UnifiedSectionProps {
  tile: Tile;
  index: number;
}

export default function UnifiedSection({ tile, index }: UnifiedSectionProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const accent = tile.theme?.accent ?? "#4F89D4";
  const layoutAlign = tile.layout?.align ?? (index % 2 === 0 ? "right" : "left");
  const snapEnabled = tile.layout?.snap ?? true;

  const sectionStyle = useMemo(
    () =>
      ({
        "--section-accent": accent,
      } as CSSProperties),
    [accent]
  );

  const viewerTitle = tile.viewer?.title ?? "Viewer";
  const viewerSubtitle = tile.viewer?.subtitle ?? "Interactive content arrives shortly.";

  const isFirstTile = index === 0;
  const isAlternate = index % 2 === 0;

  const textColumnOrder = layoutAlign === "left" ? "lg:order-2" : "lg:order-1";
  const viewerColumnOrder = layoutAlign === "left" ? "lg:order-1" : "lg:order-2";

  // FIX 1: BUTTONS SIDE-BY-SIDE
  // Removed the force 'flex-col' on mobile. Now uses flex-row everywhere.
  const renderCtas = (isMobile = false) => {
    if (!tile.cta && !tile.secondaryCta) return null;
    return (
      <div
        className={`flex w-full ${
          isMobile ? "flex-row gap-3 pt-2" : "flex-col sm:flex-row gap-3"
        }`}
      >
        {tile.cta && (
          <Link
            href={tile.cta.href}
            className={`inline-flex items-center justify-center rounded-md border border-slate-900 bg-white/90 px-4 py-3 text-sm font-bold uppercase tracking-widest text-slate-900 shadow-sm transition hover:bg-white hover:shadow-md hover:border-slate-900 font-orbitron ${
              isMobile
                ? "flex-1 text-[10px] leading-tight px-1 text-center whitespace-normal h-12"
                : ""
            }`}
          >
            {tile.cta.label}
          </Link>
        )}
        {tile.secondaryCta && (
          <Link
            href={tile.secondaryCta.href}
            className={`inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-lg transition hover:opacity-90 hover:shadow-xl font-orbitron ${
              isMobile
                ? "flex-1 text-[10px] leading-tight px-1 text-center whitespace-normal h-12"
                : ""
            }`}
          >
            {tile.secondaryCta.label}
          </Link>
        )}
      </div>
    );
  };

  return (
    <section
      ref={sectionRef}
      id={tile.id}
      data-snap="tile"
      className={`relative w-full flex flex-col min-h-[100dvh] pt-20 pb-4 lg:pt-24 lg:pb-10 ${
        snapEnabled ? "lg:snap-start" : ""
      } ${isFirstTile || isAlternate ? "bg-blueprint-paper" : "bg-concrete"}`}
      style={sectionStyle}
    >
      <div
        className="absolute inset-0 w-full -z-10 opacity-[0.08] bg-[radial-gradient(circle_at_top,var(--section-accent)_0%,transparent_55%)]"
        aria-hidden
      />
      
      {/* INNER CONTAINER */}
      {/* FIX 2: SPACING - Removed inner pt-6, changed justify-center to justify-start for mobile compactness */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-12 flex flex-col flex-1 h-full justify-start lg:justify-center gap-0 md:gap-8">
        
        {/* --- MOBILE/TABLET LAYOUT (REWRITTEN) --- */}
        <div className="lg:hidden w-full h-full flex flex-col landscape:grid landscape:grid-cols-2 landscape:gap-4 landscape:items-center">
  
          {/* TOP HALF: Text Content 
              - pt-28: Creates a massive safe zone so text clears the header.
              - justify-start: Stacks items tightly at the top (no huge gaps).
          */}
          <div className="flex flex-col justify-start pt-28 pb-4 px-1 landscape:pt-20 landscape:h-full landscape:justify-center">
            
            {/* 1. EYEBROW */}
            {tile.eyebrow && (
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] font-orbitron text-[color:var(--slate360-blue)] opacity-90 mb-2">
                {tile.eyebrow}
              </p>
            )}

            {/* 2. TITLE (Largest Text) */}
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-orbitron tracking-tight leading-none mb-2 drop-shadow-sm">
              {tile.title}
            </h2>

            {/* 3. SUBTITLE (Smaller) */}
            <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed mb-4">
              {tile.subtitle}
            </p>

            {/* 4. MAIN BULLETS */}
            {tile.bullets?.length > 0 && (
              <ul className="space-y-2 mb-4">
                {tile.bullets.slice(0, 3).map((bullet) => (
                  <li
                    key={bullet.label}
                    className="flex items-start gap-2.5 rounded-lg bg-white/60 backdrop-blur-sm border border-slate-200/50 px-3 py-1.5 shadow-sm"
                  >
                    <span className="mt-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--slate360-blue)] shrink-0" />
                    <p className="font-bold text-slate-900 font-orbitron text-xs">
                      {bullet.label}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* BOTTOM HALF: Visuals & Actions 
              - pb-24: Ensures buttons aren't cut off by mobile UI on scroll 
          */}
          <div className="flex flex-col gap-4 pb-24 landscape:pb-4 landscape:justify-center">
            
            {/* 5. HORIZONTAL SCROLLER (If more bullets exist) */}
            {tile.bullets && tile.bullets.length > 3 && (
              <div className="w-full overflow-x-auto py-1 hide-scrollbar landscape:hidden">
                <ul className="flex gap-3 w-max px-1">
                  {tile.bullets.slice(3).map((bullet) => (
                    <li
                      key={bullet.label}
                      className="w-[160px] flex flex-col gap-1 p-2 rounded-lg border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-sm"
                    >
                      <p className="font-bold text-slate-900 font-orbitron text-[10px] truncate">
                        {bullet.label}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 6. VIEWER */}
            <div className="w-full aspect-video rounded-xl overflow-hidden relative border border-slate-900/10 bg-slate-900/90 shadow-lg">
              <button
                type="button"
                onClick={() => setViewerOpen(true)}
                className="absolute inset-0 w-full h-full flex flex-col items-center justify-center group active:scale-[0.98] transition-transform"
              >
                <span className="text-3xl mb-1 text-white opacity-90">▶</span>
                <span className="text-[9px] uppercase tracking-[0.2em] text-slate-200 font-semibold font-orbitron">
                  Tap to View
                </span>
              </button>
            </div>

            {/* 7. BUTTONS (Side by Side) */}
            {renderCtas(true)}
          </div>
        </div>

        {/* --- DESKTOP LAYOUT (Unchanged) --- */}
        <div className="hidden lg:grid items-center gap-8 lg:gap-16 lg:grid-cols-2 h-full">
          {/* ... Desktop code remains exactly as it was ... */}
           <div className={`order-1 ${textColumnOrder} space-y-6 self-center`}>
            {tile.eyebrow && (
              <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.35em] font-orbitron text-[color:var(--slate360-blue)]">
                {tile.eyebrow}
              </p>
            )}
            <div className="space-y-3">
              <h2 className="text-[36px] sm:text-[40px] font-black text-slate-900 font-orbitron tracking-tight leading-tight drop-shadow-sm">
                {tile.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed max-w-[50rem]">
                {tile.subtitle}
              </p>
            </div>

            {tile.bullets?.length > 0 && (
              <ul className="space-y-2 text-xs sm:text-sm text-slate-800 max-h-[36vh] overflow-y-auto pr-1">
                {tile.bullets.map((bullet) => (
                  <li key={bullet.label} className="flex gap-3">
                    <span
                      className="mt-1 inline-flex h-2 w-2 rounded-full"
                      style={{ backgroundColor: accent }}
                    />
                    <div>
                      <p className="font-bold text-slate-900 font-orbitron">{bullet.label}</p>
                      {bullet.description && (
                        <p className="text-slate-700 font-medium text-sm leading-snug">
                          {bullet.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {renderCtas(false)}
          </div>

          <div className={`order-2 ${viewerColumnOrder} flex justify-center w-full self-center`}>
            <div className="tile-viewer-surface w-full max-w-[640px] aspect-[16/10] flex flex-col items-center justify-center p-6 lg:p-8">
               <span className="text-4xl mb-2" style={{ color: accent }}>▶</span>
               <h3 className="text-xl font-semibold text-white text-center font-orbitron">
                {viewerTitle}
               </h3>
               <button type="button" onClick={() => setViewerOpen(true)} className="mt-2 rounded-xl border border-white/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-white lg:hidden font-orbitron">
                Expand Viewer
               </button>
            </div>
          </div>
        </div>
      </div>

      {viewerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center px-4">
           {/* Modal Content */}
           <div className="bg-white p-6 rounded-2xl w-full max-w-lg">
              <button onClick={() => setViewerOpen(false)}>Close</button>
              {/* Content */}
           </div>
        </div>
      )}
    </section>
  );
}
