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
 * Full-screen tile section with no big inner card.
 * Layout:
 *  - Section is the "tile" (background is the page gradient).
 *  - Inside there is a max-width row: text + viewer.
 *  - Columns alternate left/right per tile.
 *  - Viewer has its own smaller card, text side is clean.
 */
export default function TileSection({ tile, index }: TileSectionProps) {
  const isReversed = index % 2 === 1;

  // TEXT COLUMN: Slightly smaller flex ratio (0.9) so viewer gets more space
  const textColClass = [
    "flex-1",
    "md:flex-[0.9]",
    "flex",
    "flex-col",
    "justify-center",
    "gap-4",
    "md:gap-6",
    isReversed ? "md:order-2 md:pl-6" : "md:order-1 md:pr-6",
  ].join(" ");

  // VIEWER COLUMN: Larger flex ratio (1.1) to make viewer more prominent
  const viewerColClass = [
    "flex-1",
    "md:flex-[1.1]",
    "flex",
    "items-center",
    "justify-center",
    "mt-10",
    "md:mt-0",
    isReversed ? "md:order-1 md:pr-6" : "md:order-2 md:pl-6",
  ].join(" ");

  return (
    // SECTION: snap-start for scroll-snap, scroll-mt-24 + pt-24 to clear fixed header
    <section
      id={tile.id}
      className="min-h-screen scroll-mt-24 pt-24 px-4 pb-20 md:px-10 lg:px-24 flex items-center snap-start"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-stretch md:flex-row md:items-center">
        {/* Text / content column */}
        <div className={textColClass}>
          {/* EYEBROW: Slightly larger with breathing room */}
          {tile.eyebrow && (
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-sky-400/90">
              {tile.eyebrow}
            </p>
          )}
          <h2 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
            {tile.title}
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-slate-200/95 sm:text-lg">
            {tile.subtitle}
          </p>

          <ul className="mt-3 space-y-2.5 text-sm text-slate-100/95">
            {tile.bullets.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-1.5 inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>

          {tile.ctaLabel && tile.ctaHref && (
            <div className="mt-6">
              <a
                href={tile.ctaHref}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/25 hover:bg-sky-400 hover:shadow-sky-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 transition-all"
              >
                {tile.ctaLabel}
                <span aria-hidden>→</span>
              </a>
            </div>
          )}
        </div>

        {/* VIEWER COLUMN: Clear sizing - max-w-md mobile, max-w-2xl desktop */}
        <div className={viewerColClass}>
          <div className="relative w-full max-w-md md:max-w-2xl mx-auto rounded-3xl border border-slate-700/70 bg-slate-950/90 px-8 py-10 shadow-2xl">
            <div className="mb-4 flex justify-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 shadow-lg shadow-sky-500/40">
                <span className="ml-0.5 text-lg text-white">▶</span>
              </div>
            </div>
            <h3 className="text-center text-sm font-semibold text-slate-50 sm:text-base">
              {tile.viewerTitle}
            </h3>
            <p className="mt-1 text-center text-xs text-slate-300">
              {tile.viewerSubtitle}
            </p>
            <p className="mt-3 text-center text-[11px] text-slate-400 hidden sm:block">
              Tap or click to expand and explore. Future versions will load 3D
              models, videos, or 360 tours here.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
