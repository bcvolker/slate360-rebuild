/**
 * Kitchen visual-proof world: metric TSDF is S360_WORLD.
 * Brush B (equatorial+zenith) is baked into ARKit via locked EXACT_FRAME_SIM3.
 * Spark Rx(π) is NOT applied — the SPZ already lives on ARKit Y-up.
 */
import { sim3FromRowMajor4, type Sim3 } from "./s360-world";
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

/** Brush B baked to ARKit. Identity world matrix — SIM3 is already in the SPZ. */
export const KITCHEN_APPEARANCE_AVAILABLE = true;
export const KITCHEN_APPEARANCE_KIND = "brush_x4_arkit.spz";
export const KITCHEN_SPLAT_MAX = 800_000;
export const KITCHEN_SPLAT_IDENTITY_MATRIX = [
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
] as const;
export const KITCHEN_DEFAULT_STATION = "island";

/** Floor plane from the metric job QA (Y-up, metres). */
export const KITCHEN_FLOOR_Y = -1.5951639883678779;
export const KITCHEN_CEILING_CUT_Y = 1.1;
export const KITCHEN_HUMAN_FOV = 72;
export const KITCHEN_EYE_HEIGHT_M = 1.6;

export const KITCHEN_FLOORS: FloorInfo[] = [
  { index: 0, label: "Ground", elevationY: KITCHEN_FLOOR_Y },
];

/**
 * Human-eye stations in S360_WORLD. Y is floor; the nav hook adds eye height.
 * Island is the default start (near island/arch, looking into the kitchen).
 */
export const KITCHEN_STATIONS: WalkStation[] = [
  { id: "human", position: [2.05, KITCHEN_FLOOR_Y, -1.82], floorIndex: 0, headingY: 0.28 },
  { id: "fridge", position: [0.72, KITCHEN_FLOOR_Y, -1.7], floorIndex: 0, headingY: -0.85 },
  { id: "island", position: [2.22, KITCHEN_FLOOR_Y, -2.45], floorIndex: 0, headingY: 0.15 },
  { id: "opening", position: [3.72, KITCHEN_FLOOR_Y, -1.42], floorIndex: 0, headingY: -1.05 },
];

export function kitchenDefaultStation(): WalkStation {
  return KITCHEN_STATIONS.find((s) => s.id === KITCHEN_DEFAULT_STATION) ?? KITCHEN_STATIONS[0];
}

export function kitchenEyeY(): number {
  return KITCHEN_FLOOR_Y + KITCHEN_EYE_HEIGHT_M;
}
