"use client";

import { type RefObject, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";
import type { SplatManifest } from "@/lib/digital-twin/twin-manifest";
import type { SplatViewerHandle, TwinPickPoint } from "./TwinShareSplatViewer";
import type { TwinCameraPose } from "@/lib/digital-twin/twin-cameras";
import { PhotoExplorerMarkers } from "./photo-explorer/PhotoExplorerMarkers";

const TwinShareSplatViewer = dynamic(
  () => import("./TwinShareSplatViewer").then((module) => module.TwinShareSplatViewer),
  { ssr: false },
);
const TwinGlbPhotoExplorer = dynamic(
  () =>
    import("./photo-explorer/TwinGlbPhotoExplorer").then(
      (module) => module.TwinGlbPhotoExplorer,
    ),
  { ssr: false },
);
const TwinModelViewer = dynamic(
  () => import("./TwinModelViewer").then((module) => module.TwinModelViewer),
  { ssr: false },
);

type Props = {
  viewerRef: RefObject<SplatViewerHandle | null>;
  viewerKind: TwinViewerKind;
  modelUrl: string;
  modelTitle: string;
  cameras: TwinCameraPose[];
  layerOn: boolean;
  selectedIndex: number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
  correctionQuaternion?: number[] | null;
  pickEnabled: boolean;
  onPick: (point: TwinPickPoint) => void;
  cameraMode: "interior" | "orbit";
  repositionMode: boolean;
  onCameraModeChange: (mode: "interior" | "orbit") => void;
  onManifestChange: (manifest: SplatManifest | null) => void;
  overlay?: ReactNode;
};

export function TwinShareAnnotateViewerStage({
  viewerRef,
  viewerKind,
  modelUrl,
  modelTitle,
  cameras,
  layerOn,
  selectedIndex,
  onHover,
  onSelect,
  correctionQuaternion,
  pickEnabled,
  onPick,
  cameraMode,
  repositionMode,
  onCameraModeChange,
  onManifestChange,
  overlay,
}: Props) {
  if (viewerKind === "splat") {
    return (
      <TwinShareSplatViewer
        ref={viewerRef}
        src={modelUrl}
        pickEnabled={pickEnabled}
        onPick={onPick}
        cameraMode={cameraMode}
        repositionMode={repositionMode}
        onManifestChange={onManifestChange}
        overlay={
          <>
            {overlay}
            <PhotoExplorerMarkers
              cameras={cameras}
              visible={layerOn}
              correctionQuaternion={correctionQuaternion}
              selectedIndex={selectedIndex}
              onHover={onHover}
              onSelect={onSelect}
            />
          </>
        }
      />
    );
  }

  if (viewerKind === "model" && cameras.length > 0) {
    return (
      <TwinGlbPhotoExplorer
        modelUrl={modelUrl}
        cameras={cameras}
        layerOn={layerOn}
        selectedIndex={selectedIndex}
        onHover={onHover}
        onSelect={onSelect}
      />
    );
  }

  return <TwinModelViewer viewerKind={viewerKind} modelUrl={modelUrl} modelTitle={modelTitle} />;
}
