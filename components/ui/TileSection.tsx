import React from "react";

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
 * Strict layout template for homepage tiles.
 *
 * Goals:
 * - All tiles have the same structure and spacing.
 * - Two equal columns on desktop, single column on mobile.
 * - Each tile fills at least one screen and snaps cleanly.
 */
export default function TileSection({ tile, index }: TileSectionProps) {
  const isReversed = index % 2 === 1;

  // Each section is a snap child and fills at least one viewport.
  const sectionClass =
    "home-gradient relative min-h-screen flex items-center justify-center snap-start";

  // Two equal columns, centered, with consistent horizontal padding.
  const gridClass =
    "mx-auto w-full max-w-6xl px-4 md:px-10 lg:px-24 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center";

  // Text column: stacked with consistent gap; alternates left/right via order.
  const textColClass = [
    "flex",
    "flex-col",
    "justify-center",
    "gap-6",
    isReversed ? "md:order-2" : "md:order-1",
  ].join(" ");

  // Viewer column: centers the card; alternates column side via order.
  const viewerColClass = [
    "flex",
    "items-center",
    "justify-center",
    isReversed ? "md:order-1" : "md:order-2",
  ].join(" ");

  return (
    <section
      id={tile.id}
      data-tile-id={tile.id}
      data-snap="tile"
      className={sectionClass}
    >
      <div className={gridClass}>
        {/* TEXT COLUMN */}
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

        {/* VIEWER COLUMN */}
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
