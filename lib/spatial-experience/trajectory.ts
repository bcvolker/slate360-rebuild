/** Desktop reconstruction trajectory → client navigation path. */

export type TrajectoryPose = { t: number; x: number; y: number; z: number; yaw: number };
export type WalkSegment = { id: string; t0: number; t1: number };

export const AOB205_KNOWN_SEGMENTS: WalkSegment[] = [
  { id: "0", t0: 0, t1: 129.2 },
  { id: "2", t0: 130, t1: 157.2 },
];

export function segmentForTime(segments: WalkSegment[], t: number): WalkSegment | null {
  return segments.find((s) => t >= s.t0 && t <= s.t1) ?? null;
}

export function mustNotJoin(a: WalkSegment | null, b: WalkSegment | null): boolean {
  if (!a || !b) return true;
  return a.id !== b.id;
}

/** Client path: 20–40 anchors. Never connect across a known break. */
export function deriveClientPath(poses: TrajectoryPose[], segments: WalkSegment[], target = 32): TrajectoryPose[] {
  const out: TrajectoryPose[] = [];
  for (const seg of segments) {
    const inSeg = poses.filter((p) => p.t >= seg.t0 && p.t <= seg.t1);
    if (!inSeg.length) continue;
    const n = Math.max(2, Math.round(target * (inSeg.length / Math.max(poses.length, 1))));
    const step = Math.max(1, Math.floor(inSeg.length / n));
    for (let i = 0; i < inSeg.length; i += step) out.push(inSeg[i]);
    const last = inSeg[inSeg.length - 1];
    if (out[out.length - 1] !== last) out.push(last);
  }
  return out.slice(0, 40);
}
