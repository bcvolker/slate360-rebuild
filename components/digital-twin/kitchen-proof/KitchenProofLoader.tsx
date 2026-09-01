"use client";

import type { ReactElement } from "react";

export function KitchenProofLoader({
  thumbnailUrl,
  geometryReady,
  error,
}: {
  thumbnailUrl?: string | null;
  geometryReady: boolean;
  error: string | null;
}): ReactElement | null {
  if (geometryReady && !error) return null;
  return (
    <div className="absolute inset-0 z-10 bg-[var(--graphite-canvas)]" data-testid="kitchen-poster">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      ) : null}
      {error ? (
        <p className="absolute bottom-6 left-6 font-mono text-[11px] uppercase tracking-wide text-red-300">{error}</p>
      ) : null}
    </div>
  );
}
