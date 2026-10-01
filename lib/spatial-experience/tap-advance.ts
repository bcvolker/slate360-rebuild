/** Choose the next recorded-path anchor inside a forward angular cone. */

export type PathAnchor = {
  id: string;
  tSeconds: number;
  yawDeg: number;
  segmentId?: string;
};

export type TapAdvanceResult =
  | { kind: "none" }
  | { kind: "one"; anchor: PathAnchor }
  | { kind: "branch"; anchors: PathAnchor[] };

const CONE_DEG = 55;

function wrapYaw(deg: number): number {
  const d = ((deg + 180) % 360 + 360) % 360 - 180;
  return d;
}

export function headingFromView(yawDeg: number, pointerYawDeg: number): number {
  return wrapYaw(pointerYawDeg);
}

export function tapAdvance(
  anchors: PathAnchor[],
  currentT: number,
  viewYawDeg: number,
  pointerYawDeg: number,
  coneDeg = CONE_DEG,
): TapAdvanceResult {
  const heading = headingFromView(viewYawDeg, pointerYawDeg);
  const ahead = anchors
    .filter((a) => a.tSeconds > currentT + 0.35)
    .filter((a) => Math.abs(wrapYaw(a.yawDeg - heading)) <= coneDeg)
    .sort((a, b) => a.tSeconds - b.tSeconds);
  if (ahead.length === 0) {
    const next = anchors.filter((a) => a.tSeconds > currentT + 0.35).sort((a, b) => a.tSeconds - b.tSeconds)[0];
    return next ? { kind: "one", anchor: next } : { kind: "none" };
  }
  const firstSeg = ahead[0].segmentId;
  const branches = firstSeg
    ? [...new Map(ahead.filter((a) => a.tSeconds <= ahead[0].tSeconds + 1.2).map((a) => [a.segmentId ?? a.id, a])).values()]
    : [ahead[0]];
  if (branches.length > 1) return { kind: "branch", anchors: branches.slice(0, 2) };
  return { kind: "one", anchor: ahead[0] };
}
