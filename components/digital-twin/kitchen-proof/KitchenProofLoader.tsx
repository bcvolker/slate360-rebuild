"use client";

import type { ReactElement } from "react";

export function KitchenProofLoader({
  heroUrl,
  geometryReady,
  error,
  onHeroReady,
}: {
  heroUrl?: string | null;
  geometryReady: boolean;
  error: string | null;
  onHeroReady?: () => void;
}): ReactElement | null {
  if (geometryReady && !error) return null;
  return (
    <div className="absolute inset-0 z-10 bg-[var(--graphite-canvas)]" data-testid="kitchen-poster">
      {heroUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onLoad={() => onHeroReady?.()}
        />
      ) : (
        <div className="absolute inset-0 bg-[var(--graphite-canvas)]" data-testid="kitchen-hero-fallback" />
      )}
      {error ? (
        <p className="absolute bottom-6 left-6 font-mono text-[11px] uppercase tracking-wide text-red-300">{error}</p>
      ) : null}
    </div>
  );
}
