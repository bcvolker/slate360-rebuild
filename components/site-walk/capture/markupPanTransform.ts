/**
 * Pan and pinch-zoom transform helpers extracted from useMarkupCanvasState.
 * These handle viewport transforms for the markup canvas without drawing logic.
 */
import type { PointerPoint, Transform } from "./markupCanvasGeometry";
import { clamp, distance } from "./markupCanvasGeometry";

export type PanAnchor = { x: number; y: number; origin: Transform };
export type PinchAnchor = { distance: number; scale: number };

/** Start a pinch gesture from two active pointers. */
export function beginPinch(pointers: Map<number, PointerPoint>, currentScale: number): PinchAnchor | null {
  if (pointers.size !== 2) return null;
  const [a, b] = Array.from(pointers.values());
  return { distance: distance(a, b), scale: currentScale };
}

/** Compute the next scale during an active pinch. */
export function computePinchScale(pointers: Map<number, PointerPoint>, anchor: PinchAnchor, minScale = 0.75, maxScale = 4): number {
  const [a, b] = Array.from(pointers.values());
  return clamp((distance(a, b) / anchor.distance) * anchor.scale, minScale, maxScale);
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
export function applyWheelZoom(current: Transform, deltaY: number, minScale = 0.75, maxScale = 4): Transform {
  return { ...current, scale: clamp(current.scale - deltaY * 0.002, minScale, maxScale) };
}
