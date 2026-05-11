/**
 * Extracted gesture handling for PlanViewer — pan, pinch-zoom, long-press pin.
 * Uses direct DOM manipulation during gesture frames (zero React re-renders).
 *
 * Gesture rules:
 * - Pinch-zoom ALWAYS works regardless of toolMode (uses focal-point math).
 * - Single-finger pan works only in "pan" mode.
 * - Long-press to create pin works only in "draw" mode.
 */
import { useCallback, useRef, type PointerEvent } from "react";
import { clearPressTimer, clamp, MAX_PLAN_SCALE, MIN_PLAN_SCALE, pointerDistance, type Point, type Transform } from "./planViewerModel";

type GestureArgs = {
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  transformRef: React.MutableRefObject<Transform>;
  applyTransformToDOM: (t: Transform) => void;
  commitTransform: () => void;
  toolMode: "pan" | "draw";
  onLongPress: (point: Point) => void;
};

/** Compute the midpoint between two pointers (for focal-point zoom). */
function pinchMidpoint(pointers: Map<number, Point>): Point {
  const pts = Array.from(pointers.values());
  if (pts.length < 2) return pts[0] ?? { x: 0, y: 0 };
  return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
}

export function usePlanGestures({ surfaceRef, transformRef, applyTransformToDOM, commitTransform, toolMode, onLongPress }: GestureArgs) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStart = useRef<{ pointerId: number; point: Point; offset: Point; moved: boolean } | null>(null);
  const activePointers = useRef(new Map<number, Point>());
  const pinchStart = useRef<{ distance: number; scale: number; mid: Point } | null>(null);
  const gestureActive = useRef(false);

  const startPress = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const point = { x: event.clientX, y: event.clientY };
    activePointers.current.set(event.pointerId, point);
    const t = transformRef.current;
    gestureActive.current = true;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Safari multi-touch */ }

    // Two fingers → start pinch (always works, regardless of toolMode)
    if (activePointers.current.size >= 2) {
      clearPressTimer(pressTimer);
      dragStart.current = null;
      const mid = pinchMidpoint(activePointers.current);
      pinchStart.current = { distance: pointerDistance(activePointers.current), scale: t.scale, mid };
      return;
    }

    // Single finger — pan mode: start drag. Draw mode: start long-press timer only.
    if (toolMode === "pan") {
      dragStart.current = { pointerId: event.pointerId, point, offset: { x: t.x, y: t.y }, moved: false };
      // Also set up long-press for pin creation (even in pan mode, long-press drops a pin)
      pressTimer.current = setTimeout(() => {
        const drag = dragStart.current;
        if (!drag || drag.moved) return;
        activePointers.current.clear();
        pinchStart.current = null;
        dragStart.current = null;
        gestureActive.current = false;
        onLongPress(point);
      }, 500);
    } else {
      // Draw mode — long-press to create pin, no drag/pan
      dragStart.current = null;
      pressTimer.current = setTimeout(() => {
        activePointers.current.clear();
        pinchStart.current = null;
        gestureActive.current = false;
        onLongPress(point);
      }, 500);
    }
  }, [toolMode, onLongPress, transformRef]);

  const movePointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    // Pinch-zoom with focal-point math (always active)
    if (activePointers.current.size >= 2 && pinchStart.current) {
      clearPressTimer(pressTimer);
      const ratio = pointerDistance(activePointers.current) / Math.max(1, pinchStart.current.distance);
      const newScale = clamp(pinchStart.current.scale * ratio, MIN_PLAN_SCALE, MAX_PLAN_SCALE);
      const c = transformRef.current;
      const mid = pinchStart.current.mid;
      // Focal-point zoom: keep the pinch center stationary
      const scaleRatio = newScale / c.scale;
      const newX = c.x - (mid.x - c.x) * (scaleRatio - 1);
      const newY = c.y - (mid.y - c.y) * (scaleRatio - 1);
      applyTransformToDOM({ scale: newScale, x: newX, y: newY });
      return;
    }

    // Single-finger drag (pan mode only)
    const drag = dragStart.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.point.x;
    const dy = event.clientY - drag.point.y;
    if (Math.hypot(dx, dy) > 5) { drag.moved = true; clearPressTimer(pressTimer); }
    if (drag.moved) applyTransformToDOM({ ...transformRef.current, x: drag.offset.x + dx, y: drag.offset.y + dy });
  }, [applyTransformToDOM, transformRef]);

  const endPointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    clearPressTimer(pressTimer);
    activePointers.current.delete(event.pointerId);
    if (activePointers.current.size < 2) pinchStart.current = null;
    if (dragStart.current?.pointerId === event.pointerId) dragStart.current = null;
    if (activePointers.current.size === 0 && gestureActive.current) {
      gestureActive.current = false;
      commitTransform();
    }
  }, [commitTransform]);

  return { startPress, movePointer, endPointer };
}
