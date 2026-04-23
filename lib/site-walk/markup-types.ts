/**
 * lib/site-walk/markup-types.ts
 *
 * Vector markup primitives stored in the `markup_data` jsonb column on
 * `site_walk_items` and `site_walk_pins`. Designed to be rehydrated by a
 * canvas library (Konva.js / Fabric.js) as selectable, movable objects.
 *
 * All shapes carry an `id` so individual primitives can be selected,
 * moved, restyled, or deleted without re-flattening the rest.
 */

export type MarkupShapeKind = "rect" | "ellipse" | "arrow" | "line" | "freehand" | "text";

export interface MarkupShapeBase {
  id: string;
  kind: MarkupShapeKind;
  /** Stroke color (hex / css). */
  stroke: string;
  /** Fill color or "none". */
  fill: string;
  /** Stroke width in px. */
  strokeWidth: number;
  /** Rotation in degrees, around the shape's center. */
  rotation: number;
  /** Author user id (for collaborative attribution). */
  authorId?: string;
  /** Last edit timestamp (epoch ms). */
  updatedAt: number;
}

export interface MarkupRect extends MarkupShapeBase {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MarkupEllipse extends MarkupShapeBase {
  kind: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface MarkupArrow extends MarkupShapeBase {
  kind: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  headSize: number;
}

export interface MarkupLine extends MarkupShapeBase {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MarkupFreehand extends MarkupShapeBase {
  kind: "freehand";
  /** Flat array of [x0, y0, x1, y1, …] for canvas perf. */
  points: number[];
}

export interface MarkupText extends MarkupShapeBase {
  kind: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily?: string;
}

export type MarkupShape =
  | MarkupRect
  | MarkupEllipse
  | MarkupArrow
  | MarkupLine
  | MarkupFreehand
  | MarkupText;

/**
 * Full markup payload stored in `markup_data`. Versioned so future
 * primitives (callouts, dimensions, photo crops) can be added without
 * a destructive migration.
 */
export interface MarkupData {
  version: 1;
  shapes: MarkupShape[];
  /** Coordinate space the shapes live in. */
  coordSpace: "image" | "plan_pct" | "viewport";
}

export const EMPTY_MARKUP: MarkupData = {
  version: 1,
  shapes: [],
  coordSpace: "image",
};

export function isMarkupData(value: unknown): value is MarkupData {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.version === 1 && Array.isArray(v.shapes);
}
