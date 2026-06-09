"use client";

import {
  Maximize2,
  Minimize2,
  Minus,
  Orbit,
  Plus,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

export type TwinViewerCameraMode = "interior" | "orbit";

type Props = {
  cameraMode: TwinViewerCameraMode;
  orbitToggleAvailable: boolean;
  isFullscreen: boolean;
  onToggleCameraMode: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onToggleFullscreen: () => void;
  className?: string;
};

const btnClass =
  "inline-flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-200 transition-colors hover:bg-white/10 active:bg-white/15 disabled:opacity-40";

export function TwinViewerControlsOverlay({
  cameraMode,
  orbitToggleAvailable,
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
      {cameraMode === "orbit" ? (
        <button
          type="button"
          onClick={onToggleCameraMode}
          className={cn(
            twinAccent.button,
            "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.45)]",
          )}
        >
          Exit orbit
        </button>
      ) : null}

      <div
        className="flex items-center gap-1 rounded-2xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        role="toolbar"
        aria-label="3D viewer controls"
      >
        {orbitToggleAvailable ? (
          <button
            type="button"
            onClick={onToggleCameraMode}
            className={cn(
              btnClass,
              cameraMode === "orbit" ? "bg-white/12 text-white" : "",
            )}
            aria-label={cameraMode === "interior" ? "Switch to orbit inspection" : "Return to interior view"}
            title={cameraMode === "interior" ? "Orbit" : "Interior"}
          >
            <Orbit className="size-5" aria-hidden />
          </button>
        ) : null}

        <span className="mx-0.5 h-6 w-px bg-white/10" aria-hidden />

        <button type="button" onClick={onZoomOut} className={btnClass} aria-label="Zoom out" title="Zoom out">
          <Minus className="size-5" aria-hidden />
        </button>
        <button type="button" onClick={onZoomIn} className={btnClass} aria-label="Zoom in" title="Zoom in">
          <Plus className="size-5" aria-hidden />
        </button>

        <span className="mx-0.5 h-6 w-px bg-white/10" aria-hidden />

        <button type="button" onClick={onRecenter} className={btnClass} aria-label="Recenter view" title="Recenter">
          <RotateCcw className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className={btnClass}
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="size-5" aria-hidden />
          ) : (
            <Maximize2 className="size-5" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
