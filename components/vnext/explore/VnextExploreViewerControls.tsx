"use client";

import { Maximize, Minimize, Play, X } from "lucide-react";

type Props = {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  present: boolean;
  onTogglePresent: () => void;
};

/** Floating controls over the viewer stage — kept minimal so they never crowd small viewports. */
export function VnextExploreViewerControls({ isFullscreen, onToggleFullscreen, present, onTogglePresent }: Props) {
  return (
    <div className="absolute right-3 top-3 z-10 flex gap-1.5">
      <button
        type="button"
        onClick={onTogglePresent}
        aria-pressed={present}
        data-vnext-present-toggle="true"
        className="flex h-11 min-w-[44px] items-center gap-1.5 border border-white/15 bg-black/40 px-3 text-xs font-medium text-white backdrop-blur"
      >
        {present ? <X className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
        {present ? "Exit presentation" : "Present"}
      </button>
      <button
        type="button"
        onClick={onToggleFullscreen}
        aria-pressed={isFullscreen}
        data-vnext-fullscreen-toggle="true"
        className="flex h-11 w-11 items-center justify-center border border-white/15 bg-black/40 text-white backdrop-blur"
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? <Minimize className="h-4 w-4" aria-hidden /> : <Maximize className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}
