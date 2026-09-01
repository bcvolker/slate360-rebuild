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
        <p className="font-mono text-[11px] uppercase tracking-wide text-white/40">Loading kitchen…</p>
      </div>
    ),
  },
);

export function KitchenProofClient({
  meshUrl,
  splatUrl,
}: {
  meshUrl: string;
  splatUrl: string;
}): ReactElement {
  return <KitchenProofViewer meshUrl={meshUrl} splatUrl={splatUrl} />;
}
