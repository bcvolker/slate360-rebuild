"use client";

import type { ReactElement } from "react";

export function KitchenAppearanceStatus({
  loading,
}: {
  loading: boolean;
}): ReactElement | null {
  if (!loading) return null;
  return (
    <p
      data-testid="appearance-loading"
      className="pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2 rounded-xl border border-white/10 bg-black/55 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-white/70"
    >
      Loading appearance
    </p>
  );
}
