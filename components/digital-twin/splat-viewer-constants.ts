import { useEffect, useState } from "react";

import { DESKTOP_LOD_SPLAT_COUNT, MOBILE_LOD_SPLAT_COUNT } from "@/lib/digital-twin/spark-appearance-load";

export type TwinPickPoint = { x: number; y: number; z: number };
export type CameraMode = "interior" | "orbit";
/** D2: orbit camera + target, used for cross-viewer sync (progression compare). */
export type SplatCameraPose = {
  position: [number, number, number];
  target: [number, number, number];
};
export type SplatViewerHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: () => void;
  /** D2: current orbit camera pose, or null when no OrbitControls is mounted
   * (e.g. interior/walk mode). Read-only snapshot — does not subscribe. */
  getCameraPose: () => SplatCameraPose | null;
  /** D2: imperatively move this viewer's camera to match another viewer's pose.
   * A no-op outside orbit mode. Does not itself trigger onCameraChange on this
   * viewer (echo-suppressed), so two viewers can drive each other without a
   * feedback loop. */
  setCameraPose: (pose: SplatCameraPose) => void;
};

/** Spark-native LOD targets. Not a destructive PackedSplats rebuild. */
export const MOBILE_MAX_SPLATS = MOBILE_LOD_SPLAT_COUNT;
export const DESKTOP_MAX_SPLATS = DESKTOP_LOD_SPLAT_COUNT;

export function useSparkLodSplatCount(): number {
  const [count, setCount] = useState(DESKTOP_LOD_SPLAT_COUNT);

  useEffect(() => {
    const coarse = window.matchMedia("(max-width: 768px)").matches;
    const fine = window.matchMedia("(pointer: coarse)").matches;
    setCount(coarse || fine ? MOBILE_LOD_SPLAT_COUNT : DESKTOP_LOD_SPLAT_COUNT);
  }, []);

  return count;
}

/** @deprecated Use useSparkLodSplatCount — this is an LOD budget, not a hard cap. */
export function useMobileSplatBudget(): number {
  return useSparkLodSplatCount();
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
