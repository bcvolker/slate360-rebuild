/**
 * Extracted gesture handling for PlanViewer — pan, pinch-zoom, long-press pin.
 * Uses direct DOM manipulation during gesture frames (zero React re-renders).
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

export function usePlanGestures({ surfaceRef, transformRef, applyTransformToDOM, commitTransform, toolMode, onLongPress }: GestureArgs) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStart = useRef<{ pointerId: number; point: Point; offset: Point; moved: boolean } | null>(null);
  const activePointers = useRef(new Map<number, Point>());
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
  const gestureActive = useRef(false);

  const startPress = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (toolMode === "draw") return;
    const point = { x: event.clientX, y: event.clientY };
    activePointers.current.set(event.pointerId, point);
    const t = transformRef.current;
    dragStart.current = { pointerId: event.pointerId, point, offset: { x: t.x, y: t.y }, moved: false };
    gestureActive.current = true;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Safari multi-touch */ }

    if (activePointers.current.size >= 2) {
      clearPressTimer(pressTimer);
      dragStart.current = null;
      pinchStart.current = { distance: pointerDistance(activePointers.current), scale: t.scale };
      return;
    }

    pressTimer.current = setTimeout(() => {
      const drag = dragStart.current;
      if (!drag || drag.moved) return;
      activePointers.current.clear();
      pinchStart.current = null;
      dragStart.current = null;
      gestureActive.current = false;
      onLongPress(point);
    }, 500);
  }, [toolMode, applyTransformToDOM, commitTransform, onLongPress, transformRef]);

  const movePointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.current.size >= 2 && pinchStart.current) {
      clearPressTimer(pressTimer);
      const ratio = pointerDistance(activePointers.current) / Math.max(1, pinchStart.current.distance);
      const c = transformRef.current;
      applyTransformToDOM({ ...c, scale: clamp(pinchStart.current!.scale * ratio, MIN_PLAN_SCALE, MAX_PLAN_SCALE) });
      return;
    }
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
