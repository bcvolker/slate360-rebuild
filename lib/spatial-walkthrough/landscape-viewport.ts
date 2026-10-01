/** Viewport signals for the landscape joystick HUD. Pure so tests can drive it. */

export type ViewportSnap = {
  width: number;
  height: number;
  /** `(pointer: coarse)` — phones and tablets. Desktop mice are fine. */
  coarsePointer: boolean;
  /** From `screen.orientation` or `(orientation: …)`. Null when unknown. */
  orientation: "landscape" | "portrait" | null;
};

export function isLandscapeOrientation(v: ViewportSnap): boolean {
  // Measured size wins when it disagrees with screen.orientation. Some browsers
  // update innerWidth on resize before the orientation type, and trusting the
  // stale label would leave the immersive frame up after a portrait rotation.
  if (v.width > 0 && v.height > 0 && v.width !== v.height) return v.width > v.height;
  if (v.orientation === "landscape") return true;
  if (v.orientation === "portrait") return false;
  return false;
}

/**
 * Show the dual sticks in landscape on touch devices, and on short landscape
 * viewports (phone landscape even when pointer detection is wrong).
 * Desktop monitors stay clear so mouse look is unchanged.
 */
export function showLandscapeJoystickHud(v: ViewportSnap): boolean {
  if (!isLandscapeOrientation(v)) return false;
  if (v.coarsePointer) return true;
  return v.height > 0 && v.height <= 520 && v.width > v.height;
}

/**
 * Leave immersive mode when a phone or tablet rotates to portrait.
 * A desktop window that happens to be taller than it is wide is left alone.
 */
export function shouldExitImmersiveOnPortrait(v: ViewportSnap): boolean {
  if (isLandscapeOrientation(v)) return false;
  if (v.coarsePointer) return true;
  return v.width > 0 && v.width <= 520;
}
