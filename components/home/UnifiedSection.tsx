"use client";

import Link from "next/link";
import { useMemo, useState, useRef } from "react";
import type { CSSProperties } from "react";
import { Tile } from "@/lib/types";
import { clsx } from "clsx";

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

  // THEME MAPPING
  const sectionBackground = (() => {
    switch (displayTheme) {
      case "light":
        return "bg-blueprint"; // Dark Blue #002082
      case "graphite":
        return "bg-graphite";  // Light Grey #f1f5f9
      case "gradient":
        return "bg-gradient-to-b from-slate-50 to-slate-100";
      case "deep":
      default:
        return "bg-blueprint"; // Default to Blueprint
    }
  })();

  // CARD STYLES
  const baseCardClasses = "relative flex flex-col rounded-[32px] shadow-2xl backdrop-blur-md overflow-hidden";
  const primaryToneClasses = "bg-white/90 border border-slate-200/60 shadow-sm";
  const altToneClasses = "bg-slate-50/85 border border-slate-300/45 shadow-sm";
  const toneClasses = effectiveTone === "alt" ? altToneClasses : primaryToneClasses;

  return (
    <section
      ref={sectionRef}
      id={id}
      // DESKTOP: Sticky Curtain Reveal (h-screen, sticky top-0)
      // MOBILE: Full Height (h-[100dvh], relative)
      className={clsx(
        sectionBackground,
        "w-full relative flex flex-col",
        "lg:sticky lg:top-0 lg:h-screen lg:justify-center lg:items-center lg:overflow-hidden", // Desktop Curtain
        "min-h-[100dvh] pt-20 pb-24 lg:py-0" // Mobile
      )}
      style={sectionStyle}
    >
      <div className="mx-auto w-full max-w-[90rem] px-4 md:px-8 lg:px-12 h-full flex flex-col lg:flex-row lg:items-center lg:gap-12">
        
        {/* TEXT CONTENT CARD */}
        <div className={clsx("flex flex-col justify-center w-full lg:w-1/2 h-full lg:h-[85dvh]", textColumnOrder)}>
            <div className={clsx(baseCardClasses, toneClasses, "h-full w-full")}>
                
                {/* Fixed Header */}
                <div className="px-6 pt-8 pb-4 md:px-10 md:pt-10 md:pb-6 shrink-0 z-10 bg-inherit">
                    <div className={`mb-4 h-1 w-16 rounded-full ${effectiveTone === "alt" ? "bg-slate-400" : "bg-[#B87333]"}`} />
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 font-orbitron tracking-tight mb-2">
                        {tile.title}
                    </h2>
                    {tile.eyebrow && (
                        <p className="text-lg md:text-xl font-bold text-blue-600 font-orbitron">
                            {tile.eyebrow}
                        </p>
                    )}
                </div>

                {/* Scrollable Content with Fade Mask */}
                <div className="relative flex-1 overflow-y-auto px-6 md:px-10 fade-mask-bottom custom-scrollbar">
                    <div className="pb-8">
                        <p className="text-base md:text-lg text-slate-600 font-medium mb-6 leading-relaxed">
                            {tile.subtitle}
                        </p>
                        <div className="prose prose-slate max-w-none">
                            {tile.bullets && tile.bullets.length > 0 && (
                                <ul className="space-y-4">
                                    {tile.bullets.map((bullet) => (
                                        <li key={bullet.label} className="flex gap-3 items-start text-slate-600">
                                            <span className="mt-1.5 h-2 w-2 rounded-full bg-[#B87333] shrink-0" />
                                            <span>
                                                <strong className="text-slate-900 font-orbitron text-sm uppercase tracking-wide block mb-1">
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
                </div>

                {/* Footer (Buttons) - Fixed at bottom */}
                {(tile.cta || tile.secondaryCta) && (
                    <div className="px-6 pb-6 pt-4 md:px-10 md:pb-10 mt-auto flex flex-wrap gap-3 shrink-0 z-10 bg-inherit border-t border-slate-100">
                        {tile.cta && (
                            <Link
                                href={tile.cta.href}
                                className="flex-1 inline-flex items-center justify-center px-6 py-4 text-sm font-bold text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-700 border border-transparent rounded-xl transition-all font-orbitron shadow-lg hover:shadow-xl"
                            >
                                {tile.cta.label}
                            </Link>
                        )}
                        {tile.secondaryCta && (
                            <Link
                                href={tile.secondaryCta.href}
                                className="flex-1 inline-flex items-center justify-center px-6 py-4 text-sm font-bold text-slate-700 uppercase tracking-widest bg-slate-100 hover:bg-slate-200 border border-transparent rounded-xl transition-all font-orbitron"
                            >
                                {tile.secondaryCta.label}
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* VIEWER COLUMN */}
        <div className={clsx("w-full lg:w-1/2 mt-6 lg:mt-0 h-[40vh] lg:h-[85dvh] flex items-center justify-center", viewerColumnOrder)}>
            {/* VIEWER CARD: Black Placeholder */}
            <div className="w-full h-full bg-black rounded-[32px] shadow-2xl flex items-center justify-center overflow-hidden group relative border border-slate-800">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
                
                <div className="text-center z-10 p-8 relative">
                    <div className="text-6xl mb-6 text-slate-700 group-hover:text-blue-500 transition-colors duration-500">
                        ❖
                    </div>
                    <h3 className="text-2xl font-bold text-white font-orbitron mb-2">{viewerTitle}</h3>
                    <p className="text-slate-400 mb-6 max-w-xs mx-auto">{viewerSubtitle}</p>
                    
                    <button 
                        onClick={() => setViewerOpen(true)}
                        className="px-8 py-3 border border-slate-600 rounded-full text-sm font-bold font-orbitron text-white hover:bg-white hover:text-black transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                        Expand Viewer
                    </button>
                </div>
             </div>
        </div>
      </div>

      {viewerOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-4xl h-[80vh] relative flex flex-col items-center justify-center">
              <button 
                onClick={() => setViewerOpen(false)} 
                className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="text-center">
                <div className="text-6xl mb-6 text-blue-600 animate-pulse">❖</div>
                <h3 className="text-3xl font-bold mb-4 text-white font-orbitron">{viewerTitle}</h3>
                <p className="text-xl text-slate-400 max-w-lg mx-auto">{viewerSubtitle}</p>
              </div>
           </div>
        </div>
      )}
    </section>
  );
}
