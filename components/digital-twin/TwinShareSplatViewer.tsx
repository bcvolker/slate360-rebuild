"use client";

import { forwardRef } from "react";
import {
  SplatViewerCore,
  type SplatViewerHandle,
  type TwinPickPoint,
} from "@/components/digital-twin/splat-viewer-core";
import type { SplatCameraPose } from "@/components/digital-twin/splat-viewer-constants";
import type { SplatManifest } from "@/lib/digital-twin/twin-manifest";

export type { TwinPickPoint, SplatViewerHandle };

export const TwinShareSplatViewer = forwardRef<
  SplatViewerHandle,
  {
    src: string;
    className?: string;
    pickEnabled?: boolean;
    onPick?: (point: TwinPickPoint) => void;
    cameraMode?: "interior" | "orbit";
    modelVisible?: boolean;
    overlay?: React.ReactNode;
    onCameraModeChange?: (mode: "interior" | "orbit") => void;
    repositionMode?: boolean;
    onManifestChange?: (manifest: SplatManifest | null) => void;
    /** D2: live orbit-camera pose changes, for cross-viewer sync (progression compare). */
    onCameraChange?: (pose: SplatCameraPose) => void;
  }
>(function TwinShareSplatViewer(
  {
    src,
    className,
    pickEnabled = false,
    onPick,
    cameraMode = "orbit",
    modelVisible = true,
    overlay,
    onCameraModeChange,
    repositionMode = false,
    onManifestChange,
    onCameraChange,
  },
  ref,
) {
  return (
    <SplatViewerCore
      ref={ref}
      src={src}
      className={className}
      pickEnabled={pickEnabled}
      onPick={onPick}
      cameraMode={cameraMode}
      modelVisible={modelVisible}
      overlay={overlay}
      onCameraModeChange={onCameraModeChange}
      repositionMode={repositionMode}
      onManifestChange={onManifestChange}
      onCameraChange={onCameraChange}
    />
  );
});
