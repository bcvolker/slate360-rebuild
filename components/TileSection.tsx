"use client";

import { useState, ReactNode } from "react";

type TileSectionProps = {
  id: string;
  title: string;
  subtitle?: string;
  // Optional gradient classes for background
  gradient?: string;
  // Left/right column content (e.g., text + viewer)
  left?: ReactNode;
  right?: ReactNode;
};

export default function TileSection({
  id,
  title,
  subtitle,
  gradient = "from-slate-900 via-slate-900 to-slate-800",
  left,
  right,
}: TileSectionProps) {
  const [showMobileViewer, setShowMobileViewer] = useState(false);

  return (
    <section id={id} className="section-min snap-start relative" aria-label={title}>
      <div className={`absolute inset-0 bg-gradient-to-b ${gradient}`} aria-hidden="true" />
      <div className="relative mx-auto grid h-full max-w-7xl grid-cols-1 items-stretch gap-8 px-4 py-10 sm:px-6 md:grid-cols-2">
        {/* Text / Left */}
        <div className="flex flex-col justify-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-3 max-w-prose text-base text-gray-300">{subtitle}</p> : null}

          {/* Mobile viewer toggle */}
          <div className="mt-6 md:hidden">
            <button
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur hover:bg-white/15"
              onClick={() => setShowMobileViewer((v) => !v)}
            >
              {showMobileViewer ? "Hide Viewer" : "Open Viewer"}
            </button>
            {showMobileViewer && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                <div className="aspect-video w-full rounded-xl bg-gradient-to-br from-sky-400/20 via-blue-300/10 to-cyan-300/20 ring-1 ring-inset ring-white/10 shadow-lg" />
              </div>
            )}
          </div>
        </div>

        {/* Viewer / Right (hidden on mobile, always visible md+) */}
        <div className="hidden md:flex items-center">
          <div className="w-full rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="aspect-video w-full rounded-xl bg-gradient-to-br from-sky-400/20 via-blue-300/10 to-cyan-300/20 ring-1 ring-inset ring-white/10 shadow-xl" />
          </div>
        </div>
      </div>

      {/* Decorative top fade to emphasize tile boundaries */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/30 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/30 to-transparent" />
    </section>
  );
}
