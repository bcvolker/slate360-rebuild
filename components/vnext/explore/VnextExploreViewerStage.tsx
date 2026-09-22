"use client";

import dynamic from "next/dynamic";
import type { VnextExploreRepresentation, VnextExploreSourceData } from "@/lib/vnext/explore-types";
import type { VnextPlanMarker } from "@/lib/vnext/items/item-types";

const LOADING_FALLBACK = (
  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
    Preparing viewer…
  </div>
);

const RealityViewer = dynamic(() => import("./VnextRealityViewer"), { ssr: false, loading: () => LOADING_FALLBACK });
const PanoViewer = dynamic(() => import("./VnextPanoViewer"), { ssr: false, loading: () => LOADING_FALLBACK });
const PlanViewer = dynamic(() => import("./VnextPlanViewer"), { ssr: false, loading: () => LOADING_FALLBACK });
const ThermalViewer = dynamic(() => import("./VnextThermalViewer"), { ssr: false, loading: () => LOADING_FALLBACK });

/** Dark immersive canvas for Reality/Geometry/360/Thermal (per Slice 4 brief); Plan stays light — it's a document, not an environment. */
const DARK_CANVAS: Record<VnextExploreRepresentation, boolean> = {
  reality: true,
  geometry: true,
  "360": true,
  plan: false,
  thermal: true,
};

export function VnextExploreViewerStage({
  representation,
  data,
  planMarker = null,
}: {
  representation: VnextExploreRepresentation;
  data: VnextExploreSourceData;
  planMarker?: VnextPlanMarker | null;
}) {
  const dark = DARK_CANVAS[representation];

  return (
    <div
      className={`relative h-full w-full ${dark ? "bg-[var(--graphite-canvas)]" : "bg-[var(--vnext-surface)]"}`}
      data-vnext-viewer-stage={representation}
    >
      {data.kind === "reality" || data.kind === "geometry" ? <RealityViewer data={data} /> : null}
      {data.kind === "360" ? <PanoViewer data={data} /> : null}
      {data.kind === "plan" ? <PlanViewer data={data} marker={planMarker} /> : null}
      {data.kind === "thermal" ? <ThermalViewer data={data} /> : null}
    </div>
  );
}
