"use client";

import type { ReactElement } from "react";

export function KitchenProofLoader({
  thumbnailUrl,
  geometryLabel,
  geometryProgress,
  navLabel,
  error,
}: {
  thumbnailUrl: string | null;
  geometryLabel: string;
  geometryProgress: number;
  navLabel: string;
  error: string | null;
}): ReactElement {
  return (
    <div className="pointer-events-none absolute inset-0 z-30" data-testid="twin-loader">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          data-testid="first-useful-pixel"
          className="absolute inset-0 h-full w-full object-cover opacity-80"
          onLoad={() => performance.mark("twin-first-useful")}
        />
      ) : null}
      <div className="absolute inset-x-0 bottom-24 flex justify-center px-6">
        <div className="w-full max-w-sm rounded-xl border border-white/10 bg-black/55 px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-white/70">
          <p>Loading geometry {Math.round(geometryProgress * 100)}%</p>
          <p className="text-white/40">{geometryLabel}</p>
          <p>Preparing navigation</p>
          <p className="text-white/40">{navLabel}</p>
          {error ? <p className="text-red-300">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
