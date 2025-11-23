"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Tile } from "@/lib/types";

interface UnifiedSectionProps {
  tile: Tile;
  index: number;
}

export default function UnifiedSection({ tile, index }: UnifiedSectionProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const accent = tile.theme?.accent ?? "#4FA9FF";
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

  const textColumnOrder = layoutAlign === "left" ? "lg:order-2" : "lg:order-1";
  const viewerColumnOrder = layoutAlign === "left" ? "lg:order-1" : "lg:order-2";

  // Helper to render CTAs to avoid duplication between mobile/desktop layouts
  const renderCtas = (isMobile = false) => {
    if (!tile.cta && !tile.secondaryCta) return null;
    return (
      <div className={`flex ${isMobile ? 'flex-col w-full' : 'flex-col sm:flex-row'} gap-3 pt-2`}>
        {tile.cta && (
          <Link
            href={tile.cta.href}
            className={`inline-flex items-center justify-center rounded-md bg-[var(--section-accent)] px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white shadow-lg shadow-[var(--section-accent)/40] transition hover:opacity-90 ${isMobile ? 'w-full py-2.5 text-xs' : ''}`}
            style={{ backgroundColor: accent }}
          >
            {tile.cta.label}
          </Link>
        )}
        {tile.secondaryCta && (
          <Link
            href={tile.secondaryCta.href}
            className={`inline-flex items-center justify-center rounded-md border border-slate-900/10 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-slate-700 transition hover:border-slate-900/40 ${isMobile ? 'w-full py-2.5 text-xs' : ''}`}
          >
            {tile.secondaryCta.label}
          </Link>
        )}
      </div>
    );
  };

  return (
    <section
      id={tile.id}
      data-snap="tile"
      // Updated: Enable snap and full height on mobile as well
      className={`relative w-full flex flex-col justify-center ${snapEnabled ? "snap-start h-[100dvh] lg:pt-[80px]" : "py-16 sm:py-20"}`}
      style={sectionStyle}
    >
      <div className="absolute inset-0 -z-10 opacity-[0.08] bg-[radial-gradient(circle_at_top,var(--section-accent)_0%,transparent_55%)]" aria-hidden />
      <div className="w-full max-w-6xl mx-auto px-6 md:px-10 lg:px-12 h-full flex flex-col justify-center">
        
        {/* --- MOBILE LAYOUT (Condensed) --- */}
        <div className="lg:hidden flex flex-col h-full pt-24 pb-8 justify-between">
           {/* Top: Text Content */}
           <div className="space-y-4 overflow-y-auto no-scrollbar pr-1">
              {tile.eyebrow && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500" style={{ color: accent }}>
                  {tile.eyebrow}
                </p>
              )}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 font-orbitron tracking-tight leading-tight">
                  {tile.title}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {tile.subtitle}
                </p>
              </div>

              {tile.bullets?.length > 0 && (
                <ul className="space-y-2 text-xs text-slate-600 pt-2">
                  {tile.bullets.map((bullet) => (
                    <li key={bullet.label} className="flex gap-2">
                      <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                      <div>
                        <p className="font-semibold text-slate-900">{bullet.label}</p>
                        {bullet.description && (
                          <p className="text-slate-500 text-[10px] leading-snug mt-0.5">{bullet.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
           </div>

           {/* Bottom: Viewer + CTAs Side-by-Side */}
           <div className="mt-2 pt-3 border-t border-slate-100 flex items-center gap-3 shrink-0">
              {/* Compact Viewer Thumbnail */}
              <button 
                type="button"
                onClick={() => setViewerOpen(true)}
                className="w-24 h-24 bg-slate-900 rounded-xl flex flex-col items-center justify-center shrink-0 border border-slate-800 shadow-sm relative overflow-hidden group transition-transform active:scale-95"
              >
                 <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/0 pointer-events-none" />
                 <span className="text-2xl mb-1" style={{ color: accent }}>▶</span>
                 <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">View</span>
              </button>

              {/* CTAs */}
              <div className="flex-1 min-w-0">
                 {renderCtas(true)}
              </div>
           </div>
        </div>

        {/* --- DESKTOP LAYOUT --- */}
        <div className="hidden lg:grid items-center gap-10 lg:gap-16 lg:grid-cols-2 h-full pt-20 lg:pt-0">
          <div className={`order-1 ${textColumnOrder} space-y-6`}>
            {tile.eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500" style={{ color: accent }}>
                {tile.eyebrow}
              </p>
            )}
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-orbitron tracking-tight">
                {tile.title}
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                {tile.subtitle}
              </p>
            </div>

            {tile.bullets?.length > 0 && (
              <ul className="space-y-3 text-sm sm:text-base text-slate-600">
                {tile.bullets.map((bullet) => (
                  <li key={bullet.label} className="flex gap-3">
                    <span className="mt-1 inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
                    <div>
                      <p className="font-semibold text-slate-900">{bullet.label}</p>
                      {bullet.description && (
                        <p className="text-slate-600 text-sm leading-snug">{bullet.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {renderCtas(false)}
          </div>

          <div className={`order-2 ${viewerColumnOrder} flex justify-center`}>
            <div className="tile-viewer-surface w-full lg:w-[460px] lg:h-[336px] flex flex-col items-center justify-center p-8 transition-all duration-300 hover:bg-slate-900/80">
              <span className="text-4xl mb-2" style={{ color: accent }}>▶</span>
              <h3 className="text-xl font-semibold text-white text-center">{viewerTitle}</h3>
              <p className="text-xs text-slate-400 text-center mt-1 leading-tight">
                {viewerSubtitle}
              </p>
              <button
                type="button"
                onClick={() => setViewerOpen(true)}
                className="mt-4 rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/60 lg:hidden"
              >
                Expand
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold" style={{ color: accent }}>
                {viewerTitle}
              </h4>
              <button
                type="button"
                onClick={() => setViewerOpen(false)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em]"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-slate-200 mb-4">{viewerSubtitle}</p>
            <p className="text-xs text-slate-400">
              This placeholder keeps the interaction consistent with the prior design while we migrate to fully embeddable viewers.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
