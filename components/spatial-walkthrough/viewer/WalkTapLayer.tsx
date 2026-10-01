"use client";

import { tapAdvance } from "@/lib/spatial-experience/tap-advance";
import type { WalkthroughPlayerHandle } from "./WalkthroughPlayer";
import type { WaypointRecord } from "@/lib/spatial-walkthrough/types";

export function WalkTapLayer({
  player,
  waypoints,
  clipId,
  currentT,
  enabled,
}: {
  player: WalkthroughPlayerHandle | null;
  waypoints: WaypointRecord[];
  clipId: string;
  currentT: number;
  enabled: boolean;
}) {
  if (!enabled || !player) return null;
  return (
    <button
      type="button"
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-[4] h-[28%] w-full cursor-pointer bg-transparent"
      aria-label="Advance along recorded path"
      data-testid="sw-tap-advance"
      onClick={(e) => {
        const view = player.getView();
        const local = player.viewerToSphere(e.clientX, e.clientY);
        const result = tapAdvance(
          waypoints.filter((w) => w.clipId === clipId).map((w) => ({ id: w.id, tSeconds: w.tSeconds, yawDeg: w.yawDeg })),
          currentT,
          view.yaw,
          local?.yaw ?? view.yaw,
        );
        if (result.kind === "one") {
          const wp = waypoints.find((w) => w.id === result.anchor.id);
          player.seekTo(result.anchor.tSeconds, wp?.yawDeg ?? view.yaw, view.pitch);
        }
      }}
    />
  );
}
