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
    <section id={tile?.id} data-snap="tile" className="h-screen home-gradient snap-start tile-section-container">
      <div className="w-full max-w-6xl mx-auto px-6 lg:px-8 py-20 lg:py-24">
        <div className="grid gap-10 lg:gap-16 lg:grid-cols-2 items-center">
          {/* TEXT / CONTENT BOX */}
          <div className={textColClass}>
          {tile?.eyebrow && (
            <p className="text-slate360-blue font-bold tracking-widest uppercase text-xs">{tile.eyebrow}</p>
          )}
          {tile?.title && (
            <h2 className="text-3xl font-bold text-slate-50 font-orbitron tracking-wide">{tile.title}</h2>
          )}
          {tile?.subtitle && (
            <p className="text-lg text-slate-300 leading-relaxed">{tile.subtitle}</p>
          )}
          {bullets.length > 0 && (
            <ul className="space-y-2 text-slate-300">
              {bullets.map((item: string) => (
                <li key={item} className="flex items-start">
                  <span className="text-slate360-blue mr-2">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {tile?.ctaLabel && tile?.ctaHref && (
            <Link // Use Link component for Next.js routing
              href={tile.ctaHref}
              className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-semibold transition-colors"
            >
              {tile.ctaLabel} →
            </Link>
          )}
        </div>

        {/* VIEWER BOX */}
        <div className={viewerColClass} data-placeholder="true">
          <span className="text-4xl text-blue-400 mb-2">▶</span>
          {tile?.viewerTitle && (
            <h3 className="text-xl font-semibold text-white text-center">
              {tile.viewerTitle}
            </h3>
          )}
          {tile?.viewerSubtitle && (
            <p className="text-sm text-slate-400 text-center">
              {tile.viewerSubtitle}
            </p>
          )}
          <p className="text-xs text-slate-500 text-center mt-1">
            Tap or click to expand and explore. Future versions will load 3D
            models, videos, or 360 tours here.
          </p>
        </div>
        </div>

        {/* THIN FOOTER STRIP – ONLY ON LAST TILE */}
        {isLastTile && (
          <footer className="slate360-footer w-full text-xs text-slate-200">
            <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4 px-6 py-4">
              <nav className="flex items-center gap-6">
                <Link href="/about" className="uppercase tracking-wider">About</Link>
                <Link href="/contact" className="uppercase tracking-wider">Contact</Link>
                <Link href="/subscribe" className="uppercase tracking-wider">Subscribe</Link>
                <Link href="/privacy" className="uppercase tracking-wider">Privacy</Link>
              </nav>
              <p className="text-slate-400">© 2025 Slate360. All rights reserved.</p>
            </div>
          </footer>
        )}
      </div>
    </section>
  );
}
