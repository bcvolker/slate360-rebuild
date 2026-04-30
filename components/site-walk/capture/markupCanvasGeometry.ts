import type { MarkupShape } from "@/lib/site-walk/markup-types";
import type { VectorTool } from "./UnifiedVectorToolbar";

export type DraftPoint = { x: number; y: number };
export type Transform = { x: number; y: number; scale: number };
export type PointerPoint = { x: number; y: number };

export const MARKUP_WIDTH = 1000;
export const MARKUP_HEIGHT = 720;
const HIT_PAD = 18;

export function buildShape(tool: VectorTool, start: DraftPoint, points: number[], color: string): MarkupShape | null {
  const id = `shape-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const base = { id, stroke: color, fill: "none", strokeWidth: 5, rotation: 0, updatedAt: Date.now() };
  const endX = points[points.length - 2] ?? start.x;
  const endY = points[points.length - 1] ?? start.y;
  if (tool === "box") return { ...base, kind: "rect", x: Math.min(start.x, endX), y: Math.min(start.y, endY), width: Math.abs(endX - start.x), height: Math.abs(endY - start.y) };
  if (tool === "circle") return { ...base, kind: "ellipse", cx: (start.x + endX) / 2, cy: (start.y + endY) / 2, rx: Math.abs(endX - start.x) / 2, ry: Math.abs(endY - start.y) / 2 };
  if (tool === "arrow") return { ...base, kind: "arrow", x1: start.x, y1: start.y, x2: endX, y2: endY, headSize: 28 };
  if (tool === "draw") return { ...base, kind: "freehand", points };
  return null;
}

export function buildText(point: DraftPoint, color: string): MarkupShape {
  return { id: `text-${Date.now()}`, kind: "text", x: point.x, y: point.y, text: "", fontSize: 36, stroke: color, fill: "none", strokeWidth: 0, rotation: 0, updatedAt: Date.now() };
}

export function distance(a: PointerPoint, b: PointerPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function moveShape(shape: MarkupShape, dx: number, dy: number): MarkupShape {
  if (shape.kind === "rect") return { ...shape, x: shape.x + dx, y: shape.y + dy, updatedAt: Date.now() };
  if (shape.kind === "ellipse") return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy, updatedAt: Date.now() };
  if (shape.kind === "text") return { ...shape, x: shape.x + dx, y: shape.y + dy, updatedAt: Date.now() };
  if (shape.kind === "arrow" || shape.kind === "line") return { ...shape, x1: shape.x1 + dx, y1: shape.y1 + dy, x2: shape.x2 + dx, y2: shape.y2 + dy, updatedAt: Date.now() };
  return { ...shape, points: shape.points.map((value, index) => value + (index % 2 === 0 ? dx : dy)), updatedAt: Date.now() };
}

export function resizeShape(shape: MarkupShape, scale: number): MarkupShape {
  if (shape.kind === "rect") return { ...shape, width: shape.width * scale, height: shape.height * scale, updatedAt: Date.now() };
  if (shape.kind === "ellipse") return { ...shape, rx: shape.rx * scale, ry: shape.ry * scale, updatedAt: Date.now() };
  if (shape.kind === "text") return { ...shape, fontSize: Math.max(14, shape.fontSize * scale), updatedAt: Date.now() };
  if (shape.kind === "arrow") return { ...shape, x2: shape.x1 + (shape.x2 - shape.x1) * scale, y2: shape.y1 + (shape.y2 - shape.y1) * scale, headSize: shape.headSize * scale, updatedAt: Date.now() };
  if (shape.kind === "line") return { ...shape, x2: shape.x1 + (shape.x2 - shape.x1) * scale, y2: shape.y1 + (shape.y2 - shape.y1) * scale, updatedAt: Date.now() };
  return { ...shape, strokeWidth: Math.max(2, shape.strokeWidth * scale), updatedAt: Date.now() };
}

export function findShapeAtPoint(shapes: MarkupShape[], point: DraftPoint) {
  return [...shapes].reverse().find((shape) => {
    const bounds = getShapeBounds(shape);
    if (!bounds) return false;
    return point.x >= bounds.x - HIT_PAD && point.x <= bounds.x + bounds.width + HIT_PAD && point.y >= bounds.y - HIT_PAD && point.y <= bounds.y + bounds.height + HIT_PAD;
  }) ?? null;
}

export function getShapeBounds(shape: MarkupShape) {
  if (shape.kind === "rect") return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
  if (shape.kind === "ellipse") return { x: shape.cx - shape.rx, y: shape.cy - shape.ry, width: shape.rx * 2, height: shape.ry * 2 };
  if (shape.kind === "text") return { x: shape.x, y: shape.y - shape.fontSize, width: Math.max(80, shape.text.length * shape.fontSize * 0.55), height: shape.fontSize * 1.25 };
  if (shape.kind === "arrow" || shape.kind === "line") return boundsFromPoints([shape.x1, shape.y1, shape.x2, shape.y2]);
  return boundsFromPoints(shape.points);
}

function boundsFromPoints(points: number[]) {
  const xs = points.filter((_, index) => index % 2 === 0);
  const ys = points.filter((_, index) => index % 2 === 1);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}
