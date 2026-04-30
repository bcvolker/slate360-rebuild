import type { MarkupShape } from "@/lib/site-walk/markup-types";
import type { DraftPoint } from "./markupCanvasGeometry";

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

export function recolorShape(shape: MarkupShape, stroke: string): MarkupShape {
  return { ...shape, stroke, updatedAt: Date.now() };
}

export function setShapeStrokeWidth(shape: MarkupShape, strokeWidth: number): MarkupShape {
  const nextWidth = Math.max(1, Math.min(24, strokeWidth));
  return { ...shape, strokeWidth: nextWidth, updatedAt: Date.now() };
}

export function resizeShapeFromHandle(shape: MarkupShape, handle: ResizeHandle, point: DraftPoint): MarkupShape {
  if (shape.kind === "rect") {
    const right = shape.x + shape.width;
    const bottom = shape.y + shape.height;
    const nextLeft = handle.endsWith("w") ? point.x : shape.x;
    const nextRight = handle.endsWith("e") ? point.x : right;
    const nextTop = handle.startsWith("n") ? point.y : shape.y;
    const nextBottom = handle.startsWith("s") ? point.y : bottom;
    return { ...shape, x: Math.min(nextLeft, nextRight), y: Math.min(nextTop, nextBottom), width: Math.max(6, Math.abs(nextRight - nextLeft)), height: Math.max(6, Math.abs(nextBottom - nextTop)), updatedAt: Date.now() };
  }
  if (shape.kind === "ellipse") {
    const left = shape.cx - shape.rx;
    const right = shape.cx + shape.rx;
    const top = shape.cy - shape.ry;
    const bottom = shape.cy + shape.ry;
    const nextLeft = handle.endsWith("w") ? point.x : left;
    const nextRight = handle.endsWith("e") ? point.x : right;
    const nextTop = handle.startsWith("n") ? point.y : top;
    const nextBottom = handle.startsWith("s") ? point.y : bottom;
    return { ...shape, cx: (nextLeft + nextRight) / 2, cy: (nextTop + nextBottom) / 2, rx: Math.max(4, Math.abs(nextRight - nextLeft) / 2), ry: Math.max(4, Math.abs(nextBottom - nextTop) / 2), updatedAt: Date.now() };
  }
  if (shape.kind === "arrow" || shape.kind === "line") {
    if (handle === "nw" || handle === "sw") return { ...shape, x1: point.x, y1: point.y, updatedAt: Date.now() };
    return { ...shape, x2: point.x, y2: point.y, updatedAt: Date.now() };
  }
  if (shape.kind === "text") return { ...shape, fontSize: Math.max(14, Math.abs(point.y - shape.y) * 1.2), updatedAt: Date.now() };
  return shape;
}
