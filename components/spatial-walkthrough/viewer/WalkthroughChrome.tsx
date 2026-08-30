"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WaypointRecord } from "@/lib/spatial-walkthrough/types";
import { indexAtTime, nextWaypoint, prevWaypoint } from "@/lib/spatial-walkthrough/waypoints";
import type { WalkthroughPlayerHandle } from "./WalkthroughPlayer";

type Props = {
  waypoints: WaypointRecord[];
  clipId: string;
  currentT: number;
  player: WalkthroughPlayerHandle | null;
  extra?: React.ReactNode;
};

export function WalkthroughChrome({ waypoints, clipId, currentT, player, extra }: Props) {
  const idx = indexAtTime(waypoints, clipId, currentT);
  const prev = prevWaypoint(waypoints, clipId, idx);
  const next = nextWaypoint(waypoints, clipId, idx);

  const go = (wp: WaypointRecord | null) => {
    if (!wp || !player) return;
    player.seekTo(wp.tSeconds, wp.yawDeg, wp.pitchDeg);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-14 z-10 flex items-end justify-between px-3 sm:px-4">
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
  );
}
