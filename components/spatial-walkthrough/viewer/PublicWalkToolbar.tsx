"use client";

import { ChevronLeft, ChevronRight, Minus, Pause, Play, Plus } from "lucide-react";
import type { WalkthroughPlayerHandle } from "./WalkthroughPlayer";
import type { WaypointRecord } from "@/lib/spatial-walkthrough/types";
import { indexAtTime, nextWaypoint, prevWaypoint } from "@/lib/spatial-walkthrough/waypoints";

type Props = {
  waypoints: WaypointRecord[];
  clipId: string;
  currentT: number;
  duration: number;
  playing: boolean;
  player: WalkthroughPlayerHandle | null;
  pathVisible: boolean;
  onTogglePath?: () => void;
  onStation?: () => void;
  spaces?: React.ReactNode;
};

function clock(t: number): string {
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
}

export function PublicWalkToolbar({
  waypoints,
  clipId,
  currentT,
  duration,
  playing,
  player,
  pathVisible,
  onTogglePath,
  onStation,
  spaces,
}: Props) {
  const idx = indexAtTime(waypoints, clipId, currentT);
  const prev = prevWaypoint(waypoints, clipId, idx);
  const next = nextWaypoint(waypoints, clipId, idx);
  const go = (wp: WaypointRecord | null) => {
    if (!wp || !player) return;
    onStation?.();
    player.seekTo(wp.tSeconds, wp.yawDeg, wp.pitchDeg, { pause: !playing });
  };

  return (
    <div className="sw-public-bar" data-testid="sw-public-toolbar">
      <button type="button" className="sw-public-play" data-testid="sw-play-pause" aria-label={playing ? "Pause" : "Play"} onClick={() => (playing ? player?.pause() : player?.play())}>
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      <button type="button" className="sw-chrome-btn" disabled={!prev} onClick={() => go(prev)} aria-label="Previous">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" className="sw-chrome-btn" disabled={!next} onClick={() => go(next)} aria-label="Next">
        <ChevronRight className="h-4 w-4" />
      </button>
      <input
        type="range"
        className="sw-timeline-scrub"
        data-testid="sw-timeline-scrub"
        min={0}
        max={Math.max(duration, 0.1)}
        step={0.05}
        value={currentT}
        aria-label="Scrub walkthrough"
        onPointerDown={() => player?.pause()}
        onChange={(e) => player?.seekTo(Number(e.target.value), undefined, undefined, { pause: false })}
      />
      <p className="sw-timeline-readout" data-testid="sw-timeline-time">
        {clock(currentT)} / {clock(duration)}
      </p>
      {onTogglePath ? (
        <button type="button" className="sw-chrome-btn" data-testid="sw-path-toggle" aria-pressed={pathVisible} onClick={onTogglePath}>
          Path
        </button>
      ) : null}
      {spaces}
      <button type="button" className="sw-chrome-btn" aria-label="Zoom out" onClick={() => player?.zoomBy?.(-8)}>
        <Minus className="h-4 w-4" />
      </button>
      <button type="button" className="sw-chrome-btn" aria-label="Zoom in" onClick={() => player?.zoomBy?.(8)}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
