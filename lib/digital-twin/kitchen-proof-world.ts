/**
 * Kitchen visual-proof world: metric TSDF is S360_WORLD identity.
 * Brush B stays in native X4 coordinates. EXACT_FRAME_SIM3 is the Spark
 * splat object/world transform — it is not baked into Gaussian means.
 * Spark Rx(π) is NOT applied; SIM3 already lands on ARKit Y-up.
 */
import { sim3FromRowMajor4, type Sim3 } from "./s360-world";
import { BRUSH_B_PRIMITIVE_COUNT } from "./spark-appearance-load";
import type { FloorInfo, WalkStation } from "./walkthrough-navigation";

/** Locked exact-frame SIM3. P_arkit = scale * R @ P_x4 + t. Never recomputed. */
export const EXACT_FRAME_SIM3_SCALE = 0.6300199669353641;

export const EXACT_FRAME_T_X4_TO_ARKIT = [
  [-0.5514738399579077, -0.07556614821619709, 0.29511272392610444, 1.7746585458241406],
  [0.08226644891394562, -0.6245950038221509, -0.0062025253513112505, 0.0318557059591983],
  [0.29331551947076806, 0.03310584814518766, 0.5565924609563254, -2.4350940320597885],
  [0.0, 0.0, 0.0, 1.0],
] as const;

export function exactFrameSim3(): Sim3 {
  // T already contains sR | t. Scale is 1 so applySim3 / three.js do not double-scale.
  return sim3FromRowMajor4(EXACT_FRAME_T_X4_TO_ARKIT, 1);
}

export const KITCHEN_PROOF_JOB = "79a4f0ac-32e9-4358-bda0-e1a7461510e1";
export const KITCHEN_STATION_THUMB = `/preview/twin-metric/asset?job=${KITCHEN_PROOF_JOB}&kind=thumbnail.png`;

/** Native-coordinate Brush B web asset. Baked ARKit SPZ is research-only. */
export const KITCHEN_APPEARANCE_AVAILABLE = true;
export const KITCHEN_APPEARANCE_KIND = "appearance-web.spz";
export const KITCHEN_APPEARANCE_RESEARCH_KIND = "brush_x4_arkit.spz";
export const KITCHEN_SPLAT_MAX = BRUSH_B_PRIMITIVE_COUNT;
/** Column-major EXACT_FRAME_SIM3. Applied as the Spark splat object transform. */
export const KITCHEN_SPLAT_WORLD_MATRIX = exactFrameSim3().matrix;
export const KITCHEN_DEFAULT_STATION = "hero";
/** Stall without bytes before we surface a loading warning. Not a hard fail. */
export const KITCHEN_APPEARANCE_STALL_MS = 8_000;
/** @deprecated wall-clock fail is no longer the primary Reality rule */
export const KITCHEN_APPEARANCE_TIMEOUT_MS = KITCHEN_APPEARANCE_STALL_MS;
export const KITCHEN_IDLE_MS = 2500;

/** Floor plane from the metric job QA (Y-up, metres). */
export const KITCHEN_FLOOR_Y = -1.5951639883678779;
export const KITCHEN_CEILING_CUT_Y = 1.1;
export const KITCHEN_HUMAN_FOV = 70;
export const KITCHEN_EYE_HEIGHT_M = 1.6;

export const KITCHEN_FLOORS: FloorInfo[] = [
  { index: 0, label: "Ground", elevationY: KITCHEN_FLOOR_Y },
];

/**
 * Human-eye stations in S360_WORLD. Y is floor; the nav hook adds eye height.
 * Hero is the first frame: fridge + cabinetry + counter + doorway, off the walls.
 */
export const KITCHEN_STATIONS: WalkStation[] = [
  { id: "hero", position: [1.96, KITCHEN_FLOOR_Y, -2.18], floorIndex: 0, headingY: 0.26, thumbUrl: KITCHEN_STATION_THUMB },
  { id: "human", position: [2.05, KITCHEN_FLOOR_Y, -1.82], floorIndex: 0, headingY: 0.28, thumbUrl: KITCHEN_STATION_THUMB },
  { id: "fridge", position: [0.72, KITCHEN_FLOOR_Y, -1.7], floorIndex: 0, headingY: -0.85, thumbUrl: KITCHEN_STATION_THUMB },
  { id: "island", position: [2.22, KITCHEN_FLOOR_Y, -2.45], floorIndex: 0, headingY: 0.15, thumbUrl: KITCHEN_STATION_THUMB },
  { id: "opening", position: [3.72, KITCHEN_FLOOR_Y, -1.42], floorIndex: 0, headingY: -1.05, thumbUrl: KITCHEN_STATION_THUMB },
];

export function kitchenDefaultStation(): WalkStation {
  return KITCHEN_STATIONS.find((s) => s.id === KITCHEN_DEFAULT_STATION) ?? KITCHEN_STATIONS[0];
}

export function kitchenEyeY(): number {
  return KITCHEN_FLOOR_Y + KITCHEN_EYE_HEIGHT_M;
}

/** Fixed-camera appearance regression. Fridge station, 1440×900, vfov 72°. */
export const KITCHEN_FIDELITY_CAMERA = {
  width: 1440,
  height: 900,
  vfov: 72,
  position: [0.72, KITCHEN_FLOOR_Y + KITCHEN_EYE_HEIGHT_M, -1.7] as const,
  yaw: -0.85,
  quaternionXyzw: [0, Math.sin(-0.85 / 2), 0, Math.cos(-0.85 / 2)] as const,
} as const;
