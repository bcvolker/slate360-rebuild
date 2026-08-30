"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import type { WaypointRecord } from "@/lib/spatial-walkthrough/types";
import { indexAtTime, nextWaypoint, prevWaypoint } from "@/lib/spatial-walkthrough/waypoints";
import { timelineMarks, type RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import type { NavMode } from "@/lib/spatial-walkthrough/nav-mode";
import type { WalkthroughPlayerHandle } from "./WalkthroughPlayer";
import { PrivacyTimeline } from "./PrivacyTimeline";
import { NavModeBar } from "./NavModeBar";
import { ShareCurrentView } from "./ShareCurrentView";

type Props = {
  waypoints: WaypointRecord[];
  clipId: string;
  currentT: number;
  duration?: number;
  redactions?: RedactionRule[];
  player: WalkthroughPlayerHandle | null;
  extra?: React.ReactNode;
  onFullscreen?: () => void;
  mode: NavMode;
  onModeChange: (mode: NavMode) => void;
  shareHrefFor: () => string;
  onStation?: () => void;
};

export function WalkthroughChrome({
  waypoints,
  clipId,
  currentT,
  duration = 0,
  redactions = [],
  player,
  extra,
  onFullscreen,
  mode,
  onModeChange,
  shareHrefFor,
  onStation,
}: Props) {
  const inClip = waypoints.filter((w) => w.clipId === clipId);
  const idx = indexAtTime(waypoints, clipId, currentT);
  const prev = prevWaypoint(waypoints, clipId, idx);
  const next = nextWaypoint(waypoints, clipId, idx);
  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentT / duration) * 100)) : 0;
  const marks = timelineMarks(redactions, clipId, duration);

  const go = (wp: WaypointRecord | null) => {
    if (!wp || !player) return;
    onModeChange("explore");
    onStation?.();
    player.seekTo(wp.tSeconds, wp.yawDeg, wp.pitchDeg, { pause: true });
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(prev);
      if (e.key === "ArrowRight") go(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev?.id, next?.id, player]);

  return (
    <div className="sw-chrome" data-nav-mode={mode}>
      <div className="sw-chrome-lead">
        <NavModeBar mode={mode} onChange={onModeChange} />
        <button type="button" className="sw-chrome-btn sw-station-btn" disabled={!prev} onClick={() => go(prev)} aria-label="Previous station">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="sw-timeline">
        <PrivacyTimeline duration={duration} marks={marks} />
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
      <div className="sw-chrome-trail">
        <ShareCurrentView hrefFor={shareHrefFor} />
        <button type="button" className="sw-chrome-btn" onClick={fullscreen} aria-label="Full screen">
          <Maximize2 className="h-4 w-4" />
        </button>
        <button type="button" className="sw-chrome-btn sw-station-btn" disabled={!next} onClick={() => go(next)} aria-label="Next station">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
