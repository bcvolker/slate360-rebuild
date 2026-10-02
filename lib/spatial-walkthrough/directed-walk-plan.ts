/**
 * Directed-walk route → plan sheet.
 *
 * Plan UV is a fraction of the sheet image (0..1). Path XY is the walk's
 * horizontal frame (metres or any consistent local axes). A similarity
 * (`lib/local-artifacts/plan-calibration`) scales and rotates that frame onto
 * the sheet. This is visual navigation, not survey control.
 */
import { applyPlanFrame, solvePlanFrame, type PlanControl, type PlanFrame } from "@/lib/local-artifacts/plan-calibration";

export type OverlayAccuracy = "georef" | "two-point" | "pin-anchors" | "sheet-fraction" | "pin-polyline" | "unregistered";
export type OverlayTiming = "waypoint" | "label" | "index" | "none";

export type PathSample = {
  id: string;
  t: number;
  x: number;
  y: number;
  clipId?: string | null;
  segmentId?: string | null;
  label?: string | null;
};

export type SheetSample = {
  id: string;
  t: number;
  u: number;
  v: number;
  clipId?: string | null;
  segmentId?: string | null;
  label?: string | null;
};

export type PinAnchor = {
  id: string;
  u: number;
  v: number;
  t: number | null;
  clipId?: string | null;
  label?: string | null;
  pathX?: number | null;
  pathY?: number | null;
};

export type WalkPlanPoint = {
  id: string;
  u: number;
  v: number;
  t: number | null;
  clipId: string | null;
  segmentId: string | null;
  label: string | null;
};

export type WalkPlanSegment = { key: string; a: WalkPlanPoint; b: WalkPlanPoint };

export type DirectedWalkOverlay = {
  accuracy: OverlayAccuracy;
  timing: OverlayTiming;
  rmse: number | null;
  points: WalkPlanPoint[];
  segments: WalkPlanSegment[];
  note: string;
};

export type WalkHit = {
  u: number;
  v: number;
  t: number | null;
  clipId: string | null;
  pointId: string;
  label: string | null;
  segmentKey: string | null;
};

const NOTES: Record<OverlayAccuracy, string> = {
  georef: "Walk route placed from reference points on this drawing. It lines up visually, not as a survey.",
  "two-point": "Walk route scaled from two reference points on this drawing. It lines up visually, not as a survey.",
  "pin-anchors": "Walk route aligned through the pins on this drawing. It lines up visually, not as a survey.",
  "sheet-fraction": "Walk route placed on this drawing. It lines up visually, not as a survey.",
  "pin-polyline": "Walk route follows the pins on this drawing.",
  unregistered: "This drawing is not aligned to the walk yet.",
};

function noteFor(accuracy: OverlayAccuracy, timing: OverlayTiming): string {
  if (accuracy === "pin-polyline" && timing === "index") {
    return "Walk route follows the pins on this drawing. Times follow that same pin order.";
  }
  if (accuracy === "pin-polyline" && timing === "label") {
    return "Walk route follows the pins on this drawing. Times come from the matching walk stops.";
  }
  return NOTES[accuracy];
}

export function emptyOverlay(note = NOTES.unregistered): DirectedWalkOverlay {
  return { accuracy: "unregistered", timing: "none", rmse: null, points: [], segments: [], note };
}

function pointFrom(sample: {
  id: string;
  u: number;
  v: number;
  t: number | null;
  clipId?: string | null;
  segmentId?: string | null;
  label?: string | null;
}): WalkPlanPoint {
  return {
    id: sample.id,
    u: sample.u,
    v: sample.v,
    t: sample.t,
    clipId: sample.clipId ?? null,
    segmentId: sample.segmentId ?? null,
    label: sample.label ?? null,
  };
}

function canJoin(a: WalkPlanPoint, b: WalkPlanPoint, allowReverseTime: boolean): boolean {
  if (a.clipId && b.clipId && a.clipId !== b.clipId) return false;
  if (a.segmentId && b.segmentId && a.segmentId !== b.segmentId) return false;
  if (!allowReverseTime && a.t != null && b.t != null && b.t + 0.05 < a.t) return false;
  return true;
}

function toSegments(points: WalkPlanPoint[], allowReverseTime: boolean): WalkPlanSegment[] {
  const segments: WalkPlanSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!canJoin(a, b, allowReverseTime)) continue;
    segments.push({ key: `${a.id}:${b.id}`, a, b });
  }
  return segments;
}

function finish(accuracy: OverlayAccuracy, timing: OverlayTiming, rmse: number | null, points: WalkPlanPoint[], allowReverseTime: boolean): DirectedWalkOverlay {
  return { accuracy, timing, rmse, points, segments: toSegments(points, allowReverseTime), note: noteFor(accuracy, timing) };
}

type PlacedFrame = { frame: PlanFrame; flipY: boolean };

