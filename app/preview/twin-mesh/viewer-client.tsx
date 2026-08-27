"use client";

import dynamic from "next/dynamic";
import type { ReactElement } from "react";

import type { FloorInfo, WalkStation } from "@/lib/digital-twin/walkthrough-navigation";

// Three.js and the GLTF loader must not run during SSR.
const MeshTwinViewer = dynamic(
  () => import("@/components/digital-twin/MeshTwinViewer").then((m) => m.MeshTwinViewer),
  { ssr: false, loading: () => <ViewerFallback message="Loading mesh…" /> },
);

function ViewerFallback({ message }: { message: string }): ReactElement {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
      <p className="font-mono text-[11px] uppercase tracking-wide text-white/40">{message}</p>
    </div>
  );
}

export function MeshTwinViewerClient({
  meshUrl,
  splatUrl,
  stations,
  floors,
  ceilingCutY,
  label,
  splatSource,
}: {
  meshUrl: string;
  splatUrl?: string | null;
  stations: WalkStation[];
  floors: FloorInfo[];
  ceilingCutY?: number | null;
  label: string;
  splatSource?: string | null;
}): ReactElement {
  if (stations.length === 0) {
    // Say so rather than rendering a viewer whose click-to-move silently does
    // nothing — an empty station list is a pipeline problem, not a UI state.
    return <ViewerFallback message={`No walk stations for "${label}"`} />;
  }
  const splatNote = splatSource
    ? splatSource === "sample"
      ? " · public sample splat (not this room)"
      : ` · splat ${splatSource}`
    : " · mesh only";
  return (
    <MeshTwinViewer
      meshUrl={meshUrl}
      splatUrl={splatUrl}
      stations={stations}
      floors={floors}
      ceilingCutY={ceilingCutY}
      caption={`${label}${splatNote} · GPU $0 this page · splat is look-only, mesh is measure`}
    />
  );
}
