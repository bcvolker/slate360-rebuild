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
      className="snap-start min-h-[calc(100vh-5rem)] px-4 py-12 md:px-8 lg:px-12 flex items-stretch justify-center"
    >
      <div className="relative flex w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/70 to-slate-800 shadow-2xl md:flex-row md:items-stretch md:gap-10 p-6 md:p-10">
        {/* Subtle top gradient highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-500/20 to-transparent" />

        {/* Text / content column */}
        <div className={textColClass}>
          {tile.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              {tile.eyebrow}
            </p>
          )}
          <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
            {tile.title}
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-slate-200/90 sm:text-base">
            {tile.subtitle}
          </p>

          <ul className="mt-2 space-y-2 text-sm text-slate-100/95">
            {tile.bullets.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {tile.ctaLabel && tile.ctaHref && (
            <div className="mt-4">
              <a
                href={tile.ctaHref}
                className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                {tile.ctaLabel}
                <span aria-hidden>→</span>
              </a>
            </div>
          )}
        </div>

        {/* Viewer column (desktop: side; mobile: below text, smaller) */}
        <div className={viewerColClass}>
          <div className="relative w-full max-w-md rounded-3xl border border-slate-700/80 bg-slate-950/80 px-4 py-6 shadow-xl sm:px-6">
            {/* Placeholder "viewer" content – this will later host real 3D/video/360 components */}
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 shadow-lg shadow-sky-500/40">
                <span className="ml-0.5 text-xl text-white">▶</span>
              </div>
            </div>
            <h3 className="text-center text-base font-semibold text-slate-50">
              {tile.viewerTitle}
            </h3>
            <p className="mt-1 text-center text-xs text-slate-300">
              {tile.viewerSubtitle}
            </p>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              Tap or click to expand and explore. Future versions will load 3D
              models, videos, or 360 tours here.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
