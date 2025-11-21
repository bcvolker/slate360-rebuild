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

  // Text column - transparent, merges with background
  const textColClass = [
    "flex flex-col justify-center gap-4",
    "tile-text-surface",
    isReversed ? "lg:order-2" : "lg:order-1",
  ].join(" ");

  // Viewer column - dark card (consistent size for both layouts)
  const viewerColClass = [
    "h-[420px] w-full max-w-xl rounded-3xl mx-auto",
    "flex flex-col items-center justify-center gap-3 p-8",
    "tile-viewer-surface",
    isReversed ? "lg:order-1" : "lg:order-2",
  ].join(" ");

  return (
    <section
      id={tile?.id}
      data-snap="tile"
      className={`relative min-h-[calc(100vh-4.5rem)] snap-start overflow-hidden ${isFirstTile ? "debug-section-center" : ""}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-red-500/70 z-50" />
      {/* Main content - perfectly centered */}
      <div className="h-full flex items-center justify-center px-6 lg:px-8 pt-16 pb-16 lg:pt-20 lg:pb-20">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid gap-12 lg:gap-16 lg:grid-cols-2 items-center">
            <div className={textColClass}>
              {/* all your text content unchanged */}
              {tile?.eyebrow && <p className="text-slate360-blue font-bold tracking-widest uppercase text-xs">{tile.eyebrow}</p>}
              {tile?.title && <h2 className="text-3xl font-bold text-slate-50 font-orbitron tracking-wide">{tile.title}</h2>}
              {tile?.subtitle && <p className="text-lg text-slate-300 leading-relaxed">{tile.subtitle}</p>}
              {bullets.length > 0 && (
                <ul className="space-y-2 text-slate-300">
                  {bullets.map((item) => (
                    <li key={item} className="flex items-start"><span className="text-slate360-blue mr-2">•</span><span>{item}</span></li>
                  ))}
                </ul>
              )}
              {tile?.ctaLabel && tile?.ctaHref && (
                <Link href={tile.ctaHref} className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-semibold transition-colors">
                  {tile.ctaLabel} →
                </Link>
              )}
            </div>

            <div className={`${viewerColClass} ${isFirstTile ? "debug-viewer-box" : ""}`}>
              <span className="text-4xl text-blue-400 mb-2">▶</span>
              {tile?.viewerTitle && <h3 className="text-xl font-semibold text-white text-center">{tile.viewerTitle}</h3>}
              {tile?.viewerSubtitle && <p className="text-sm text-slate-400 text-center">{tile.viewerSubtitle}</p>}
              <p className="text-xs text-slate-500 text-center mt-1">
                Tap or click to expand and explore. Future versions will load 3D models, videos, or 360 tours here.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer fixed to bottom of last tile */}
      {isLastTile && (
        <div className="absolute inset-x-0 bottom-0 z-10">
          <footer className="slate360-footer w-full text-xs">
            <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4 px-6 py-6">
              <nav className="flex items-center gap-8">
                <Link href="/about" className="uppercase tracking-wider hover:text-slate-50 transition-colors">About</Link>
                <Link href="/contact" className="uppercase tracking-wider hover:text-slate-50 transition-colors">Contact</Link>
                <Link href="/subscribe" className="uppercase tracking-wider hover:text-slate-50 transition-colors">Subscribe</Link>
                <Link href="/privacy" className="uppercase tracking-wider hover:text-slate-50 transition-colors">Privacy</Link>
              </nav>
              <p className="text-slate-400">© 2025 Slate360. All rights reserved.</p>
            </div>
          </footer>
        </div>
      )}
    </section>
  );
}