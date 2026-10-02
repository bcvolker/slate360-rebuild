/** Reads plan-set metadata and waypoint coordinates for the directed-walk overlay. */
import { type PlanControl, type PlanFrame } from "@/lib/local-artifacts/plan-calibration";
import type { OverlayAccuracy, OverlayTiming, PinAnchor } from "./directed-walk-plan";

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readPlanFrame(value: unknown): PlanFrame | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const scale = num(row.scale);
  const rotationRad = num(row.rotationRad);
  const tx = num(row.tx);
  const ty = num(row.ty);
  const controlCount = num(row.controlCount) ?? 0;
  if (scale == null || scale <= 0 || rotationRad == null || tx == null || ty == null || controlCount < 2) return null;
  return { scale, rotationRad, tx, ty, rmse: num(row.rmse) ?? 0, controlCount, status: "unvalidated" };
}

export function readPlanControls(value: unknown): PlanControl[] {
  if (!Array.isArray(value)) return [];
  const out: PlanControl[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const point = row as Record<string, unknown>;
    const pathX = num(point.pathX);
    const pathY = num(point.pathY);
    const planU = num(point.planU);
    const planV = num(point.planV);
    if (pathX == null || pathY == null || planU == null || planV == null) continue;
    out.push({ pathX, pathY, planU, planV });
  }
  return out;
}

const ACCURACIES = new Set<OverlayAccuracy>(["georef", "two-point", "pin-anchors", "sheet-fraction", "pin-polyline", "unregistered"]);

/** Registration stored on `site_walk_plan_sets.metadata` by the artifact publisher, or authored later. */
export function readRegistration(metadata: unknown): {
  frame: PlanFrame | null;
  anchors: PlanControl[];
  sheetId: string | null;
  accuracy: OverlayAccuracy | null;
} {
  if (!metadata || typeof metadata !== "object") return { frame: null, anchors: [], sheetId: null, accuracy: null };
  const row = metadata as Record<string, unknown>;
  const directed = row.directedWalk && typeof row.directedWalk === "object" ? (row.directedWalk as Record<string, unknown>) : {};
  const hint = directed.accuracy ?? row.accuracy;
  return {
    frame: readPlanFrame(row.planFrame),
    anchors: readPlanControls(directed.anchors ?? row.planControls),
    sheetId: typeof directed.sheetId === "string" ? directed.sheetId : null,
    accuracy: typeof hint === "string" && ACCURACIES.has(hint as OverlayAccuracy) ? (hint as OverlayAccuracy) : null,
  };
}

export function readWaypointSpace(
  xyz: unknown,
): { kind: "path"; x: number; y: number; segmentId?: string } | { kind: "sheet"; u: number; v: number; segmentId?: string } | null {
  if (Array.isArray(xyz)) {
    const x = num(xyz[0]);
    const y = num(xyz[1]);
    return x == null || y == null ? null : { kind: "path", x, y };
  }
  if (!xyz || typeof xyz !== "object") return null;
  const row = xyz as Record<string, unknown>;
  const segmentId = typeof row.segmentId === "string" ? row.segmentId : undefined;
  const x = num(row.x) ?? num(row.pathX);
  const y = num(row.y) ?? num(row.pathY);
  if (x != null && y != null) return { kind: "path", x, y, segmentId };
  const u = num(row.u) ?? num(row.planU);
  const v = num(row.v) ?? num(row.planV);
  if (u == null || v == null) return null;
  return { kind: "sheet", u, v, segmentId };
}

function normLabel(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Attach walk times onto plan pins. Label matches win; equal-length order is the last resort. */
export function timePins(
  pins: PinAnchor[],
  labeled: Array<{ label: string; t: number; clipId: string | null }>,
  orderedMarks: Array<{ t: number; clipId: string | null }>,
): { pins: PinAnchor[]; timing: OverlayTiming } {
  const byLabel = new Map<string, { t: number; clipId: string | null }>();
  for (const row of labeled) {
    const key = normLabel(row.label);
    if (key && !byLabel.has(key)) byLabel.set(key, row);
  }
  let hits = 0;
  const matched = pins.map((pin) => {
    const hit = byLabel.get(normLabel(pin.label));
    if (!hit) return pin;
    hits += 1;
    return { ...pin, t: hit.t, clipId: hit.clipId };
  });
  if (hits > 0) return { pins: matched, timing: "label" };
  if (pins.length >= 2 && pins.length === orderedMarks.length) {
    return {
      timing: "index",
      pins: pins.map((pin, i) => ({ ...pin, t: orderedMarks[i].t, clipId: orderedMarks[i].clipId })),
    };
  }
  return { pins, timing: "none" };
}
