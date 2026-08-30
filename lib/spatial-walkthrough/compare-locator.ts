/** Locator for temporal compare. xyz is reserved; matching never requires it. */

export type CompareXyz = { x: number; y: number; z: number };

export type CompareLocator = {
  walkthroughId: string;
  clipId: string;
  chapterId: string | null;
  tSeconds: number;
  yawDeg: number;
  pitchDeg: number;
  xyz: CompareXyz | null;
};

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function parseXyz(raw: unknown): CompareXyz | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const x = Number(row.x);
  const y = Number(row.y);
  const z = Number(row.z);
  if (![x, y, z].every(Number.isFinite)) return null;
  return { x, y, z };
}

export function parseCompareLocator(raw: unknown): CompareLocator | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const walkthroughId = str(row.walkthroughId ?? row.walkthrough_id);
  const clipId = str(row.clipId ?? row.clip_id);
  if (!walkthroughId || !clipId) return null;
  return {
    walkthroughId,
    clipId,
    chapterId: str(row.chapterId ?? row.chapter_id),
    tSeconds: num(row.tSeconds ?? row.t_seconds),
    yawDeg: num(row.yawDeg ?? row.yaw_deg),
    pitchDeg: num(row.pitchDeg ?? row.pitch_deg),
    xyz: parseXyz(row.xyz),
  };
}

export function locatorFromView(input: {
  walkthroughId: string;
  clipId: string;
  chapterId?: string | null;
  tSeconds: number;
  yawDeg: number;
  pitchDeg: number;
  xyz?: CompareXyz | null;
}): CompareLocator {
  return {
    walkthroughId: input.walkthroughId,
    clipId: input.clipId,
    chapterId: input.chapterId ?? null,
    tSeconds: input.tSeconds,
    yawDeg: input.yawDeg,
    pitchDeg: input.pitchDeg,
    xyz: input.xyz ?? null,
  };
}

/** Smallest signed yaw delta in (-180, 180]. */
export function yawDelta(fromDeg: number, toDeg: number): number {
  let d = ((toDeg - fromDeg + 540) % 360) - 180;
  if (d <= -180) d += 360;
  return Math.round(d * 100) / 100;
}

export function orientationDelta(a: Pick<CompareLocator, "yawDeg" | "pitchDeg">, b: Pick<CompareLocator, "yawDeg" | "pitchDeg">): {
  yaw: number;
  pitch: number;
} {
  return { yaw: Math.abs(yawDelta(a.yawDeg, b.yawDeg)), pitch: Math.abs(a.pitchDeg - b.pitchDeg) };
}
