"use client";

import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import type { WaypointRecord } from "@/lib/spatial-walkthrough/types";
import { indexAtTime, nextWaypoint, prevWaypoint } from "@/lib/spatial-walkthrough/waypoints";
import type { WalkthroughPlayerHandle } from "./WalkthroughPlayer";

type Props = {
  waypoints: WaypointRecord[];
  clipId: string;
  currentT: number;
  duration?: number;
  player: WalkthroughPlayerHandle | null;
  extra?: React.ReactNode;
  onFullscreen?: () => void;
};

export function WalkthroughChrome({
  waypoints,
  clipId,
  currentT,
  duration = 0,
  player,
  extra,
  onFullscreen,
}: Props) {
  const inClip = waypoints.filter((w) => w.clipId === clipId);
  const idx = indexAtTime(waypoints, clipId, currentT);
  const prev = prevWaypoint(waypoints, clipId, idx);
  const next = nextWaypoint(waypoints, clipId, idx);
  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentT / duration) * 100)) : 0;

  const go = (wp: WaypointRecord | null) => {
    if (!wp || !player) return;
    player.seekTo(wp.tSeconds, wp.yawDeg, wp.pitchDeg);
  };

  const fullscreen = () => {
    if (onFullscreen) {
      onFullscreen();
      return;
    }
    const el = document.querySelector(".sw-frame");
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen();
  };

  return (
    <div className="sw-chrome">
      <button type="button" className="sw-chrome-btn" disabled={!prev} onClick={() => go(prev)}>
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Prev
      </button>
      <div className="sw-timeline">
        <div className="sw-timeline-track" aria-hidden>
          <div className="sw-timeline-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="sw-timeline-ticks">
          {inClip.map((wp, i) => (
            <button
              key={wp.id}
              type="button"
              className="sw-timeline-tick"
              data-active={i === idx}
              onClick={() => go(wp)}
            >
              {String(i + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
        {extra}
      </div>
      <div className="flex gap-1">
        <button type="button" className="sw-chrome-btn" onClick={fullscreen} aria-label="Full screen">
          <Maximize2 className="h-4 w-4" />
        </button>
        <button type="button" className="sw-chrome-btn" data-accent="true" disabled={!next} onClick={() => go(next)}>
          Next
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
