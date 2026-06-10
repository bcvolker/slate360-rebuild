import type { Transform } from "@/components/site-walk/capture/markupCanvasGeometry";
import { clamp } from "@/components/site-walk/capture/markupCanvasGeometry";

export type DoubleTapTracker = { lastTime: number; lastX: number; lastY: number };

export function createDoubleTapTracker(): DoubleTapTracker {
  return { lastTime: 0, lastX: 0, lastY: 0 };
}

export function isDoubleTap(tracker: DoubleTapTracker, clientX: number, clientY: number, now = Date.now()) {
  const elapsed = now - tracker.lastTime;
  const distance = Math.hypot(clientX - tracker.lastX, clientY - tracker.lastY);
  tracker.lastTime = now;
  tracker.lastX = clientX;
  tracker.lastY = clientY;
  return elapsed > 0 && elapsed < 320 && distance < 28;
}

export function applyDoubleTapZoom(
  current: Transform,
  clientX: number,
  clientY: number,
  rect: DOMRect,
  resetThreshold = 1.05,
  targetScale = 2,
  maxScale = 4,
): Transform {
  if (current.scale > resetThreshold) return { x: 0, y: 0, scale: 1 };
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const nextScale = clamp(targetScale, 1, maxScale);
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  return {
    x: current.x - dx * (nextScale - current.scale),
    y: current.y - dy * (nextScale - current.scale),
    scale: nextScale,
  };
}
