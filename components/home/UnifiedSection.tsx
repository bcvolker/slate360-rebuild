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

  const sectionStyle = useMemo(() => ({
    // Expose accent color for inline elements that need it
    // without adding extra utility classes everywhere.
    // Using CSS vars keeps Tailwind output lean.
    "--section-accent": accent,
  } as CSSProperties), [accent]);

  const viewerTitle = tile.viewer?.title ?? "Viewer";
  const viewerSubtitle = tile.viewer?.subtitle ?? "Interactive content arrives shortly.";

  // Alternate subtle tile backgrounds for more separation on the home canvas.
  // Even tiles (0, 2, 4): Blueprint blue (First tile is blue).
  // Odd tiles (1, 3, 5): Concrete grey.
  const isAlternate = index % 2 === 0;

  const textColumnOrder = layoutAlign === "left" ? "lg:order-2" : "lg:order-1";
  const viewerColumnOrder = layoutAlign === "left" ? "lg:order-1" : "lg:order-2";

  // Helper to render CTAs to avoid duplication between mobile/desktop layouts
  const renderCtas = (isMobile = false) => {
    if (!tile.cta && !tile.secondaryCta) return null;
    return (
      <div className={`flex ${isMobile ? 'flex-col h-full justify-center gap-1' : 'flex-col sm:flex-row gap-2'} pt-0`}>
        {tile.cta && (
          <Link
            href={tile.cta.href}
            className={`inline-flex items-center justify-center rounded-md border border-slate-900 bg-white/90 px-6 py-3 text-sm font-bold uppercase tracking-widest text-slate-900 shadow-sm transition hover:bg-white hover:shadow-md hover:border-slate-900 font-orbitron ${isMobile ? 'w-full flex-1 py-1 text-[9px] leading-tight px-1 text-center whitespace-normal' : ''}`}
          >
            {tile.cta.label}
          </Link>
        )}
        {tile.secondaryCta && (
          <Link
            href={tile.secondaryCta.href}
            className={`inline-flex items-center justify-center rounded-md bg-slate-900 px-6 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-lg transition hover:opacity-90 hover:shadow-xl font-orbitron ${isMobile ? 'w-full flex-1 py-1 text-[9px] leading-tight px-1 text-center whitespace-normal' : ''}`}
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
      className={`relative w-full flex flex-col min-h-[100dvh] justify-center pt-20 pb-8 ${snapEnabled ? "lg:snap-start" : ""} ${isAlternate ? "bg-blueprint" : "bg-concrete"}`}
      style={sectionStyle}
    >
      {/* Static decorative background behind each tile */}
      <div
        className="absolute inset-0 w-full -z-10 opacity-[0.08] bg-[radial-gradient(circle_at_top,var(--section-accent)_0%,transparent_55%)]" 
        aria-hidden 
      />
      <div className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-12 flex flex-col flex-1 h-full justify-center gap-6 md:gap-8">
        
          {/* --- MOBILE/TABLET LAYOUT --- */}
          <div className="lg:hidden flex flex-col w-full h-full justify-center gap-6 md:gap-10">
            {/* Top: Text Content */}
            <div className="flex flex-col space-y-3 shrink-0 text-center md:text-left">
                {tile.eyebrow && (
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] font-orbitron text-slate-900">
                    {tile.eyebrow}
                  </p>
                )}
                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-[30px] font-black text-slate-900 font-orbitron tracking-tight leading-snug drop-shadow-sm">
                    {tile.title}
                  </h2>
                  <p className="text-[15px] sm:text-base text-slate-900 font-semibold leading-relaxed">
                    {tile.subtitle}
                  </p>
                </div>
           </div>

            {/* Middle: Horizontal Scroll */}
              {tile.bullets?.length > 0 && (
                <div className="w-full overflow-x-auto pb-2 pt-2 hide-scrollbar flex-[0_0_auto]">
                <ul className="flex gap-4 w-max px-1">
                  {tile.bullets.map((bullet) => (
                    <li 
                      key={bullet.label} 
                      className="snap-center w-[260px] flex flex-col gap-2 p-4 rounded-xl border border-slate-900/10 bg-white/80 backdrop-blur-sm shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-1.5 w-1.5 rounded-full shrink-0 bg-slate-900" />
                        <p className="font-bold text-slate-900 font-orbitron text-sm">{bullet.label}</p>
                      </div>
                      {bullet.description && (
                        <p className="text-slate-800 font-semibold text-xs leading-snug pl-3.5">{bullet.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bottom: Viewer & Buttons */}
            <div className="w-full flex flex-col gap-4 mt-2">
              <div className="w-full aspect-video bg-black/20 rounded-lg overflow-hidden relative">
                <button
                  type="button"
                  onClick={() => setViewerOpen(true)}
                  className="absolute inset-0 w-full h-full flex flex-col items-center justify-center border border-white/20 shadow-lg overflow-hidden group transition-transform active:scale-[0.98] hover:border-brand-blue/50 bg-slate-900"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                  <span className="text-2xl mb-1 text-white">▶</span>
                  <span className="text-[10px] uppercase tracking-widest text-slate-300 font-semibold font-orbitron">View</span>
                </button>
              </div>

              <div className="w-full grid grid-cols-2 gap-3">
                {renderCtas(true)}
              </div>
            </div>
        </div>

        {/* --- DESKTOP LAYOUT --- */}
        <div className="hidden lg:grid items-center gap-12 lg:gap-24 lg:grid-cols-2 h-full">
          <div className={`order-1 ${textColumnOrder} space-y-8 self-center`}>
            {tile.eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-[0.35em] font-orbitron" style={{ color: accent }}>
                {tile.eyebrow}
              </p>
            )}
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-orbitron tracking-tight drop-shadow-sm">
                {tile.title}
              </h2>
              <p className="text-base sm:text-lg text-slate-800 font-medium leading-relaxed">
                {tile.subtitle}
              </p>
            </div>

            {tile.bullets?.length > 0 && (
              <ul className="space-y-3 text-sm sm:text-base text-slate-800">
                {tile.bullets.map((bullet) => (
                  <li key={bullet.label} className="flex gap-3">
                    <span className="mt-1 inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
                    <div>
                      <p className="font-bold text-slate-900 font-orbitron">{bullet.label}</p>
                      {bullet.description && (
                        <p className="text-slate-700 font-medium text-sm leading-snug">{bullet.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {renderCtas(false)}
          </div>

          <div className={`order-2 ${viewerColumnOrder} flex justify-center w-full self-center`}>
            <div className="tile-viewer-surface w-full max-w-[640px] aspect-[16/10] flex flex-col items-center justify-center p-6 landscape:p-4 lg:p-8 transition-all duration-300 hover:shadow-[0_0_0_1px_rgba(79,137,212,0.2),0_15px_40px_rgba(79,137,212,0.25),0_5px_15px_rgba(0,0,0,0.12)]">
              <span className="text-4xl mb-2 landscape:text-2xl landscape:mb-1" style={{ color: accent }}>▶</span>
              <h3 className="text-xl font-semibold text-white text-center landscape:text-lg font-orbitron">{viewerTitle}</h3>
              <p className="text-xs text-slate-400 text-center mt-1 leading-tight landscape:hidden">
                Tap to expand
              </p>
              <button
                type="button"
                onClick={() => setViewerOpen(true)}
                className="mt-2 rounded-xl border border-white/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-white transition hover:border-white/60 lg:hidden font-orbitron"
              >
                Expand Viewer
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-brand-blue/20 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold font-orbitron" style={{ color: accent }}>
                {viewerTitle}
              </h4>
              <button
                type="button"
                onClick={() => setViewerOpen(false)}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-700 hover:bg-slate-100 font-orbitron"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-slate-700 mb-4">{viewerSubtitle}</p>
            <p className="text-xs text-slate-600">
              This placeholder keeps the interaction consistent with the prior design while we migrate to fully embeddable viewers.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
