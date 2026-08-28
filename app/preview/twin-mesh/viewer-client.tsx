"use client";

import dynamic from "next/dynamic";
import type { ReactElement } from "react";

import type { FloorInfo, WalkStation } from "@/lib/digital-twin/walkthrough-navigation";
import { identityMeshEpoch, sortEpochsNewestFirst, type TwinEpoch } from "@/lib/digital-twin/twin-epoch";

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

function previewEpochs(meshUrl: string, splatUrl: string | null | undefined, label: string): TwinEpoch[] {
  return sortEpochsNewestFirst([
    identityMeshEpoch({
      id: `${label}-current`,
      capturedAt: "2026-08-27T16:00:00.000Z",
      meshUrl,
      splatUrl,
      isCurrent: true,
    }),
    identityMeshEpoch({
      id: `${label}-aug10`,
      capturedAt: "2026-08-10T16:00:00.000Z",
      meshUrl,
      splatUrl,
    }),
    identityMeshEpoch({
      id: `${label}-jul15`,
      capturedAt: "2026-07-15T16:00:00.000Z",
      meshUrl,
      splatUrl,
    }),
  ]);
}

export function MeshTwinViewerClient({
  meshUrl,
  splatUrl,
  stations,
  floors,
  ceilingCutY,
  label,
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
    return <ViewerFallback message={`No walk stations for "${label}"`} />;
  }
  const kind = meshUrl.includes("dollhouse.ply")
    ? "vertex colour"
    : meshUrl.includes("textured.glb")
      ? "photo atlas"
      : "mesh";
  return (
    <MeshTwinViewer
      meshUrl={meshUrl}
      splatUrl={splatUrl}
      stations={stations}
      floors={floors}
      ceilingCutY={ceilingCutY}
      caption={`${label} · ${kind} · GPU $0 this page`}
      persistKey={`hybrid:${label}`}
      epochs={previewEpochs(meshUrl, splatUrl, label)}
    />
  );
}
