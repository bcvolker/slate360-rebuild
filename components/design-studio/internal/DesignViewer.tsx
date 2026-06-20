"use client";

import { TwinModelViewer } from "@/components/digital-twin/TwinModelViewer";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";

/**
 * The interactive 3D viewer for the Design Studio centerpiece. Reuses
 * TwinModelViewer so it handles Gaussian splats (SplatViewer) AND GLB/GLTF
 * models (model-viewer) with full orbit/zoom/pan controls. Fills its parent.
 */
export function DesignViewer({
  src,
  viewerKind = "model",
  alt = "Design model",
}: {
  src: string;
  viewerKind?: TwinViewerKind;
  alt?: string;
}) {
  return (
    <div className="relative h-full w-full">
      <TwinModelViewer viewerKind={viewerKind} modelUrl={src} modelTitle={alt} />
    </div>
  );
}
