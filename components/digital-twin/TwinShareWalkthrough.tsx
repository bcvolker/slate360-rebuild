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
import { useState, type ReactElement } from "react";

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

/** Phones and low-memory devices get the thinned SH0 derivative when one exists. */
function wantsMobileSplat(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory < 4;
  const handheld = /iPhone|iPad|iPod|Android/i.test(nav.userAgent);
  return lowMemory || handheld;
}

export function TwinShareWalkthrough({
  shareToken,
  modelId,
  walk,
  hasGeometry = false,
}: {
  shareToken: string;
  modelId?: string | null;
  walk: TwinWalkSidecar;
  hasGeometry?: boolean;
}): ReactElement {
  const [variant] = useState(() => (wantsMobileSplat() ? "?variant=mobile" : ""));
  return (
    <div className="absolute inset-0" data-app="twin360">
      <MeshTwinViewer
        meshUrl={hasGeometry ? `/api/share/twin/${shareToken}/geometry.glb` : null}
        splatUrl={`/api/share/twin/${shareToken}/splat${variant}`}
        stations={walk.stations}
        floors={walk.floors}
        ceilingCutY={walk.ceilingCutY ?? null}
        initialMode="inside"
        caption="Tap the floor to walk there · drag to look · ↑↓ step 0.5 m · ⇧↑ next station · scroll to zoom"
        persistKey={`share:${shareToken}`}
        modelId={modelId ?? null}
        chrome="share"
      />
    </div>
  );
}
