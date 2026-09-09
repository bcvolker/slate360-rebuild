"use client";

/**
 * Share-link host for the Matterport-style walkthrough viewer.
 *
 * Used when a shared splat carries a `.walk.json` sidecar (capture stations +
 * floors). The splat is the look layer; there is no LiDAR mesh, so measuring
 * and pins are unavailable and click-to-walk lands on the invisible floor
 * plane at the sidecar's floor elevation.
 */

import dynamic from "next/dynamic";
import type { ReactElement } from "react";

import type { TwinWalkSidecar } from "@/lib/digital-twin/share-walk-types";

const MeshTwinViewer = dynamic(
  () => import("@/components/digital-twin/MeshTwinViewer").then((m) => m.MeshTwinViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[var(--graphite-canvas)]">
        <p className="font-mono text-[11px] uppercase tracking-wide text-white/40">Loading viewer…</p>
      </div>
    ),
  },
);

export function TwinShareWalkthrough({
  shareToken,
  modelId,
  walk,
}: {
  shareToken: string;
  modelId?: string | null;
  walk: TwinWalkSidecar;
}): ReactElement {
  return (
    <div className="absolute inset-0" data-app="twin360">
      <MeshTwinViewer
        meshUrl={null}
        splatUrl={`/api/share/twin/${shareToken}/splat`}
        stations={walk.stations}
        floors={walk.floors}
        ceilingCutY={walk.ceilingCutY ?? null}
        initialMode="inside"
        caption="Tap a floor ring to walk there · drag to look · ↑↓ step · scroll to zoom"
        persistKey={`share:${shareToken}`}
        modelId={modelId ?? null}
        chrome="share"
      />
    </div>
  );
}
