"use client";

import { SplatViewerCore, type TwinPickPoint } from "@/components/digital-twin/splat-viewer-core";

export type { TwinPickPoint };

export function TwinShareSplatViewer({
  src,
  className,
  pickEnabled = false,
  onPick,
  cameraMode = "orbit",
  modelVisible = true,
  overlay,
  showResetView = true,
}: {
  src: string;
  className?: string;
  pickEnabled?: boolean;
  onPick?: (point: TwinPickPoint) => void;
  cameraMode?: "orbit" | "walk";
  modelVisible?: boolean;
  overlay?: React.ReactNode;
  showResetView?: boolean;
}) {
  return (
    <SplatViewerCore
      src={src}
      className={className}
      pickEnabled={pickEnabled}
      onPick={onPick}
      cameraMode={cameraMode}
      modelVisible={modelVisible}
      overlay={overlay}
      showResetView={showResetView}
    />
  );
}
