import type { CompareAnchor } from "./compare-anchor";
import { orientationDelta, type CompareLocator } from "./compare-locator";
import { mapThroughAnchors } from "./compare-sync";

/** Conservative overlay gate. Never implies metric world registration. */
export const OVERLAY_MAX_TIME_S = 2.5;
export const OVERLAY_MAX_YAW_DEG = 14;
export const OVERLAY_MAX_PITCH_DEG = 10;

export type OverlayGate = {
  enabled: boolean;
  approximate: true;
  reason: "no-anchor" | "time-or-orientation" | "ok";
};

export function overlayGate(
  anchors: CompareAnchor[],
  before: CompareLocator,
  after: CompareLocator | null,
): OverlayGate {
  const mapped = mapThroughAnchors(anchors, before);
  if (!mapped) return { enabled: false, approximate: true, reason: "no-anchor" };
  const nearAnchor = anchors.some((a) => {
    if (a.before.clipId !== before.clipId) return false;
    if (Math.abs(a.before.tSeconds - before.tSeconds) > OVERLAY_MAX_TIME_S) return false;
    const d = orientationDelta(a.before, before);
    return d.yaw <= OVERLAY_MAX_YAW_DEG && d.pitch <= OVERLAY_MAX_PITCH_DEG;
  });
  if (!nearAnchor) return { enabled: false, approximate: true, reason: "time-or-orientation" };
  if (after) {
    const toMapped = orientationDelta(mapped.locator, after);
    if (mapped.locator.clipId !== after.clipId) return { enabled: false, approximate: true, reason: "time-or-orientation" };
    if (Math.abs(mapped.locator.tSeconds - after.tSeconds) > OVERLAY_MAX_TIME_S) {
      return { enabled: false, approximate: true, reason: "time-or-orientation" };
    }
    if (toMapped.yaw > OVERLAY_MAX_YAW_DEG || toMapped.pitch > OVERLAY_MAX_PITCH_DEG) {
      return { enabled: false, approximate: true, reason: "time-or-orientation" };
    }
  }
  return { enabled: true, approximate: true, reason: "ok" };
}

export const APPROXIMATE_COPY = "Views are approximate";
