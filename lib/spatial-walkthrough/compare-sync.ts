import type { CompareAnchor } from "./compare-anchor";
import { yawDelta, type CompareLocator } from "./compare-locator";

export type MappedView = {
  locator: CompareLocator;
  sourceBase: Pick<CompareLocator, "yawDeg" | "pitchDeg">;
  fromAnchorId: string | null;
  interpolated: boolean;
};

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

function lerpYaw(a: number, b: number, u: number): number {
  return a + yawDelta(a, b) * u;
}

function between(anchors: CompareAnchor[], t: number): { prev: CompareAnchor; next: CompareAnchor; u: number } | null {
  if (anchors.length < 2) return null;
  for (let i = 0; i < anchors.length - 1; i++) {
    const prev = anchors[i];
    const next = anchors[i + 1];
    if (prev.before.clipId !== next.before.clipId) continue;
    if (t < prev.before.tSeconds - 0.04 || t > next.before.tSeconds + 0.04) continue;
    const span = next.before.tSeconds - prev.before.tSeconds;
    const u = span > 0.05 ? Math.min(1, Math.max(0, (t - prev.before.tSeconds) / span)) : 0;
    return { prev, next, u };
  }
  return null;
}

function nearest(anchors: CompareAnchor[], t: number, clipId: string): CompareAnchor | null {
  const inClip = anchors.filter((a) => a.before.clipId === clipId);
  const list = inClip.length ? inClip : anchors;
  if (list.length === 0) return null;
  return list.slice().sort((a, b) => Math.abs(a.before.tSeconds - t) - Math.abs(b.before.tSeconds - t))[0] ?? null;
}

/** Map capture A time onto capture B through authored anchors. Not a metric trajectory. */
export function mapThroughAnchors(
  anchors: CompareAnchor[],
  view: Pick<CompareLocator, "walkthroughId" | "clipId" | "tSeconds" | "yawDeg" | "pitchDeg" | "chapterId">,
): MappedView | null {
  const pair = anchors
    .filter((a) => a.beforeWalkthroughId === view.walkthroughId)
    .slice()
    .sort((a, b) => a.before.tSeconds - b.before.tSeconds);
  if (pair.length === 0) return null;
  const hit = nearest(pair, view.tSeconds, view.clipId);
  if (hit && Math.abs(hit.before.tSeconds - view.tSeconds) <= 0.35) {
    return { fromAnchorId: hit.id, interpolated: false, locator: hit.after, sourceBase: hit.before };
  }
  const range = between(pair, view.tSeconds);
  if (range && range.prev.after.clipId === range.next.after.clipId) {
    const { prev, next, u } = range;
    return {
      fromAnchorId: prev.id,
      interpolated: true,
      sourceBase: {
        yawDeg: lerpYaw(prev.before.yawDeg, next.before.yawDeg, u),
        pitchDeg: lerp(prev.before.pitchDeg, next.before.pitchDeg, u),
      },
      locator: {
        walkthroughId: prev.after.walkthroughId,
        clipId: prev.after.clipId,
        chapterId: u < 0.5 ? prev.after.chapterId : next.after.chapterId,
        tSeconds: lerp(prev.after.tSeconds, next.after.tSeconds, u),
        yawDeg: lerpYaw(prev.after.yawDeg, next.after.yawDeg, u),
        pitchDeg: lerp(prev.after.pitchDeg, next.after.pitchDeg, u),
        xyz: null,
      },
    };
  }
  if (!hit) return null;
  return { fromAnchorId: hit.id, interpolated: false, locator: hit.after, sourceBase: hit.before };
}

/** Linked heading: apply A's look delta onto B's mapped base. */
export function linkedLook(
  mapped: CompareLocator,
  sourceBase: Pick<CompareLocator, "yawDeg" | "pitchDeg">,
  sourceLive: Pick<CompareLocator, "yawDeg" | "pitchDeg">,
): { yawDeg: number; pitchDeg: number } {
  return {
    yawDeg: mapped.yawDeg + yawDelta(sourceBase.yawDeg, sourceLive.yawDeg),
    pitchDeg: mapped.pitchDeg + (sourceLive.pitchDeg - sourceBase.pitchDeg),
  };
}
