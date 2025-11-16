import React from "react";

const DEBUG_LAYOUT = true; // Set to false later once you're happy

export type TileConfig = {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle: string;
  bullets: string[];
  ctaLabel?: string;
  ctaHref?: string;
  viewerTitle: string;
  viewerSubtitle: string;
};

interface TileSectionProps {
  tile: TileConfig;
  index: number;
}

/**
 * Homepage tile layout with optional debug markers.
 *
 * - Each tile is a snap-start section inside the main scroll container
 * - Two equal-width columns via CSS Grid on desktop
 * - Vertical midline centered for both text and viewer
 * - DEBUG_LAYOUT shows tile ids + a red horizontal midline + outlines
 */
export default function TileSection({ tile, index }: TileSectionProps) {
  const isReversed = index % 2 === 1;

  const sectionClass =
    "home-gradient snap-start relative min-h-screen flex items-center justify-center py-24";

  const gridClass =
    "mx-auto w-full max-w-6xl px-4 md:px-10 lg:px-24 " +
    "grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center";

  const textColClass = [
    "flex",
    "flex-col",
    "justify-center",
    "gap-6",
    "max-w-xl",
    isReversed ? "md:order-2" : "md:order-1",
    DEBUG_LAYOUT ? "border border-dashed border-yellow-400/80 p-4 rounded-lg" : "",
  ].join(" ");

  const viewerColClass = [
    "flex",
    "items-center",
    "justify-center",
    "max-w-xl",
    isReversed ? "md:order-1" : "md:order-2",
    DEBUG_LAYOUT ? "border border-dashed border-yellow-400/80 p-4 rounded-lg" : "",
  ].join(" ");

  return (
    <section
      id={tile.id}
      data-snap="tile"
      className={sectionClass}
    >
      {/* DEBUG: tile label + red horizontal midline */}
      {DEBUG_LAYOUT && (
        <>
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-red-500/70" />
          <div className="pointer-events-none absolute left-4 top-4 rounded bg-red-700/90 px-2 py-0.5 text-xs font-semibold text-white">
            {tile.id} · index {index}
          </div>
        </>
      )}

      <div className={gridClass}>
        {/* Text column */}
        <div className={textColClass}>
          {tile.eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-400/90">
              {tile.eyebrow}
            </p>
          )}

          <h2 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
            {tile.title}
          </h2>

          <p className="text-base leading-relaxed text-slate-200/95 sm:text-lg">
            {tile.subtitle}
          </p>

          {tile.bullets.length > 0 && (
            <ul className="space-y-2.5 text-sm text-slate-100/95">
              {tile.bullets.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-1.5 inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          )}

          {tile.ctaLabel && tile.ctaHref && (
            <a
              href={tile.ctaHref}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/25 hover:bg-sky-400 hover:shadow-sky-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 transition-all w-fit"
            >
              {tile.ctaLabel}
              <span aria-hidden>→</span>
            </a>
          )}
        </div>

        {/* Viewer column */}
        <div className={viewerColClass}>
          <div className="w-full max-w-xl rounded-3xl border border-slate-700/70 bg-slate-950/90 px-10 py-12 shadow-2xl flex flex-col items-center justify-center text-center min-h-[280px]">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 shadow-lg shadow-sky-500/40">
              <span className="ml-0.5 text-lg text-white">▶</span>
            </div>

            <h3 className="mt-6 text-sm font-semibold text-slate-50 sm:text-base">
              {tile.viewerTitle}
            </h3>

            <p className="mt-2 text-xs text-slate-300">
              {tile.viewerSubtitle}
            </p>

            <p className="mt-4 text-[11px] text-slate-400 hidden sm:block">
              Tap or click to expand and explore. Future versions will load 3D
              models, videos, or 360 tours here.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
