"use client";

import {
  Footprints,
  Maximize2,
  Minimize2,
  Minus,
  Orbit,
  Plus,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

export type TwinViewerCameraMode = "orbit" | "walk";

type Props = {
  cameraMode: TwinViewerCameraMode;
  walkAvailable: boolean;
  isFullscreen: boolean;
  onToggleCameraMode: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onToggleFullscreen: () => void;
  className?: string;
};

const btnClass =
  "inline-flex size-9 items-center justify-center rounded-lg text-zinc-200 transition-colors hover:bg-white/10 active:bg-white/15 disabled:opacity-40";

export function TwinViewerControlsOverlay({
  cameraMode,
  walkAvailable,
  isFullscreen,
  onToggleCameraMode,
  onZoomIn,
  onZoomOut,
  onRecenter,
  onToggleFullscreen,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-col items-center gap-2",
        className,
      )}
    >
      {cameraMode === "walk" ? (
        <button
          type="button"
          onClick={onToggleCameraMode}
          className={cn(
            twinAccent.button,
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.45)]",
          )}
        >
          <Orbit className="size-3.5" aria-hidden />
          Exit walk
        </button>
      ) : null}

      <div
        className="flex items-center gap-0.5 rounded-2xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        role="toolbar"
        aria-label="3D viewer controls"
      >
        {walkAvailable ? (
          <button
            type="button"
            onClick={onToggleCameraMode}
            className={cn(
              btnClass,
              cameraMode === "walk" ? "bg-white/12 text-white" : "",
            )}
            aria-label={cameraMode === "orbit" ? "Switch to walk mode" : "Switch to orbit mode"}
            title={cameraMode === "orbit" ? "Walk" : "Orbit"}
          >
            {cameraMode === "orbit" ? (
              <Footprints className="size-4" aria-hidden />
            ) : (
              <Orbit className="size-4" aria-hidden />
            )}
          </button>
        ) : null}

        <span className="mx-0.5 h-5 w-px bg-white/10" aria-hidden />

        <button type="button" onClick={onZoomOut} className={btnClass} aria-label="Zoom out" title="Zoom out">
          <Minus className="size-4" aria-hidden />
        </button>
        <button type="button" onClick={onZoomIn} className={btnClass} aria-label="Zoom in" title="Zoom in">
          <Plus className="size-4" aria-hidden />
        </button>

        <span className="mx-0.5 h-5 w-px bg-white/10" aria-hidden />

        <button type="button" onClick={onRecenter} className={btnClass} aria-label="Recenter view" title="Recenter">
          <RotateCcw className="size-4" aria-hidden />
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
    </div>
  );
}
