"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WaypointRecord } from "@/lib/spatial-walkthrough/types";
import { indexAtTime, nextWaypoint, prevWaypoint } from "@/lib/spatial-walkthrough/waypoints";
import { timelineMarks, type RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import type { WalkthroughPlayerHandle } from "./WalkthroughPlayer";
import { PrivacyTimeline } from "./PrivacyTimeline";

type Props = {
  waypoints: WaypointRecord[];
  clipId: string;
  currentT: number;
  duration?: number;
  redactions?: RedactionRule[];
  player: WalkthroughPlayerHandle | null;
  extra?: React.ReactNode;
};

export function WalkthroughChrome({
  waypoints,
  clipId,
  currentT,
  duration = 0,
  redactions = [],
  player,
  extra,
}: Props) {
  const idx = indexAtTime(waypoints, clipId, currentT);
  const prev = prevWaypoint(waypoints, clipId, idx);
  const next = nextWaypoint(waypoints, clipId, idx);
  const marks = timelineMarks(redactions, clipId, duration);

  const go = (wp: WaypointRecord | null) => {
    if (!wp || !player) return;
    player.seekTo(wp.tSeconds, wp.yawDeg, wp.pitchDeg);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-14 z-10 px-3 sm:px-4">
      <div className="mb-2">
        <PrivacyTimeline duration={duration} marks={marks} />
      </div>
      <div className="flex items-end justify-between">
        <button
          type="button"
          className="pointer-events-auto inline-flex min-h-11 items-center gap-1 rounded-lg border border-white/10 bg-[color-mix(in_srgb,var(--sw-surface,black)_82%,transparent)] px-3 text-sm text-[var(--sw-text,white)] disabled:opacity-40"
          disabled={!prev}
          onClick={() => go(prev)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Previous
        </button>
        <div className="pointer-events-auto">{extra}</div>
        <button
          type="button"
          className="pointer-events-auto inline-flex min-h-11 items-center gap-1 rounded-lg border border-[color-mix(in_srgb,var(--sw-accent,var(--graphite-primary))_45%,transparent)] bg-[color-mix(in_srgb,var(--sw-surface,black)_82%,transparent)] px-3 text-sm text-[var(--sw-accent,var(--graphite-primary))] disabled:opacity-40"
          disabled={!next}
          onClick={() => go(next)}
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
