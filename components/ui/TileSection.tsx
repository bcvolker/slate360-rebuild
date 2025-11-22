"use client";
import React from "react";
// We need to import Link if you use it for the CTA
import Link from 'next/link';

interface Tile {
  id?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  bullets?: string[];
  ctaLabel?: string;
  ctaHref?: string;
  viewerTitle?: string;
  viewerSubtitle?: string;
}

interface TileSectionProps {
  tile: Tile;
  index: number;
  'data-placeholder'?: boolean; // Add this to accept the prop
}

export default function TileSection({ tile, index }: TileSectionProps) {
  const isReversed = index % 2 === 1;
  const isFirstTile = index === 0;
  // IMPORTANT: Update this number to be (total number of tiles - 1)
  // If you have 8 tiles, this should be index === 7
  const isLastTile = index === 7;
  const bullets: string[] = Array.isArray(tile?.bullets) ? tile?.bullets : [];
  const sectionStyle = isLastTile
    ? { paddingTop: "var(--navbar-height)" }
    : { paddingTop: "var(--navbar-height)", paddingBottom: "var(--navbar-height)" };

  // Text column - transparent, merges with background
  const textColClass = [
    "block", // Block allows text wrapping around floats
    "tile-text-surface",
    "border-2 border-dotted border-red-500", // Debug border
    "pb-12", // Expand down 1/2" (all tiles, all screens)
    "-ml-12", // Expand left 1/2" (all tiles, all screens)
  ].join(" ");

  // Viewer column
  const viewerColClass = [
    // Base styles (Mobile & Desktop)
    "relative z-20", // Higher z-index to sit ON TOP of the text border
    "flex flex-col items-center justify-center",
    "tile-viewer-surface",
    "bg-slate-900", // Solid background to hide the red line behind it
    "border-2 border-dotted border-red-500", // Debug border
    
    // Mobile: Small thumbnail, floated
    "w-32 h-32 rounded-xl p-2 mb-2 border border-white/10",
    isReversed ? "float-left mr-4" : "float-right ml-4",
    
    // Desktop: Larger card, still floated to allow wrapping
    "lg:w-[460px] lg:h-[336px] lg:rounded-3xl lg:p-8 lg:mb-12", // Bottom margin 1/2"
    isFirstTile ? "lg:max-w-[550px] lg:h-[400px]" : "",
    isReversed ? "lg:float-left lg:mr-12" : "lg:float-right lg:ml-12", // Side margin 1/2"
    
  ].join(" ");

  return (
    <section
      id={tile?.id}
      data-snap="tile"
      className={`relative min-h-screen snap-start overflow-hidden flex flex-col ${isFirstTile ? "debug-section-center" : ""}`}
      style={sectionStyle}
    >
      <div className="flex-1 flex items-start pt-24">
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-8">
          {/* Container: Block for both to allow wrapping */}
          <div className="relative w-full clearfix">
            
            {/* Viewer First in DOM for float wrapping */}
            <div className={`${viewerColClass} ${isFirstTile ? "debug-viewer-box" : ""}`}>
              <span className="text-2xl lg:text-4xl text-theme-accent mb-1 lg:mb-2">▶</span>
              {tile?.viewerTitle && <h3 className="hidden lg:block text-xl font-semibold text-white text-center">{tile.viewerTitle}</h3>}
              <p className="text-[10px] lg:text-xs text-theme-muted text-center mt-1 leading-tight">
                <span className="lg:hidden">Tap to expand</span>
                <span className="hidden lg:inline">Tap or click to expand and explore. Future versions will load 3D models, videos, or 360 tours here.</span>
              </p>
            </div>

            <div className={textColClass}>
              {/* all your text content unchanged */}
              {tile?.eyebrow && <p className="text-theme-accent font-bold tracking-widest uppercase text-xs mb-2">{tile.eyebrow}</p>}
              {tile?.title && <h2 className="text-3xl font-bold text-slate-900 font-orbitron tracking-wide mb-4">{tile.title}</h2>}
              {tile?.subtitle && <p className="text-lg text-theme-muted leading-relaxed mb-4">{tile.subtitle}</p>}
              {bullets.length > 0 && (
                <ul className="space-y-2 text-theme-muted mb-6">
                  {bullets.map((item) => (
                    <li key={item} className="flex items-start"><span className="text-theme-accent mr-2">•</span><span>{item}</span></li>
                  ))}
                </ul>
              )}
              
              {/* DEMO CONTENT: Only on first tile to show expansion */}
              {isFirstTile && (
                <div className="mt-4 p-4 bg-yellow-100/10 border border-yellow-500/50 rounded text-sm text-theme-muted">
                  <p className="font-bold text-yellow-500 mb-2">DEMO: Extra Content Expansion</p>
                  <p>
                    This is extra content to demonstrate that the text area expands and wraps around the viewer. 
                    As you add more text here, it will flow down the side of the viewer and eventually wrap underneath it, 
                    filling the full width of the container. The red dotted line shows the current boundary of this text block.
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                </div>
              )}

              {tile?.ctaLabel && tile?.ctaHref && (
                <Link href={tile.ctaHref} className="mt-4 inline-block bg-theme-accent hover:bg-theme-accent/80 text-white px-6 py-3 rounded-md font-semibold transition-colors">
                  {tile.ctaLabel} →
                </Link>
              )}
            </div>

          </div>
        </div>
      </div>

      {isLastTile && (
        <footer className="slate360-footer w-full text-xs shrink-0">
          <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4 px-6 py-6">
            <nav className="flex items-center gap-8">
              <Link href="/about" className="uppercase tracking-wider hover:text-[#A97142] transition-colors">About</Link>
              <Link href="/contact" className="uppercase tracking-wider hover:text-[#A97142] transition-colors">Contact</Link>
              <Link href="/subscribe" className="uppercase tracking-wider hover:text-[#A97142] transition-colors">Subscribe</Link>
              <Link href="/privacy" className="uppercase tracking-wider hover:text-[#A97142] transition-colors">Privacy</Link>
            </nav>
            <p className="text-theme-soft">© 2025 Slate360. All rights reserved.</p>
          </div>
        </footer>
      )}
    </section>
  );
}