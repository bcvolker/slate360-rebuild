import { markerScaleFromPitch } from "./marker-scale";
import type { WaypointRecord } from "./types";
import { orderedWaypoints } from "./waypoints";

/** Nearest upcoming station plus 2–4 weaker lookahead marks. */
export const PATH_HUD_MAX = 4;
/** Residual route visibility while the viewer is stopped (not hidden). */
export const PATH_HUD_IDLE_OPACITY = 0.18;

export type PathHudNode = {
  waypoint: WaypointRecord;
  rank: number;
  opacity: number;
  scale: number;
};

export function upcomingWaypoints(
  waypoints: WaypointRecord[],
  clipId: string,
  t: number,
  limit = PATH_HUD_MAX,
): WaypointRecord[] {
  return orderedWaypoints(waypoints, clipId)
    .filter((w) => w.isVisible && w.tSeconds > t + 0.35)
    .slice(0, Math.max(1, Math.min(limit, PATH_HUD_MAX)));
}

/**
 * Visual weight from navigation order and pitch. Apparent size is a heuristic,
 * not metric depth or occlusion.
 */
export function pathHudNodes(
  waypoints: WaypointRecord[],
  clipId: string,
  t: number,
  hudOpacity = 1,
  limit = PATH_HUD_MAX,
): PathHudNode[] {
  return upcomingWaypoints(waypoints, clipId, t, limit).map((waypoint, rank) => {
    const falloff = 1 - rank * 0.22;
    const orderScale = 1 - rank * 0.12;
    return {
      waypoint,
      rank,
      opacity: Math.round(Math.max(0.06, hudOpacity * falloff) * 100) / 100,
      scale: Math.round(markerScaleFromPitch(waypoint.pitchDeg) * orderScale * 100) / 100,
    };
  });
}

export function pathHudOpacity(navigating: boolean, idle = PATH_HUD_IDLE_OPACITY): number {
  return navigating ? 1 : idle;
}
