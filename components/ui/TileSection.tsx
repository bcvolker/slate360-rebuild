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
    "relative", "h-screen", "home-gradient", "snap-start", "debug-section",
    "tile-section-container" // This is our new, unique class
  ].join(" ");

  // This is the NEW, CLEAN gridClass
  const gridClass =
    "mx-auto w-full max-w-7xl px-4 md:px-10 lg:px-24 " +
    "grid grid-cols-1 md:grid-cols-2 md:gap-12 items-center " +
    "pt-20 " + // This is our padding-top (80px, same as var(--navbar-height))
    (isLastTile ? "pb-20" : "pb-8"); // This adds 80px padding for the footer, and 32px for all other tiles

  const textColClass = [
    "flex flex-col justify-center gap-4 p-10",
    "max-w-3xl", "bg-slate-800/40 rounded-lg", "debug-content",
    isReversed ? "md:order-2 md:pl-6" : "md:order-1 md:pr-6",
  ].join(" ");

  const viewerColClass = [
    "flex flex-col items-center justify-center gap-2 p-10",
    "aspect-[4/3] rounded-xl", "bg-slate-950/90 border border-slate-800/70 shadow-2xl",
    "debug-viewer",
    isReversed ? "md:order-1 md:pr-6" : "md:order-2 md:pl-6",
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
