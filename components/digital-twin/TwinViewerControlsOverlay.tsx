"use client";

import { Footprints, Home, Map, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type TwinViewerCameraMode = "interior" | "orbit";

type Props = {
  isFullscreen: boolean;
  cameraMode: TwinViewerCameraMode;
  onRecenter: () => void;
  onToggleCameraMode: () => void;
  onToggleFullscreen: () => void;
  className?: string;
};

const btnClass =
  "inline-flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-200 transition-colors hover:bg-white/10 active:bg-white/15";

export function TwinViewerControlsOverlay({
  isFullscreen,
  cameraMode,
  onRecenter,
  onToggleCameraMode,
  onToggleFullscreen,
  className,
}: Props) {
  const inWalkMode = cameraMode === "interior";

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-0.5 rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_78%,transparent)] p-1 shadow-[0_6px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl",
        className,
      )}
      role="toolbar"
      aria-label="3D viewer controls"
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
      <button
        type="button"
        onClick={onToggleCameraMode}
        className={btnClass}
        aria-label={inWalkMode ? "Switch to overview" : "Switch to walk mode"}
        title={inWalkMode ? "Overview" : "Walk inside"}
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
