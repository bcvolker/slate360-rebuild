/**
 * Framing-first privacy for the Directed Tour.
 *
 * The published view is a forward cone (heading ± half width, pitch floor to ceiling)
 * that never contains the operator. Clients are look-locked to it, and every checkpoint
 * still is a perspective frame rendered inside it. Painting is a last resort for a stray
 * limb or reflection; a paint that reaches into the cone shows as an ugly black area and
 * blocks publishing. Yaw is in degrees, 0–360, the player's convention.
 */
import type { OperatorKeyframe } from "@/lib/spatial-walkthrough/keyframes";

export type LookCone = {
  /** Walking direction in the equirect frame (0–360). */
  headingDeg: number;
  /** Half the published horizontal sweep: 110 = 220° forward. */
  halfWidthDeg: number;
  /** Lowest a client can look; keeps the walker under the mast out of view. */
  pitchMinDeg: number;
  pitchMaxDeg: number;
};

/** A still is a perspective frame of this size, about 16:9. */
export const STILL_FOV = { h: 90, v: 56 } as const;

export const DEFAULT_LOOK_CONE: LookCone = { headingDeg: 0, halfWidthDeg: 110, pitchMinDeg: -30, pitchMaxDeg: 80 };

export const CONE_LIMITS = {
  halfWidth: { min: STILL_FOV.h / 2, max: 150 },
  pitchMin: { min: -60, max: 0 },
} as const;

/**
 * Pure-black (luma < 5) pixels allowed in a published still. Measured 2026-09-30: a thin
 * mask arc at the frame edge is 0.3%, a dark TV and cabinets 0.0%, and a below-horizon blackout 31%.
 */
export const MAX_STILL_BLACK_FRACTION = 0.0025;

const wrap = (d: number) => ((d % 360) + 360) % 360;
/** Signed shortest difference a − b in (−180, 180]. */
export const yawDelta = (a: number, b: number) => {
  const d = wrap(a - b);
  return d > 180 ? d - 360 : d;
};
const clampN = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function parseLookCone(raw: unknown): LookCone | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const heading = n(o.headingDeg), half = n(o.halfWidthDeg), pmin = n(o.pitchMinDeg), pmax = n(o.pitchMaxDeg);
  if (heading == null || half == null || pmin == null || pmax == null) return null;
  return {
    headingDeg: wrap(heading),
    halfWidthDeg: clampN(half, CONE_LIMITS.halfWidth.min, CONE_LIMITS.halfWidth.max),
    pitchMinDeg: clampN(pmin, CONE_LIMITS.pitchMin.min, CONE_LIMITS.pitchMin.max),
    pitchMaxDeg: clampN(pmax, 30, 90),
  };
}

/**
 * Nearest view direction whose whole frame (fov) stays inside the cone. Returns the
 * input unchanged when it already fits.
 */
export function clampViewIntoCone(
  cone: LookCone,
  yaw: number,
  pitch: number,
  fov: { h: number; v: number } = STILL_FOV,
): { yaw: number; pitch: number; adjusted: boolean } {
  const maxYawOff = Math.max(0, cone.halfWidthDeg - fov.h / 2);
  const off = yawDelta(yaw, cone.headingDeg);
  const yawOff = clampN(off, -maxYawOff, maxYawOff);
  const pLo = cone.pitchMinDeg + fov.v / 2;
  const pHi = Math.max(pLo, cone.pitchMaxDeg - fov.v / 2);
  const p = clampN(pitch, pLo, pHi);
  const adjusted = Math.abs(yawOff - off) > 0.01 || Math.abs(p - pitch) > 0.01;
  return { yaw: wrap(cone.headingDeg + yawOff), pitch: p, adjusted };
}

/** Allowed client look range (view centres) for the player's visible-range lock. */
export function coneVisibleRange(cone: LookCone): { yawFrom: number; yawTo: number; pitchFrom: number; pitchTo: number } {
  return {
    yawFrom: wrap(cone.headingDeg - cone.halfWidthDeg),
    yawTo: wrap(cone.headingDeg + cone.halfWidthDeg),
    pitchFrom: cone.pitchMinDeg,
    pitchTo: cone.pitchMaxDeg,
  };
}

type Paint = { enabled: boolean; yawCenter: number; yawWidth: number; pitchTop: number; pitchBottom: number };

/** Every painted sector the bake may draw, from the patch and its keyframes. */
export function paintSectors(patch: {
  enabled?: boolean;
  rearYawCenter?: number;
  rearYawWidth?: number;
  pitchMin?: number;
  pitchMax?: number;
  nadirRadius?: number;
  keyframes?: OperatorKeyframe[];
} | null): Paint[] {
  if (!patch || patch.enabled === false) return [];
  // The nadir disc is painted all the way round; its radius is a share of the half-height.
  const nadir = (r: number | undefined): Paint[] =>
    r && r > 0 ? [{ enabled: true, yawCenter: 0, yawWidth: 360, pitchTop: -90 + clampN(r, 0, 1) * 90, pitchBottom: -90 }] : [];
  const frames = (patch.keyframes ?? []).flatMap((k) => [
    { enabled: true, yawCenter: k.yawCenter, yawWidth: k.yawWidth, pitchTop: k.pitchTop, pitchBottom: k.pitchBottom },
    ...nadir(k.nadirRadius),
  ]);
  if (frames.length) return frames;
  return [
    {
      enabled: true,
      yawCenter: patch.rearYawCenter ?? 180,
      yawWidth: patch.rearYawWidth ?? 64,
      pitchTop: patch.pitchMax ?? -18,
      pitchBottom: patch.pitchMin ?? -88,
    },
    ...nadir(patch.nadirRadius),
  ];
}

/** Does any painted sector reach into the published cone (so a client would see black)? */
export function paintVisibleInCone(sectors: Paint[], cone: LookCone): boolean {
  return sectors.some((s) => {
    const pitchOverlap = s.pitchTop > cone.pitchMinDeg && s.pitchBottom < cone.pitchMaxDeg;
    if (!pitchOverlap) return false;
    const yawGap = Math.abs(yawDelta(s.yawCenter, cone.headingDeg));
    return yawGap < s.yawWidth / 2 + cone.halfWidthDeg;
  });
}

/** Share of the sphere a sector covers (solid angle / 4π). */
export function sectorCoverage(s: Paint): number {
  const toRad = Math.PI / 180;
  const band = Math.abs(Math.sin(clampN(s.pitchTop, -90, 90) * toRad) - Math.sin(clampN(s.pitchBottom, -90, 90) * toRad)) / 2;
  return band * (clampN(s.yawWidth, 0, 360) / 360);
}

/** Largest share of the sphere any frame of the paint covers. */
export function maxPaintCoverage(sectors: Paint[]): number {
  return sectors.reduce((m, s) => Math.max(m, sectorCoverage(s)), 0);
}

/** Paints above this are a blackout, not a limb fix. The studio refuses to bake them. */
export const MAX_PAINT_COVERAGE = 0.12;
