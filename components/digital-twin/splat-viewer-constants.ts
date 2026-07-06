import { useEffect, useState } from "react";

export type TwinPickPoint = { x: number; y: number; z: number };
export type CameraMode = "interior" | "orbit";
export type SplatViewerHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: () => void;
};

// Hard splat caps — enforced by a deterministic post-load downsample (see
// buildDownsampleIndices below), since Spark's own `maxSplats` option is only an
// initial allocation hint and grows to fit the actual file, not a real ceiling.
export const MOBILE_MAX_SPLATS = 150_000;
export const DESKTOP_MAX_SPLATS = 500_000;

export function useMobileSplatBudget(): number {
  const [maxSplats, setMaxSplats] = useState(DESKTOP_MAX_SPLATS);

  useEffect(() => {
    const coarse = window.matchMedia("(max-width: 768px)").matches;
    const fine = window.matchMedia("(pointer: coarse)").matches;
    setMaxSplats(coarse || fine ? MOBILE_MAX_SPLATS : DESKTOP_MAX_SPLATS);
  }, []);

  return maxSplats;
}

/**
 * Deterministic, evenly-strided index set for downsampling a splat cloud from
 * `totalSplats` down to `cap`. Same inputs always produce the same indices (no
 * RNG), and sampling is spread across the whole cloud rather than truncating to
 * the first `cap` splats, which would bias toward whatever the exporter wrote first.
 */
export function buildDownsampleIndices(totalSplats: number, cap: number): Uint32Array {
  const indices = new Uint32Array(cap);
  const step = totalSplats / cap;
  for (let i = 0; i < cap; i++) {
    indices[i] = Math.min(totalSplats - 1, Math.floor(i * step));
  }
  return indices;
}

// D1 load-progress watchdog: error only on STALL (no bytes for this long), never on
// total duration — a large-but-healthy transfer must be allowed to keep going.
export const LOAD_STALL_TIMEOUT_MS = 30_000;
// Once 100% of bytes are in, remaining time is on-device decode (no further byte
// progress to watch) — a separate, more generous grace period covers that phase.
export const LOAD_DECODE_TIMEOUT_MS = 60_000;

export const LOOK_SENSITIVITY = 0.0022;
export const ZOOM_WHEEL_FACTOR = 1.05;
export const INTERIOR_MIN_ZOOM = 0.65;
export const INTERIOR_MAX_ZOOM = 1.75;
export const TAP_DRAG_THRESHOLD_PX = 8;
export const DOUBLE_TAP_MS = 320;
export const ORBIT_DAMPING = 0.06;
export const ORBIT_ROTATE_SPEED = 0.9;
export const ORBIT_ZOOM_SPEED = 0.85;
export const ORBIT_PAN_SPEED = 0.75;
export const VIEWER_DISCOVERY_HINT_MS = 5000;

// V3: shown as the Walk toggle's disabled reason when the manifest reports no
// confident floor (up_axis === "UNKNOWN") — degrade honestly instead of
// silently doing nothing.
export const WALK_DISABLED_NO_FLOOR_REASON = "Walk needs a detected floor — orbit available";
