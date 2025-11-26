// Force Git Sync
"use client";

// Mobile layout fix verified: Light Theme Active
import Link from "next/link";
import { useMemo, useState, useRef } from "react";
import type { CSSProperties } from "react";
import { Tile } from "@/lib/types";

interface UnifiedSectionProps {
  id: string;
  tile: Tile;
  index: number;
  displayTheme?: "deep" | "light" | "graphite" | "gradient";
  tone?: "primary" | "alt";
}

export default function UnifiedSection({ id, tile, index, displayTheme = "deep", tone }: UnifiedSectionProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const accent = tile.theme?.accent ?? "#4F89D4";
  const layoutAlign = tile.layout?.align ?? (index % 2 === 0 ? "right" : "left");
  const effectiveTone = tone || tile.tone || "primary";

  const sectionStyle = useMemo(
    () =>
      ({
        "--section-accent": accent,
        zIndex: index + 1,
      } as CSSProperties),
    [accent, index]
  );

  const viewerTitle = tile.viewer?.title ?? "Viewer";
  const viewerSubtitle = tile.viewer?.subtitle ?? "Interactive content arrives shortly.";
  
  const textColumnOrder = layoutAlign === "left" ? "lg:order-2" : "lg:order-1";
  const viewerColumnOrder = layoutAlign === "left" ? "lg:order-1" : "lg:order-2";

  const baseCardClasses = "relative flex h-full w-full flex-col rounded-[32px] px-8 py-8 shadow-2xl backdrop-blur-md";
  // LIGHT THEME COLORS
  const primaryToneClasses = "bg-white/90 border border-slate-200/60 shadow-sm";
  const altToneClasses = "bg-slate-50/85 border border-slate-300/45 shadow-sm";
  
  const toneClasses = effectiveTone === "alt" ? altToneClasses : primaryToneClasses;

  const sectionBackground = (() => {
    switch (displayTheme) {
      case "light":
        return "bg-blueprint-paper";   // warm off-white grid
      case "graphite":
        return "bg-concrete";          // light grey grid
      case "gradient":
        return "bg-gradient-to-b from-slate-50 to-slate-100";
      case "deep":
      default:
        return "bg-slate-100";         // simple light fallback
    }
  })();

  return (
    <section
      ref={sectionRef}
      id={id}
      data-snap="tile"
      // LAYOUT FIX: min-h-full instead of min-h-screen to avoid mobile address bar clipping
      className={`${sectionBackground} w-full px-4 py-10 md:px-10 lg:px-20 relative overflow-hidden pt-24 md:pt-28 lg:pt-0 flex flex-col min-h-full md:snap-start md:items-center md:justify-center`}
      style={sectionStyle}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 md:grid md:grid-cols-2 md:items-center">
        {/* TEXT CONTENT CARD */}
        <div className={`w-full h-auto md:h-full flex flex-col justify-center ${textColumnOrder}`}>
            <div className={`${baseCardClasses} ${toneClasses} !px-0 !py-0 overflow-hidden`}>
                
                {/* Fixed Header - Not scrollable */}
                <div className="px-6 pt-6 pb-2 md:px-8 md:pt-8 md:pb-4 space-y-2 shrink-0">
                    <div className={`mb-4 h-1 w-16 rounded-full ${effectiveTone === "alt" ? "bg-[color:var(--slate-silver)]" : "bg-[color:var(--slate-copper)]"}`} />
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[color:var(--slate-text-main)] font-orbitron tracking-tight mb-2">
                        {tile.title}
                    </h2>
                    {tile.eyebrow && (
                        <p className="text-lg md:text-xl font-bold text-[color:var(--slate-blueprint-accent)] font-orbitron">
                            {tile.eyebrow}
                        </p>
                    )}
                    <p className="mt-2 text-base md:text-lg text-[color:var(--slate-text-muted)] font-medium">
                        {tile.subtitle}
                    </p>
                </div>

                {/* Scrollable Content */}
                <div className="relative px-6 pb-6 md:px-8 md:pb-4 flex-1 overflow-y-auto custom-scrollbar max-h-[40vh] md:max-h-[46vh]">
                    <div className="prose prose-invert max-w-none">
                        {tile.bullets && tile.bullets.length > 0 && (
                            <ul className="mt-4 space-y-3">
                                {tile.bullets.map((bullet) => (
                                    <li key={bullet.label} className="flex gap-3 items-start text-[color:var(--slate-text-muted)]">
                                        <span className="mt-1.5 h-2 w-2 rounded-full bg-[color:var(--slate-copper)] shrink-0" />
                                        <span>
                                            <strong className="text-[color:var(--slate-text-main)] font-orbitron text-sm uppercase tracking-wide block">
                                                {bullet.label}
                                            </strong>
                                            {bullet.description}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    
                    {/* Bottom gradient hint for scrollable card content - Mobile Only */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent md:hidden" />
                </div>

                {/* Footer (Buttons) - Fixed at bottom */}
                {(tile.cta || tile.secondaryCta) && (
                    <div className="px-6 pb-6 md:px-8 md:pb-8 mt-auto flex flex-wrap gap-3 shrink-0">
                        {tile.cta && (
                            <Link
                                href={tile.cta.href}
                                className="flex-1 inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-white uppercase tracking-widest bg-[color:var(--slate-blueprint)] hover:bg-[color:var(--slate-blueprint-accent)] border border-transparent rounded-lg transition-all font-orbitron"
                            >
                                {tile.cta.label}
                            </Link>
                        )}
                        {tile.secondaryCta && (
                            <Link
                                href={tile.secondaryCta.href}
                                className="flex-1 inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-[color:var(--slate-bg-navy)] uppercase tracking-widest bg-[color:var(--slate-copper)] hover:bg-white border border-transparent rounded-lg transition-all font-orbitron"
                            >
                                {tile.secondaryCta.label}
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* VIEWER COLUMN */}
        <div className={`w-full flex items-start justify-center mt-8 md:mt-0 md:h-full md:items-center ${viewerColumnOrder}`}>
            {/* LIGHT THEME VIEWER CARD */}
            <div className="w-full max-w-md md:max-w-xl h-56 sm:h-64 md:h-[420px] bg-white/90 border border-slate-200/60 rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-50" />
                <div className="text-center z-10 p-6">
                    <div className="text-6xl mb-4 opacity-50 group-hover:opacity-100 transition-opacity duration-500 text-[color:var(--slate-text-main)]">
                        ❖
                    </div>
                    <h3 className="text-2xl font-bold text-[color:var(--slate-text-main)] font-orbitron mb-2">{viewerTitle}</h3>
                    <button 
                        onClick={() => setViewerOpen(true)}
                        className="mt-4 px-6 py-2 border border-[color:var(--slate-silver)] rounded-full text-sm font-orbitron text-[color:var(--slate-text-main)] hover:bg-[color:var(--slate-silver)]/10 transition-colors uppercase tracking-widest"
                    >
                        Launch Viewer
                    </button>
                </div>
             </div>
        </div>
      </div>

      {viewerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center px-4">
           <div className="bg-white p-6 rounded-2xl w-full max-w-lg relative">
              <button onClick={() => setViewerOpen(false)} className="absolute top-4 right-4 text-black font-bold p-2">✕</button>
              <div className="text-center py-10">
                <h3 className="text-xl font-bold mb-2 text-slate-900">{viewerTitle}</h3>
                <p className="text-slate-600">{viewerSubtitle}</p>
              </div>
           </div>
        </div>
      )}
    </section>
  );
}