/** Drawing V grows downward. Try a Y flip and keep the closer similarity. */
function solveBest(controls: PlanControl[]): PlacedFrame | null {
  const direct = solvePlanFrame(controls);
  const flipped = solvePlanFrame(controls.map((point) => ({ ...point, pathY: -point.pathY })));
  if (!direct) return flipped ? { frame: flipped, flipY: true } : null;
  if (!flipped || flipped.rmse >= direct.rmse - 1e-9) return { frame: direct, flipY: false };
  return { frame: flipped, flipY: true };
}

function place(placed: PlacedFrame, x: number, y: number): { u: number; v: number } {
  return applyPlanFrame(placed.frame, x, placed.flipY ? -y : y);
}

function frameAccuracy(frame: PlanFrame, hint: OverlayAccuracy | null, fromPins: boolean): OverlayAccuracy {
  if (fromPins) return "pin-anchors";
  if (hint === "georef" || hint === "two-point") return hint;
  return frame.controlCount >= 3 ? "georef" : "two-point";
}

export function buildDirectedWalkOverlay(input: {
  frame?: PlanFrame | null;
  anchors?: PlanControl[] | null;
  accuracyHint?: OverlayAccuracy | null;
  path?: PathSample[];
  sheetPath?: SheetSample[];
  pins?: PinAnchor[];
  pinTiming?: OverlayTiming;
}): DirectedWalkOverlay {
  const path = [...(input.path ?? [])].filter((p) => [p.t, p.x, p.y].every(Number.isFinite)).sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
  const sheetPath = [...(input.sheetPath ?? [])].filter((p) => [p.t, p.u, p.v].every(Number.isFinite)).sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
  const pins = input.pins ?? [];
  const pinControls: PlanControl[] = pins.flatMap((pin) =>
    pin.pathX != null && pin.pathY != null && Number.isFinite(pin.pathX) && Number.isFinite(pin.pathY)
      ? [{ pathX: pin.pathX, pathY: pin.pathY, planU: pin.u, planV: pin.v }]
      : [],
  );
  const anchorFrame = !input.frame && input.anchors && input.anchors.length >= 2 ? solveBest(input.anchors) : null;
  const solvedFromPins = !input.frame && !anchorFrame && pinControls.length >= 2 ? solveBest(pinControls) : null;
  const placed: PlacedFrame | null = input.frame ? { frame: input.frame, flipY: false } : anchorFrame ?? solvedFromPins;

  if (path.length >= 2 && placed) {
    const points = path.map((sample) => pointFrom({ ...sample, ...place(placed, sample.x, sample.y) }));
    return finish(frameAccuracy(placed.frame, input.accuracyHint ?? null, Boolean(solvedFromPins)), "waypoint", placed.frame.rmse, points, false);
  }

  if (sheetPath.length >= 2) {
    return finish(
      "sheet-fraction",
      "waypoint",
      null,
      sheetPath.map((sample) => pointFrom(sample)),
      false,
    );
  }

  if (pins.length >= 2) {
    const timing = input.pinTiming === "label" || input.pinTiming === "index" ? input.pinTiming : "none";
    return finish(
      "pin-polyline",
      timing,
      null,
      pins.map((pin) => pointFrom({ ...pin, segmentId: null })),
      true,
    );
  }

  return emptyOverlay();
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function project(u: number, v: number, segment: WalkPlanSegment): { dist: number; k: number; u: number; v: number } {
  const dx = segment.b.u - segment.a.u;
  const dy = segment.b.v - segment.a.v;
  const len2 = dx * dx + dy * dy;
  const k = len2 < 1e-12 ? 0 : clamp01(((u - segment.a.u) * dx + (v - segment.a.v) * dy) / len2);
  const pu = segment.a.u + dx * k;
  const pv = segment.a.v + dy * k;
  return { dist: Math.hypot(u - pu, v - pv), k, u: pu, v: pv };
}

function mixTime(a: number | null, b: number | null, k: number): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return a + (b - a) * k;
}

/** Nearest leg of the route. Clicks farther than `maxDist` (sheet fraction) do not seek. */
export function hitWalkOverlay(overlay: DirectedWalkOverlay, u: number, v: number, maxDist = 0.08): WalkHit | null {
  let best: WalkHit | null = null;
  let bestDist = maxDist;
  for (const segment of overlay.segments) {
    const hit = project(u, v, segment);
    if (hit.dist > bestDist) continue;
    const nearer = hit.k < 0.5 ? segment.a : segment.b;
    bestDist = hit.dist;
    best = {
      u: hit.u,
      v: hit.v,
      t: mixTime(segment.a.t, segment.b.t, hit.k),
      clipId: nearer.clipId,
      pointId: nearer.id,
      label: nearer.label,
      segmentKey: segment.key,
    };
  }
  if (best) return best;
  for (const point of overlay.points) {
    const dist = Math.hypot(point.u - u, point.v - v);
    if (dist > bestDist) continue;
    bestDist = dist;
    best = { u: point.u, v: point.v, t: point.t, clipId: point.clipId, pointId: point.id, label: point.label, segmentKey: null };
  }
  return best;
}
