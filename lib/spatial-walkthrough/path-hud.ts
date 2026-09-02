import { markerScaleFromPitch } from "./marker-scale";
import { reducePathStations, stationsAround } from "./path-stations";
import type { WaypointRecord } from "./types";

/** 3–5 navigable stations, never a full tick strip. */
export const PATH_HUD_MAX = 5;
/** Path OFF is opacity 0. Path ON stays readable. */
export const PATH_HUD_IDLE_OPACITY = 0.72;

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
  return stationsAround(reducePathStations(waypoints, clipId), t, Math.min(limit, PATH_HUD_MAX));
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
