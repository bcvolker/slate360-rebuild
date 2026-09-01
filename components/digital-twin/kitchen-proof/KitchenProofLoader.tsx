"use client";

import type { ReactElement } from "react";

export function KitchenProofLoader({
  thumbnailUrl,
  geometryLabel,
  geometryProgress,
  navLabel,
  error,
}: {
  thumbnailUrl?: string | null;
  geometryLabel: string;
  geometryProgress: number;
  navLabel: string;
  error: string | null;
}): ReactElement {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--graphite-canvas)]">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
      ) : null}
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-3 px-6 font-mono text-[11px] uppercase tracking-wide text-white/70">
        <p>Loading geometry {Math.round(geometryProgress * 100)}%</p>
        <p className="text-white/40">{geometryLabel}</p>
        <p>Preparing navigation</p>
        <p className="text-white/40">{navLabel}</p>
        {error ? <p className="text-red-300">{error}</p> : null}
      </div>
    </div>
  );
}
