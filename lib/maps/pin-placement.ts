/**
 * Location-pin maps (project picker, create wizard, marketing contact form)
 * used to treat every map click as "drop a pin". A tap, the first finger of
 * a pinch, or a short pan that Google still reports as a click would place
 * a pin before the user had found the site.
 *
 * Placement is allowed only while the explicit place tool is on, and only
 * for a finished single-finger tap. Pan, pinch, and an idle explore tool
 * never place or move a pin.
 */

export type MapPinTool = "explore" | "place" | "boundary";

export type MapClickAction = "ignore" | "place" | "boundary-vertex";

const TAP_MOVE_PX = 10;

export function pinToolFromPicker(tool: string): MapPinTool {
  if (tool === "polygondraw") return "boundary";
  if (tool === "marker") return "place";
  return "explore";
}

export function mapClickAction(tool: MapPinTool, cleanTap: boolean): MapClickAction {
  if (!cleanTap) return "ignore";
  if (tool === "boundary") return "boundary-vertex";
  if (tool === "place") return "place";
  return "ignore";
}

export type MapTapGate = {
  pointerDown: (pointerId: number, x: number, y: number) => void;
  pointerMove: (pointerId: number, x: number, y: number) => void;
  pointerUp: (pointerId: number) => void;
  pointerCancel: (pointerId: number) => void;
  /**
   * Call from the map click handler.
   * A click with no preceding pointer events (listener not attached yet)
   * is treated as a tap so desktop placement still works. A tracked pan,
   * pinch, or still-active pointer is rejected.
   */
  consumeClick: () => boolean;
};

export function createMapTapGate(moveThresholdPx = TAP_MOVE_PX): MapTapGate {
  const starts = new Map<number, { x: number; y: number }>();
  let gestureMoved = false;
  let pendingTap: boolean | null = null;

  const finishGesture = (wasTap: boolean) => {
    pendingTap = wasTap;
    gestureMoved = false;
  };

  return {
    pointerDown(pointerId, x, y) {
      starts.set(pointerId, { x, y });
      if (starts.size === 1) gestureMoved = false;
      if (starts.size > 1) gestureMoved = true;
    },
    pointerMove(pointerId, x, y) {
      const start = starts.get(pointerId);
      if (!start) return;
      if (Math.hypot(x - start.x, y - start.y) >= moveThresholdPx) gestureMoved = true;
    },
    pointerUp(pointerId) {
      if (!starts.has(pointerId)) return;
      starts.delete(pointerId);
      if (starts.size === 0) finishGesture(!gestureMoved);
    },
    pointerCancel(pointerId) {
      if (!starts.has(pointerId)) return;
      starts.delete(pointerId);
      if (starts.size === 0) finishGesture(false);
    },
    consumeClick() {
      if (starts.size > 0) return false;
      if (pendingTap === null) return true;
      const allow = pendingTap;
      pendingTap = null;
      return allow;
    },
  };
}

export function bindMapTapGate(target: HTMLElement, gate: MapTapGate): () => void {
  const down = (event: PointerEvent) => gate.pointerDown(event.pointerId, event.clientX, event.clientY);
  const move = (event: PointerEvent) => gate.pointerMove(event.pointerId, event.clientX, event.clientY);
  const up = (event: PointerEvent) => gate.pointerUp(event.pointerId);
  const cancel = (event: PointerEvent) => gate.pointerCancel(event.pointerId);
  target.addEventListener("pointerdown", down, true);
  target.addEventListener("pointermove", move, true);
  target.addEventListener("pointerup", up, true);
  target.addEventListener("pointercancel", cancel, true);
  return () => {
    target.removeEventListener("pointerdown", down, true);
    target.removeEventListener("pointermove", move, true);
    target.removeEventListener("pointerup", up, true);
    target.removeEventListener("pointercancel", cancel, true);
  };
}
