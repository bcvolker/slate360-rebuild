"use client";

import nextDynamic from "next/dynamic";
import type { ReactElement } from "react";

const KitchenProofViewer = nextDynamic(
  () =>
    import("@/components/digital-twin/kitchen-proof/KitchenProofViewer").then((m) => m.KitchenProofViewer),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[var(--graphite-canvas)]" />,
  },
);

export function KitchenProofClient({
  displayUrl,
  navUrl,
  measureUrl,
  appearanceUrl = null,
  thumbnailUrl = null,
  debug,
}: {
  displayUrl: string;
  navUrl: string;
  measureUrl: string;
  appearanceUrl?: string | null;
  thumbnailUrl?: string | null;
  debug: boolean;
}): ReactElement {
  return (
    <KitchenProofViewer
      displayUrl={displayUrl}
      navUrl={navUrl}
      measureUrl={measureUrl}
      appearanceUrl={appearanceUrl}
      thumbnailUrl={thumbnailUrl}
      debug={debug}
    />
  );
}
