import type { SiteWalkPlanSheet } from "@/lib/types/site-walk";

export type PlanCropBboxPct = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Read optional crop rect from sheet metadata (percentages of rasterized image). */
export function readPlanCropBboxPct(metadata: unknown): PlanCropBboxPct | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>).crop_bbox_pct;
  if (!raw || typeof raw !== "object") return null;
  const box = raw as Record<string, unknown>;
  const x = numberInRange(box.x, 0, 100);
  const y = numberInRange(box.y, 0, 100);
  const w = numberInRange(box.w, 0, 100);
  const h = numberInRange(box.h, 0, 100);
  if (x === null || y === null || w === null || h === null) return null;
  if (w <= 0 || h <= 0) return null;
  if (x + w > 100.001 || y + h > 100.001) return null;
  return { x, y, w, h };
}

export function readSheetCropBboxPct(sheet: Pick<SiteWalkPlanSheet, "metadata"> | null | undefined) {
  return readPlanCropBboxPct(sheet?.metadata);
}

/** Leaflet CRS.Simple bounds: [[south, west], [north, east]] in pixel space. */
export function planCropBoundsExpression(
  imageWidth: number,
  imageHeight: number,
  crop: PlanCropBboxPct | null,
): [[number, number], [number, number]] {
  if (!crop) return [[0, 0], [imageHeight, imageWidth]];
  const south = (crop.y / 100) * imageHeight;
  const west = (crop.x / 100) * imageWidth;
  const north = south + (crop.h / 100) * imageHeight;
  const east = west + (crop.w / 100) * imageWidth;
  return [[south, west], [north, east]];
}

function numberInRange(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}
