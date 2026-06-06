export const APPROX_COORDINATION_LABEL =
  "Approximate — for coordination, not survey.";

export type TwinVec3 = { x: number; y: number; z: number };

export function twinPickDistance(a: TwinVec3, b: TwinVec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}
