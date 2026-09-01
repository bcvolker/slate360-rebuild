"use client";

import nextDynamic from "next/dynamic";
import type { ReactElement } from "react";

const KitchenProofViewer = nextDynamic(
  () =>
    import("@/components/digital-twin/kitchen-proof/KitchenProofViewer").then((m) => m.KitchenProofViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <p className="font-mono text-[11px] uppercase tracking-wide text-white/40">Loading geometry</p>
      </div>
    ),
  },
);

export function KitchenProofClient({
  displayUrl,
  navUrl,
  measureUrl,
  thumbnailUrl,
  appearanceUrl,
  debug,
}: {
  displayUrl: string;
  navUrl: string;
  measureUrl: string;
  thumbnailUrl: string;
  appearanceUrl: string;
  debug: boolean;
}): ReactElement {
  return (
    <KitchenProofViewer
      displayUrl={displayUrl}
      navUrl={navUrl}
      measureUrl={measureUrl}
      thumbnailUrl={thumbnailUrl}
      appearanceUrl={appearanceUrl}
      debug={debug}
    />
  );
}
