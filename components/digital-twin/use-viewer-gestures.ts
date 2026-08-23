"use client";

/**
 * Pointer gestures for the mesh viewer: tap to walk, drag to look, wheel and
 * pinch to zoom. Split out of MeshTwinViewer so that file stays under the size
 * guard and so the gesture rules — which have already caused two regressions —
 * live in one readable place.
 *
 * Zoom is FIELD OF VIEW, never a dolly: moving the camera off a station would
 * put the viewer where no imagery exists, whereas narrowing the lens lets a
 * contractor read a far wall from where they are standing.
 */

import { useCallback, useRef } from "react";

import type { WalkthroughNavigation } from "@/hooks/useWalkthroughNavigation";

const DEFAULT_FOV = 75;
const MIN_FOV = 25;
const MAX_FOV = 90;
const FOV_STEP = 4;
/** Degrees of FOV per pixel of pinch spread. */
const PINCH_SENSITIVITY = 0.08;

export { DEFAULT_FOV };

export function useViewerGestures(nav: WalkthroughNavigation) {
  const fovRef = useRef<number>(DEFAULT_FOV);
  const dragRef = useRef<{ x: number; y: number; moved: boolean; onCanvas: boolean } | null>(null);
  const pinchRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchRef = useRef<number>(0);

  // Navigation must be driven ONLY by the canvas. Without this check any
  // pointer-up reaching the wrapper counts as a click on the model, so a press
  // that lands on the control bar's padding rather than exactly on a button
  // falls through and walks the user to a station instead of switching mode.
  const fromCanvas = (e: React.PointerEvent | React.WheelEvent) =>
    e.target instanceof HTMLCanvasElement;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!fromCanvas(e)) return;
    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchRef.current.size >= 2) {
      // A second finger converts the gesture to a pinch; drop the drag so the
      // view does not lurch as the fingers separate.
      dragRef.current = null;
      lastPinchRef.current = 0;
      return;
    }
    // Capture so a drag that leaves the element keeps rotating — without this,
    // spinning in place stops the moment the pointer crosses the edge.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    // `onCanvas` is recorded HERE and trusted later. Pointer capture retargets
    // every subsequent event to the capturing element, so by pointer-up the
    // target is this wrapper div, not the canvas — re-checking it there
    // rejected every legitimate click on the model.
    dragRef.current = { x: e.clientX, y: e.clientY, moved: false, onCanvas: true };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Two fingers down: pinch to zoom, and suppress look-drag so the gesture
      // does not also spin the view while the user is scaling it.
      if (pinchRef.current.size >= 2) {
        pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [a, b] = Array.from(pinchRef.current.values());
        const spread = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinchRef.current > 0) {
          const delta = (lastPinchRef.current - spread) * PINCH_SENSITIVITY;
          fovRef.current = Math.min(MAX_FOV, Math.max(MIN_FOV, fovRef.current + delta));
        }
        lastPinchRef.current = spread;
        return;
      }
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      // A few pixels of slop so a tap with a shaky thumb still reads as a tap.
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      nav.handleLookDrag(dx, dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
    },
    [nav],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      pinchRef.current.delete(e.pointerId);
      if (pinchRef.current.size < 2) lastPinchRef.current = 0;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      if (!drag || drag.moved || !drag.onCanvas) return;
      const rect = e.currentTarget.getBoundingClientRect();
      nav.handleCanvasClick(e.clientX - rect.left, e.clientY - rect.top);
    },
    [nav],
  );

  // Zoom is field of view, not dolly. Moving the camera off a station would
  // put the viewer where no imagery exists; narrowing the lens lets a
  // contractor read a detail on a far wall from where they are standing.
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!fromCanvas(e)) return;
    const next = fovRef.current + (e.deltaY > 0 ? FOV_STEP : -FOV_STEP);
    fovRef.current = Math.min(MAX_FOV, Math.max(MIN_FOV, next));
  }, []);


  /** Cancel abandons the whole gesture: OS-level interruptions leave a stale
   *  drag otherwise, and the next tap reads as a 300-pixel look-drag. */
  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    pinchRef.current.delete(e.pointerId);
    lastPinchRef.current = 0;
  }, []);

  return {
    fovRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleWheel,
  };
}
