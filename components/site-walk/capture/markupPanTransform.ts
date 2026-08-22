/**
 * Pan and pinch-zoom transform helpers extracted from useMarkupCanvasState.
 * These handle viewport transforms for the markup canvas without drawing logic.
 */
import type { PointerPoint, Transform } from "./markupCanvasGeometry";
import { clamp, distance } from "./markupCanvasGeometry";

export type PanAnchor = { x: number; y: number; origin: Transform };
export type PinchAnchor = { distance: number; scale: number; centerX: number; centerY: number; origin: Transform };

/** Start a pinch gesture from two active pointers. */
export function beginPinch(
  pointers: Map<number, PointerPoint>,
  currentScale: number,
  currentTransform: Transform = { x: 0, y: 0, scale: currentScale },
): PinchAnchor | null {
  if (pointers.size !== 2) return null;
  const [a, b] = Array.from(pointers.values());
  return {
    distance: distance(a, b),
    scale: currentScale,
    centerX: (a.x + b.x) / 2,
    centerY: (a.y + b.y) / 2,
    origin: currentTransform,
  };
}

/** Compute the next scale during an active pinch. */
export function computePinchScale(pointers: Map<number, PointerPoint>, anchor: PinchAnchor, minScale = 0.75, maxScale = 4): number {
  const [a, b] = Array.from(pointers.values());
  return clamp((distance(a, b) / anchor.distance) * anchor.scale, minScale, maxScale);
}

/** Pinch zoom with two-finger pan while zoomed. */
export function computePinchTransform(
  pointers: Map<number, PointerPoint>,
  anchor: PinchAnchor,
  minScale = 1,
  maxScale = 4,
): Transform {
  const [a, b] = Array.from(pointers.values());
  const centerX = (a.x + b.x) / 2;
  const centerY = (a.y + b.y) / 2;
  return {
    x: anchor.origin.x + (centerX - anchor.centerX),
    y: anchor.origin.y + (centerY - anchor.centerY),
    scale: clamp((distance(a, b) / anchor.distance) * anchor.scale, minScale, maxScale),
  };
}

/** Compute the next pan transform from a pointer move. */
export function computePanTransform(anchor: PanAnchor, clientX: number, clientY: number): Transform {
  return {
    x: anchor.origin.x + clientX - anchor.x,
    y: anchor.origin.y + clientY - anchor.y,
    scale: anchor.origin.scale,
  };
}

/** Re-anchor pan to a remaining pointer after a pinch ends. */
export function reanchorPan(pointers: Map<number, PointerPoint>, currentTransform: Transform): PanAnchor | null {
  if (pointers.size !== 1) return null;
  const remaining = Array.from(pointers.values())[0];
  return { x: remaining.x, y: remaining.y, origin: currentTransform };
}

/** Apply wheel-zoom to the current transform. */
export function applyWheelZoom(current: Transform, deltaY: number, minScale = 1, maxScale = 4): Transform {
  return { ...current, scale: clamp(current.scale - deltaY * 0.002, minScale, maxScale) };
}

export type StageSize = { width: number; height: number };

/**
 * Keep the photo covering the stage — the fix for "the photo slides over and
 * leaves black space".
 *
 * Two independent defects produced that: (1) the pan path applied
 * computePanTransform's raw translation with NO bound, so a drag could push
 * the image off the viewport entirely; (2) the default minScale was 0.75, so
 * pinching out shrank the image smaller than its own stage and letterboxed it.
 *
 * At scale s the image is s× the stage, so at most ((s-1)/2)·stage of
 * translation can be absorbed before an edge crosses into view. Below s=1
 * there is no valid translation at all, so the transform snaps home.
 * Assumes the image is rendered to COVER the stage at scale 1 (object-cover),
 * which is how the capture canvas renders it.
 */
export function clampTransformToStage(
  next: Transform,
  stage: StageSize | null | undefined,
  minScale = 1,
  maxScale = 4,
): Transform {
  const scale = clamp(next.scale, minScale, maxScale);
  if (!stage || scale <= 1.001) return { x: 0, y: 0, scale: Math.max(1, scale) };
  const maxX = ((scale - 1) * stage.width) / 2;
  const maxY = ((scale - 1) * stage.height) / 2;
  return {
    x: clamp(next.x, -maxX, maxX),
    y: clamp(next.y, -maxY, maxY),
    scale,
  };
}
