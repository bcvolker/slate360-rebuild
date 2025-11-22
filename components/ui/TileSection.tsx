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
      className={`relative min-h-screen snap-start overflow-hidden flex flex-col ${isFirstTile ? "debug-section-center" : ""}`}
      style={sectionStyle}
    >
      <div className="flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid gap-12 lg:gap-16 lg:grid-cols-2 items-center">
            <div className={textColClass}>
              {/* all your text content unchanged */}
              {tile?.eyebrow && <p className="text-theme-accent font-bold tracking-widest uppercase text-xs">{tile.eyebrow}</p>}
              {tile?.title && <h2 className="text-3xl font-bold text-slate-900 font-orbitron tracking-wide">{tile.title}</h2>}
              {tile?.subtitle && <p className="text-lg text-theme-muted leading-relaxed">{tile.subtitle}</p>}
              {bullets.length > 0 && (
                <ul className="space-y-2 text-theme-muted">
                  {bullets.map((item) => (
                    <li key={item} className="flex items-start"><span className="text-theme-accent mr-2">•</span><span>{item}</span></li>
                  ))}
                </ul>
              )}
              {tile?.ctaLabel && tile?.ctaHref && (
                <Link href={tile.ctaHref} className="mt-4 inline-block bg-theme-accent hover:bg-theme-accent/80 text-white px-6 py-3 rounded-md font-semibold transition-colors">
                  {tile.ctaLabel} →
                </Link>
              )}
            </div>

            <div className={`${viewerColClass} ${isFirstTile ? "debug-viewer-box" : ""}`}>
              <span className="text-4xl text-theme-accent mb-2">▶</span>
              {tile?.viewerTitle && <h3 className="text-xl font-semibold text-white text-center">{tile.viewerTitle}</h3>}
              {tile?.viewerSubtitle && <p className="text-sm text-theme-soft text-center">{tile.viewerSubtitle}</p>}
              <p className="text-xs text-theme-muted text-center mt-1">
                Tap or click to expand and explore. Future versions will load 3D models, videos, or 360 tours here.
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLastTile && (
        <footer className="slate360-footer w-full text-xs shrink-0">
          <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4 px-6 py-6">
            <nav className="flex items-center gap-8">
              <Link href="/about" className="uppercase tracking-wider hover:text-theme-accent transition-colors">About</Link>
              <Link href="/contact" className="uppercase tracking-wider hover:text-theme-accent transition-colors">Contact</Link>
              <Link href="/subscribe" className="uppercase tracking-wider hover:text-theme-accent transition-colors">Subscribe</Link>
              <Link href="/privacy" className="uppercase tracking-wider hover:text-theme-accent transition-colors">Privacy</Link>
            </nav>
            <p className="text-theme-soft">© 2025 Slate360. All rights reserved.</p>
          </div>
        </footer>
      )}
    </section>
  );
}