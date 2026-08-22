/**
 * Pure navigation maths for the Matterport-style walkthrough viewer (M6).
 *
 * Kept free of React and Three.js so it is unit-testable and so the hook that
 * consumes it stays presentational. The governing rule in every function here:
 * the photoreal imagery only exists at capture stations, so the camera must
 * never come to rest anywhere else.
 */

/** A capture position the operator physically stood at. */
export type WalkStation = {
  id: string;
  /** World-space position, metres, Y-up. */
  position: [number, number, number];
  /** Which floor this station belongs to; 0 is ground. */
  floorIndex: number;
  /** Optional yaw in radians the camera should face on arrival. */
  headingY?: number;
};

export type FloorInfo = {
  index: number;
  /** Human label for the floor selector — "Ground", "Level 2". */
  label: string;
  /** World Y of that floor's plane. */
  elevationY: number;
};

export type ViewMode = "inside" | "dollhouse" | "floorplan";

/** A camera state the viewer interpolates between. */
export type WalkPose = {
  position: [number, number, number];
  yaw: number;
  pitch: number;
};

/** Standing eye height above the floor plane, metres. */
export const EYE_HEIGHT_M = 1.6;
/** Mode and station transitions both take this long. */
export const TRANSITION_MS = 600;
/** A click further than this from any station does nothing. */
export const MAX_CLICK_DISTANCE_M = 4;
/** Looking further up or down than this rolls the horizon out of frame. */
export const MAX_PITCH_RAD = (85 * Math.PI) / 180;

/**
 * Ease-in-out on [0,1], clamped outside it. Used instead of a linear ramp so
 * the camera settles rather than stopping dead at the destination.
 */
export function smoothstep(t: number): number {
  const x = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

/** Clamp pitch to ±85°, so the camera can look up and down but never flip. */
export function clampPitch(pitch: number): number {
  return Math.max(-MAX_PITCH_RAD, Math.min(MAX_PITCH_RAD, pitch));
}

/** Wrap yaw into [-π, π] so repeated dragging never accumulates unbounded. */
export function wrapYaw(yaw: number): number {
  const twoPi = Math.PI * 2;
  const wrapped = ((yaw + Math.PI) % twoPi + twoPi) % twoPi;
  return wrapped - Math.PI;
}

/**
 * Interpolate yaw the short way round. Linear interpolation from 170° to
 * -170° spins 340° through the whole room; this takes the 20° path instead.
 */
export function lerpYaw(from: number, to: number, t: number): number {
  return wrapYaw(from + wrapYaw(to - from) * t);
}

export function distance3(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Nearest station to `point` **on `floorIndex`** and within `maxDistance`.
 *
 * Other floors are excluded rather than distance-ranked: a station directly
 * above the click is physically close but visually somewhere else entirely.
 * Returns null when nothing qualifies — the caller must then do nothing, not
 * fall back to a free-fly position.
 */
export function nearestStation(
  stations: readonly WalkStation[],
  point: readonly [number, number, number],
  maxDistance: number,
  floorIndex: number,
): WalkStation | null {
  let best: WalkStation | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const station of stations) {
    if (station.floorIndex !== floorIndex) continue;
    const d = distance3(station.position, point);
    if (d <= maxDistance && d < bestDistance) {
      best = station;
      bestDistance = d;
    }
  }
  return best;
}

/** Floor elevation + eye height; falls back to the station's own Y when the
 *  floor is unknown, so a station always has somewhere to stand. */
export function eyeHeightFor(
  station: WalkStation,
  floors: readonly FloorInfo[],
): number {
  const floor = floors.find((f) => f.index === station.floorIndex);
  return (floor ? floor.elevationY : station.position[1]) + EYE_HEIGHT_M;
}

/** Axis-aligned bounds of the stations on one floor, or null if there are none. */
export function floorBounds(
  stations: readonly WalkStation[],
  floorIndex: number,
): { min: [number, number, number]; max: [number, number, number] } | null {
  const on = stations.filter((s) => s.floorIndex === floorIndex);
  if (on.length === 0) return null;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const s of on) {
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i], s.position[i]);
      max[i] = Math.max(max[i], s.position[i]);
    }
  }
  return { min, max };
}

