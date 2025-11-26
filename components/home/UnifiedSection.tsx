"use client";

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

  const baseCardClasses = "relative flex h-full max-h-[82vh] w-full flex-col rounded-[32px] px-8 py-8 shadow-2xl backdrop-blur-md";
  const primaryToneClasses = "bg-[#0b1220]/95 border border-white/5";
  const altToneClasses = "bg-[#020f2a]/95 border border-[#2f6bff]/25";
  
  const toneClasses = effectiveTone === "alt" ? altToneClasses : primaryToneClasses;

  const sectionTone = effectiveTone === "alt"
    ? "bg-[radial-gradient(circle_at_top,_#020b1f,_#020617)]"
    : "bg-[radial-gradient(circle_at_top,_#050816,_#020617)]";

  return (
    <section
      ref={sectionRef}
      id={id}
      data-snap="tile"
      className={`md:snap-start min-h-screen w-full flex items-center justify-center px-4 md:px-10 lg:px-20 relative overflow-hidden ${sectionTone}`}
      style={sectionStyle}
    >
      <div className="mx-auto flex h-[82vh] max-h-[82vh] w-full max-w-6xl flex-col items-stretch justify-center gap-10 lg:flex-row lg:items-center">
        
        {/* TEXT CONTENT CARD */}
        <div className={`w-full lg:w-1/2 h-full ${textColumnOrder}`}>
            <div className={`${baseCardClasses} ${toneClasses}`}>
                
                {/* Fixed Header */}
                <div className="space-y-2 shrink-0">
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
                <div className="mt-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="prose prose-invert max-w-none">
                        {tile.bullets && tile.bullets.length > 0 && (
                            <ul className="mt-6 space-y-3">
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
                </div>

                {/* Footer (Buttons) */}
                {(tile.cta || tile.secondaryCta) && (
                    <div className="mt-6 flex flex-wrap gap-3 shrink-0">
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
        <div className={`w-full lg:w-1/2 h-full flex items-center justify-center ${viewerColumnOrder}`}>
             <div className="w-full max-w-xl aspect-video bg-[#050712]/95 border border-white/10 rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-50" />
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
