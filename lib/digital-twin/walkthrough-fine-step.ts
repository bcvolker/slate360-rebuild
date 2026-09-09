/**
 * Fine movement for the walkthrough viewer: half-metre keyboard steps and
 * exact click landings inside a corridor around the walked path.
 *
 * Companion to walkthrough-navigation.ts (kept separate for the file-size
 * guard). Same rule applies: the viewer may only stand where the operator's
 * camera passed close by, because that is where the splat has detail.
 */

import {
  MAX_CLICK_DISTANCE_M,
  nearestStation,
  type WalkStation,
} from "./walkthrough-navigation";

/** Distance one fine keyboard step moves the viewer. */
export const FINE_STEP_M = 0.5;
/**
 * How far from the nearest station the viewer may stand. A splat renders well
 * anywhere the operator's camera passed close by; further out the imagery thins
 * into haze, so free movement is confined to a corridor around the walked path.
 */
export const MAX_OFF_STATION_M = 1.0;

/** Horizontal distance from the point to the nearest station on that floor. */
export function offStationDistance(
  stations: readonly WalkStation[],
  point: readonly [number, number, number],
  floorIndex: number,
): number {
  let best = Number.POSITIVE_INFINITY;
  for (const station of stations) {
    if (station.floorIndex !== floorIndex) continue;
    const d = Math.hypot(station.position[0] - point[0], station.position[2] - point[2]);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Where a fine step lands: FINE_STEP_M along the look direction (or its
 * reverse), keeping the current height. Null when that point would leave the
 * corridor around the walked path — the caller should fall back to a station
 * jump rather than walk into haze.
 */
export function fineStepTarget(
  stations: readonly WalkStation[],
  position: readonly [number, number, number],
  yaw: number,
  direction: 1 | -1,
  floorIndex: number,
): [number, number, number] | null {
  const next: [number, number, number] = [
    position[0] - Math.sin(yaw) * FINE_STEP_M * direction,
    position[1],
    position[2] - Math.cos(yaw) * FINE_STEP_M * direction,
  ];
  return offStationDistance(stations, next, floorIndex) <= MAX_OFF_STATION_M ? next : null;
}

/**
 * Where a floor click lands. Inside the corridor the viewer walks to the exact
 * point clicked (precise, small moves); outside it, to the nearest station
 * within MAX_CLICK_DISTANCE_M; null when nothing is close enough.
 */
export function clickLanding(
  stations: readonly WalkStation[],
  hit: readonly [number, number, number],
  floorIndex: number,
): { point: [number, number, number]; station: WalkStation } | null {
  const station = nearestStation(stations, hit, MAX_CLICK_DISTANCE_M, floorIndex);
  if (!station) return null;
  const exact = offStationDistance(stations, hit, floorIndex) <= MAX_OFF_STATION_M;
  return { point: exact ? [hit[0], hit[1], hit[2]] : [...station.position], station };
}