/** Pitch used by the pulled-back dollhouse view — looking down at ~35°. */
const DOLLHOUSE_PITCH = (-35 * Math.PI) / 180;

/**
 * The pose a given mode wants, given where the user currently stands.
 *
 * `inside` stands at the station. `dollhouse` pulls back and above, framing
 * the floor's full station spread. `floorplan` goes straight overhead. All
 * three are ordinary poses, so switching mode animates through the same
 * interpolation path as walking — no snapping.
 */
export function poseForMode(
  mode: ViewMode,
  station: WalkStation | null,
  floors: readonly FloorInfo[],
  stations: readonly WalkStation[],
  floorIndex: number,
  currentYaw: number,
): WalkPose | null {
  if (mode === "inside") {
    if (!station) return null;
    return {
      position: [
        station.position[0],
        eyeHeightFor(station, floors),
        station.position[2],
      ],
      yaw: station.headingY ?? currentYaw,
      pitch: 0,
    };
  }

  const bounds = floorBounds(stations, floorIndex);
  if (!bounds) return null;
  const cx = (bounds.min[0] + bounds.max[0]) / 2;
  const cz = (bounds.min[2] + bounds.max[2]) / 2;
  const spread = Math.max(
    bounds.max[0] - bounds.min[0],
    bounds.max[2] - bounds.min[2],
    4,
  );
  const floor = floors.find((f) => f.index === floorIndex);
  const baseY = floor ? floor.elevationY : bounds.min[1];

  if (mode === "floorplan") {
    return { position: [cx, baseY + spread * 1.4, cz], yaw: currentYaw, pitch: -Math.PI / 2 };
  }
  // Dollhouse: back off along the current yaw so the pull-back reads as a
  // continuation of where the user was already facing.
  //
  // The sign matters and is easy to get backwards. A camera at yaw looks along
  // (-sin yaw, 0, -cos yaw), so to end up looking AT the centre it must be
  // placed on the +(sin, cos) side of it. Subtracting instead puts the room
  // behind the camera and frames empty space.
  const back = spread * 0.9;
  return {
    position: [
      cx + Math.sin(currentYaw) * back,
      baseY + spread * 0.75,
      cz + Math.cos(currentYaw) * back,
    ],
    yaw: currentYaw,
    pitch: DOLLHOUSE_PITCH,
  };
}

/**
 * Apply a look-drag to a pose. Grab-the-world: dragging right slides the room
 * right, as if pinned to the finger — the convention Matterport and Street
 * View use. Extracted from the hook so the sign is pinned by a test; it was
 * inverted on both axes and every drag moved the model the wrong way.
 */
export function applyLookDrag(
  pose: WalkPose,
  deltaX: number,
  deltaY: number,
  sensitivity: number,
): WalkPose {
  return {
    position: pose.position,
    yaw: wrapYaw(pose.yaw + deltaX * sensitivity),
    pitch: clampPitch(pose.pitch + deltaY * sensitivity),
  };
}

/**
 * Blend two poses. Position and pitch interpolate linearly; yaw takes the
 * short way round via {@link lerpYaw}.
 */
export function lerpPose(from: WalkPose, to: WalkPose, t: number): WalkPose {
  const e = smoothstep(t);
  return {
    position: [
      from.position[0] + (to.position[0] - from.position[0]) * e,
      from.position[1] + (to.position[1] - from.position[1]) * e,
      from.position[2] + (to.position[2] - from.position[2]) * e,
    ],
    yaw: lerpYaw(from.yaw, to.yaw, e),
    pitch: from.pitch + (to.pitch - from.pitch) * e,
  };
}
