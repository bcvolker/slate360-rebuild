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

  // This is the NEW, CLEAN sectionClass
  const sectionClass = [
    "relative", "snap-start", "home-gradient", "debug-section",
    "flex min-h-screen items-start py-10 px-4 sm:px-8 lg:px-16 lg:items-center",
    "tile-section-container"
  ].join(" ");

  // This is the NEW, CLEAN gridClass
  const gridClass =
    "tile-grid mx-auto w-full max-w-6xl " +
    "grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 " +
    (isLastTile ? "pb-40 md:pb-20" : "");

  const textColClass = [
    "flex flex-col justify-start lg:justify-center gap-4 px-6 py-8 sm:px-10 sm:py-12",
    "max-w-3xl bg-slate-800/40 rounded-lg debug-content",
    isReversed ? "lg:order-2" : "lg:order-1",
  ].join(" ");

  const viewerColClass = [
    "flex flex-col items-center justify-center gap-2 p-6 sm:p-8 lg:p-10",
    "h-52 sm:h-60 lg:h-80 rounded-xl",
    "bg-slate-950/90 border border-slate-800/70 shadow-2xl debug-viewer",
    isReversed ? "lg:order-1" : "lg:order-2",
  ].join(" ");

  return (
    <section id={tile?.id} data-snap="tile" className={sectionClass}>
      <div className={gridClass}>
        {/* TEXT / CONTENT BOX */}
        <div className={textColClass}>
          {tile?.eyebrow && (
            <p className="text-sm uppercase text-blue-400">{tile.eyebrow}</p>
          )}
          {tile?.title && (
            <h2 className="text-3xl font-bold text-white">{tile.title}</h2>
          )}
          {tile?.subtitle && (
            <p className="text-lg text-slate-300">{tile.subtitle}</p>
          )}
          {bullets.length > 0 && (
            <ul className="space-y-2 text-slate-300">
              {bullets.map((item: string) => (
                <li key={item} className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
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
        <footer className="absolute bottom-0 left-0 right-0 h-16 border-t border-slate-800/70 bg-slate-950/90 backdrop-blur-md text-slate-400">
          <div className="mx-auto flex h-full max-w-7xl items-center px-6 text-xs lg:px-8 flex-wrap gap-4">
            <Link href="/about" className="hover:text-slate-200 transition-colors">About</Link>
            <Link href="/contact" className="hover:text-slate-200 transition-colors">Contact</Link>
            <Link href="/subscribe" className="hover:text-slate-200 transition-colors">Subscribe</Link>
            <Link href="/privacy" className="hover:text-slate-200 transition-colors">Privacy</Link>
            <span className="ml-auto text-[10px] sm:text-xs">© 2025 Slate360. All rights reserved.</span>
          </div>
        </footer>
      )}
    </section>
  );
}
