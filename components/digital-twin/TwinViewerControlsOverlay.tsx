"use client";

import { Footprints, Home, Map, Maximize2, Minimize2, Move } from "lucide-react";
import { cn } from "@/lib/utils";

export type TwinViewerCameraMode = "interior" | "orbit";

type Props = {
  isFullscreen: boolean;
  cameraMode: TwinViewerCameraMode;
  onRecenter: () => void;
  onToggleCameraMode: () => void;
  onToggleFullscreen: () => void;
  repositionMode?: boolean;
  onToggleReposition?: () => void;
  className?: string;
};

const glassCluster =
  "flex items-center gap-0.5 rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] p-0.5 shadow-[0_6px_24px_rgba(0,0,0,0.35)] backdrop-blur-md";

const btnClass =
  "inline-flex size-10 items-center justify-center rounded-lg text-zinc-200 transition-colors hover:bg-white/10 active:bg-white/15";

export function TwinViewerControlsOverlay({
  isFullscreen,
  cameraMode,
  onRecenter,
  onToggleCameraMode,
  onToggleFullscreen,
  repositionMode = false,
  onToggleReposition,
  className,
}: Props) {
  const inWalkMode = cameraMode === "interior";

  return (
    <div
      className={cn(glassCluster, className)}
      role="toolbar"
      aria-label="3D viewer controls"
      data-twin-chrome="viewer-controls"
    >
      <button
        type="button"
        onClick={onRecenter}
        className={btnClass}
        aria-label="Home — reset overview"
        title="Home"
      >
        <Home className="size-4" aria-hidden />
      </button>
      {onToggleReposition ? (
        <button
          type="button"
          onClick={onToggleReposition}
          className={cn(
            btnClass,
            repositionMode &&
              "bg-[color-mix(in_srgb,var(--twin360-blue)_28%,transparent)] text-white hover:bg-[color-mix(in_srgb,var(--twin360-blue)_36%,transparent)]",
          )}
          aria-label={repositionMode ? "Done moving — back to orbit" : "Move — drag the model to reposition it"}
          aria-pressed={repositionMode}
          title={repositionMode ? "Moving — drag to reposition" : "Move / reposition"}
        >
          <Move className="size-4" aria-hidden />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onToggleCameraMode}
        className={btnClass}
        aria-label={inWalkMode ? "Switch to orbit overview" : "Switch to walk mode"}
        title={inWalkMode ? "Orbit" : "Walk"}
      >
        {inWalkMode ? <Map className="size-4" aria-hidden /> : <Footprints className="size-4" aria-hidden />}
      </button>
      <button
        type="button"
        onClick={onToggleFullscreen}
        className={btnClass}
        aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? (
          <Minimize2 className="size-4" aria-hidden />
        ) : (
          <Maximize2 className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
