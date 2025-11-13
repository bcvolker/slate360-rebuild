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

export default function TileSection({ tile, index }: TileSectionProps) {
  const isReversed = index % 2 === 1;

  const textColClass = [
    "flex-1",
    "flex",
    "flex-col",
    "justify-center",
    "gap-4",
    "md:gap-6",
    isReversed ? "md:order-2" : "md:order-1",
  ].join(" ");

  const viewerColClass = [
    "flex-1",
    "flex",
    "items-center",
    "justify-center",
    "mt-8",
    "md:mt-0",
    isReversed ? "md:order-1" : "md:order-2",
  ].join(" ");

  return (
    <section
      id={tile.id}
      className="snap-start min-h-screen px-4 py-16 md:px-8 lg:px-12 flex items-center justify-center"
    >
      <div className="relative flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-800/95 via-slate-900/90 to-slate-900/95 shadow-2xl md:flex-row md:items-stretch md:gap-10 p-8 md:p-12">
        {/* Subtle top gradient highlight - more refined */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-sky-500/10 to-transparent" />

        {/* Text / content column */}
        <div className={textColClass}>
          {tile.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400/90">
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

        {/* Viewer column - smaller on mobile, moderate on desktop */}
        <div className={viewerColClass}>
          <div className="relative w-full max-w-xs md:max-w-sm rounded-2xl border border-slate-600/70 bg-slate-950/90 backdrop-blur-sm px-5 py-8 shadow-xl">
            {/* Placeholder "viewer" content */}
            <div className="mb-5 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 shadow-lg shadow-sky-500/30">
                <span className="ml-0.5 text-2xl text-white">▶</span>
              </div>
            </div>
            <h3 className="text-center text-base font-semibold text-slate-50">
              {tile.viewerTitle}
            </h3>
            <p className="mt-2 text-center text-xs text-slate-300/90">
              {tile.viewerSubtitle}
            </p>
            <p className="mt-4 text-center text-[11px] text-slate-400/80 leading-relaxed">
              Tap or click to expand and explore. Future versions will load 3D
              models, videos, or 360 tours here.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
