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

  // --- THEME LOGIC ---
  // Theme A: Blueprint (Blue Background) -> isAlternate (Even index)
  // Theme B: Graphite (Grey Background) -> !isAlternate (Odd index)
  
  const themeClass = isAlternate ? "bg-blueprint-theme" : "bg-graphite-theme";
  
  // Glass Card Classes
  const glassCardClass = isAlternate
    ? "backdrop-blur-md bg-white/10 rounded-2xl border border-white/10 p-6 lg:py-8 lg:px-10 flex flex-col justify-center h-full lg:h-[80dvh] lg:overflow-hidden" // Blue Theme: White Glass
    : "backdrop-blur-md bg-white/60 rounded-2xl border border-slate-900/5 p-6 lg:py-8 lg:px-10 flex flex-col justify-center h-full lg:h-[80dvh] lg:overflow-hidden"; // Grey Theme: Frosted Glass

  // Text Colors
  const titleColor = isAlternate ? "text-white" : "text-slate-900";
  const eyebrowColor = isAlternate ? "text-blue-200" : "text-blue-600";
  const textColor = isAlternate ? "text-slate-200" : "text-slate-800";
  const bulletColor = isAlternate ? "text-white" : "text-slate-900";
  const bulletBg = isAlternate ? "bg-white/10 border-white/20" : "bg-white/60 border-slate-200/50";

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
            className={`inline-flex items-center justify-center rounded-md border border-[color:var(--slate360-blue)] bg-[color:var(--slate360-blue)] px-4 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-sm transition hover:bg-white hover:text-[color:var(--slate360-blue)] hover:shadow-md hover:border-[color:var(--slate360-blue)] font-orbitron ${
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
            className={`inline-flex items-center justify-center rounded-md bg-[color:var(--slate360-copper)] px-4 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-lg transition hover:opacity-90 hover:shadow-xl font-orbitron ${
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
      className={`relative w-full flex flex-col min-h-[100dvh] pb-32 lg:pb-10 lg:h-[100dvh] lg:sticky lg:top-0 ${
        snapEnabled ? "snap-start" : ""
      } ${themeClass}`}
      style={sectionStyle}
    >
      <div
        className="absolute inset-0 w-full -z-10 opacity-[0.08] bg-[radial-gradient(circle_at_top,var(--section-accent)_0%,transparent_55%)]"
        aria-hidden
      />
      
      {/* INNER CONTAINER */}
      {/* FIX 2: SPACING - Removed inner pt-6, changed justify-center to justify-start for mobile compactness */}
      {/* FIX 3: LANDSCAPE SCROLLING - Added landscape:h-auto to allow full page scrolling on short screens, restored fixed height for lg */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-12 flex flex-col flex-1 h-[calc(100dvh-80px)] landscape:h-auto lg:h-[calc(100dvh-80px)] justify-start lg:justify-center gap-0 md:gap-8">
        
        {/* --- MOBILE/TABLET LAYOUT (REWRITTEN) --- */}
        <div className="lg:hidden w-full h-full flex flex-col">
  
          {/* TOP HALF: Text Content 
              - pt-4: Reduced from pt-28 to fix "massive blank space".
              - justify-start: Stacks items tightly at the top.
              - flex-1 min-h-0 overflow-y-auto: Allows text/bullets to scroll if they get too tall on mobile.
              - md:overflow-hidden: On tablet, we lock the main container and scroll just the list.
          */}
          <div className={`flex flex-col justify-start pt-4 pb-2 px-1 flex-1 min-h-0 overflow-y-auto md:overflow-hidden md:justify-center md:pt-0 ${glassCardClass} mb-4`}>
            
            {/* 1. TITLE (Largest Text & BLUE) - Increased mobile sizes */}
            <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black ${titleColor} font-orbitron tracking-tight leading-none mb-2 drop-shadow-sm shrink-0`}>
              {tile.title}
            </h2>

            {/* 2. SUB-HEADLINE (Eyebrow repurposed) - Increased mobile sizes */}
            {tile.eyebrow && (
              <p className={`text-lg sm:text-xl md:text-2xl font-bold ${eyebrowColor} font-orbitron leading-tight mb-3 md:mb-4 shrink-0`}>
                {tile.eyebrow}
              </p>
            )}

            {/* 3. SUBTITLE (Description) - Increased mobile sizes */}
            <p className={`text-sm sm:text-base md:text-lg ${textColor} font-medium leading-relaxed mb-4 md:mb-6 shrink-0`}>
              {tile.subtitle}
            </p>

            {/* 4. MAIN BULLETS (Vertical List) 
                - Portrait: Show ALL bullets vertically.
                - Landscape: Hidden.
                - Tablet (md): Scrollable container for the list itself.
            */}
            {tile.bullets?.length > 0 && (
              <ul className="space-y-2 md:space-y-3 mb-2 landscape:hidden md:overflow-y-auto md:max-h-[35vh] md:pr-2 md:scrollbar-thin md:scrollbar-thumb-slate-300 md:scrollbar-track-transparent">
                {tile.bullets.map((bullet) => (
                  <li
                    key={bullet.label}
                    className={`flex items-start gap-2.5 rounded-lg ${bulletBg} backdrop-blur-sm border px-3 py-2 md:px-4 md:py-2.5 shadow-sm`}
                  >
                    <span className="mt-1.5 inline-flex h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-[color:var(--slate360-copper)] shrink-0" />
                    <p className={`font-bold ${bulletColor} font-orbitron text-sm md:text-base`}>
                      {bullet.label}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* MIDDLE: Horizontal Scroller (Landscape Only) 
              - Hidden on Portrait.
              - Visible on Landscape.
              - mb-2: Adds gap between scroller and viewer.
          */}
          <div className="w-full min-h-0 hidden landscape:flex flex-col justify-center mb-2 shrink-0">
             {tile.bullets && (
              <div className="w-full overflow-x-auto py-1 hide-scrollbar">
                <ul className="flex gap-3 w-max px-1">
                  {tile.bullets.map((bullet) => (
                    <li
                      key={`land-${bullet.label}`}
                      className={`w-[160px] flex flex-col gap-1 p-2 rounded-lg border ${bulletBg} backdrop-blur-sm shadow-sm`}
                    >
                      <p className={`font-bold ${bulletColor} font-orbitron text-[10px] truncate`}>
                        {bullet.label}
                      </p>
                       {bullet.description && (
                       <p className={`${isAlternate ? "text-slate-300" : "text-slate-600"} text-[9px] leading-tight line-clamp-2`}>
                         {bullet.description}
                       </p>
                     )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* BOTTOM HALF: Visuals & Actions 
              - mt-auto: Pushes to bottom (if space allows).
              - pb-4: Standard padding.
          */}
          <div className="flex flex-col gap-3 pb-4 shrink-0">
            
            {/* 4. VIEWER 
                - landscape:max-h-[20vh]: Reduce height in landscape to prevent collision.
            */}
            <div className="w-full aspect-video rounded-xl overflow-hidden relative border border-slate-900/10 bg-slate-900/90 shadow-lg max-h-[25vh] landscape:max-h-[20vh]">
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

            {/* 5. BUTTONS (Side by Side) */}
            {renderCtas(true)}
          </div>
        </div>

        {/* --- DESKTOP LAYOUT (Unchanged) --- */}
        <div className="hidden lg:grid items-center gap-8 lg:gap-16 lg:grid-cols-2 h-full pt-4 lg:pt-0">
          {/* ... Desktop code remains exactly as it was ... */}
           <div className={`order-1 ${textColumnOrder} space-y-6 lg:space-y-8 self-center ${glassCardClass}`}>
            
            <div className="space-y-2 lg:space-y-4 shrink-0">
              {/* TITLE: Blue & Large */}
              <h2 className={`text-[36px] sm:text-[40px] lg:text-6xl font-black ${titleColor} font-orbitron tracking-tight leading-tight drop-shadow-sm`}>
                {tile.title}
              </h2>
              
              {/* SUB-HEADLINE (Eyebrow repurposed) */}
              {tile.eyebrow && (
                <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${eyebrowColor} font-orbitron leading-tight`}>
                  {tile.eyebrow}
                </p>
              )}
            </div>

            {/* SCROLLABLE CONTENT AREA: Subtitle + Bullets */}
            <div className="flex-1 overflow-y-auto pr-4 space-y-6 [mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)] scrollbar-thin scrollbar-thumb-white/30">
              {/* SUBTITLE: Description */}
              <p className={`text-xs sm:text-sm lg:text-lg ${textColor} font-medium leading-relaxed max-w-[50rem]`}>
                {tile.subtitle}
              </p>

              {tile.bullets?.length > 0 && (
                <ul className="space-y-3 text-sm text-slate-800">
                  {tile.bullets.map((bullet) => (
                    <li key={bullet.label} className="flex gap-3">
                      <span
                        className="mt-1 inline-flex h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: "var(--slate360-copper)" }}
                      />
                      <div>
                        <p className={`font-black ${bulletColor} font-orbitron`}>{bullet.label}</p>
                        {bullet.description && (
                          <p className={`${bulletColor} font-bold text-sm lg:text-base leading-snug opacity-80`}>
                            {bullet.description}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="shrink-0 pt-2">
              {renderCtas(false)}
            </div>
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
