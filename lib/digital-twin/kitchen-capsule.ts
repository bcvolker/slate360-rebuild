/** Capsule walk maths. Collision sampling lives in the R3F rig. */

export const CAPSULE_RADIUS_M = 0.22;
export const STEP_HEIGHT_M = 0.22;
export const WALK_SPEED_MPS = 1.65;
export const KITCHEN_EYE_HEIGHT_WALK_M = 1.6;

export function projectSlide(dx: number, dz: number, nx: number, nz: number): [number, number] {
  const len = Math.hypot(nx, nz);
  if (len < 1e-8) return [dx, dz];
  const nnx = nx / len;
  const nnz = nz / len;
  const into = dx * nnx + dz * nnz;
  if (into >= 0) return [dx, dz];
  return [dx - nnx * into, dz - nnz * into];
}

export function walkDelta(
  forward: number,
  right: number,
  yaw: number,
  dt: number,
  speed = WALK_SPEED_MPS,
): [number, number] {
  const mag = Math.hypot(forward, right);
  if (mag < 1e-6) return [0, 0];
  const f = forward / mag;
  const r = right / mag;
  const dist = speed * dt;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  // Yaw 0 looks along -Z, matching walkthrough-navigation.
  const dx = (-sin * f + cos * r) * dist;
  const dz = (-cos * f - sin * r) * dist;
  return [dx, dz];
}

export function clampWalkHeight(
  y: number,
  floorY: number,
  ceilingY: number,
  eye = KITCHEN_EYE_HEIGHT_WALK_M,
): number {
  const minY = floorY + eye - 0.05;
  const maxY = Math.min(ceilingY - 0.12, floorY + eye + 0.55);
  return Math.min(maxY, Math.max(minY, y));
}

export type TwinMeshRole = "display" | "nav" | "measure";

export function meshRoleFlags(role: TwinMeshRole) {
  return {
    twinDisplayMesh: role === "display",
    twinNavMesh: role === "nav",
    twinWalkSurface: role === "nav",
    twinMeasureMesh: role === "measure",
  };
}

export function poseDelta(
  a: { x: number; y: number; z: number; yaw: number; pitch: number },
  b: { x: number; y: number; z: number; yaw: number; pitch: number },
): number {
  return Math.max(
    Math.abs(a.x - b.x),
    Math.abs(a.y - b.y),
    Math.abs(a.z - b.z),
    Math.abs(a.yaw - b.yaw),
    Math.abs(a.pitch - b.pitch),
  );
}
