"use client";

import {
  Home,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TwinViewerCameraMode = "interior" | "orbit";

type Props = {
  isFullscreen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onToggleFullscreen: () => void;
  className?: string;
};

const btnClass =
  "inline-flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-200 transition-colors hover:bg-white/10 active:bg-white/15";

export function TwinViewerControlsOverlay({
  isFullscreen,
  onZoomIn,
  onZoomOut,
  onRecenter,
  onToggleFullscreen,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-0.5 rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_78%,transparent)] p-1 shadow-[0_6px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl",
        className,
      )}
      role="toolbar"
      aria-label="3D viewer controls"
    >
      <button type="button" onClick={onZoomOut} className={btnClass} aria-label="Zoom out" title="Zoom out">
        <Minus className="size-4" aria-hidden />
      </button>
      <button type="button" onClick={onZoomIn} className={btnClass} aria-label="Zoom in" title="Zoom in">
        <Plus className="size-4" aria-hidden />
      </button>
      <span className="mx-0.5 h-5 w-px bg-white/10" aria-hidden />
      <button
        type="button"
        onClick={onRecenter}
        className={btnClass}
        aria-label="Overview"
        title="Back to overview"
      >
        <Home className="size-4" aria-hidden />
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
