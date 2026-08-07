import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * NAV-FIX-2 — actual locomotion for Walk mode. Interior navigation shipped
 * look-only (drag = turn head, wheel = FOV zoom, no way to move), which made
 * "walkthrough" a standing tripod. This hook owns the WASD/arrow key state;
 * the per-frame displacement math lives here so the navigation component
 * stays under the file-size gate.
 */

const WALK_KEYS = new Set([
  "w", "a", "s", "d",
  "arrowup", "arrowdown", "arrowleft", "arrowright",
  "shift",
]);

/** Metres per second at a typical room scale, scaled by scene size below. */
const WALK_SPEED_FRACTION = 0.22; // of the scene's largest dimension, per second
const WALK_SPEED_MIN = 0.8;
const WALK_SPEED_MAX = 6;
const SPRINT_MULTIPLIER = 2.2;
/** Keep the eye inside the scene with a little headroom off every bound. */
const BOUNDS_MARGIN = 0.15;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

export function useWalkKeys(active: boolean): React.MutableRefObject<Set<string>> {
  const keysRef = useRef(new Set<string>());

  useEffect(() => {
    if (!active) {
      keysRef.current.clear();
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (!WALK_KEYS.has(key)) return;
      keysRef.current.add(key);
      // Arrow keys otherwise scroll the page while walking.
      if (key.startsWith("arrow")) event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };
    const onBlur = () => keysRef.current.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      keysRef.current.clear();
    };
  }, [active]);

  return keysRef;
}

const scratchForward = new THREE.Vector3();
const scratchRight = new THREE.Vector3();

/**
 * Advance `position` in the horizontal plane from the held keys. Movement is
 * yaw-relative (W walks where you're looking, ground-plane only) and clamped
 * inside the scene bounds so you cannot walk out of the model into the void.
 * Returns true when the position changed (caller re-applies the camera).
 */
export function applyWalkMovement(
  keys: ReadonlySet<string>,
  yaw: number,
  delta: number,
  bounds: THREE.Box3 | null,
  position: THREE.Vector3,
): boolean {
  if (keys.size === 0) return false;
  const forwardInput =
    (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
    (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
  const strafeInput =
    (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
    (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  if (forwardInput === 0 && strafeInput === 0) return false;

  let speed = WALK_SPEED_MAX;
  if (bounds && !bounds.isEmpty()) {
    const size = bounds.getSize(scratchForward);
    const largest = Math.max(size.x, size.y, size.z);
    speed = THREE.MathUtils.clamp(
      largest * WALK_SPEED_FRACTION,
      WALK_SPEED_MIN,
      WALK_SPEED_MAX,
    );
  }
  if (keys.has("shift")) speed *= SPRINT_MULTIPLIER;

  // Ground-plane basis from yaw only — pitch must not turn W into "fly".
  scratchForward.set(Math.sin(yaw), 0, Math.cos(yaw));
  scratchRight.set(scratchForward.z, 0, -scratchForward.x);

  position.addScaledVector(scratchForward, forwardInput * speed * delta);
  position.addScaledVector(scratchRight, strafeInput * speed * delta);

  if (bounds && !bounds.isEmpty()) {
    position.x = THREE.MathUtils.clamp(
      position.x,
      bounds.min.x + BOUNDS_MARGIN,
      bounds.max.x - BOUNDS_MARGIN,
    );
    position.z = THREE.MathUtils.clamp(
      position.z,
      bounds.min.z + BOUNDS_MARGIN,
      bounds.max.z - BOUNDS_MARGIN,
    );
  }
  return true;
}
