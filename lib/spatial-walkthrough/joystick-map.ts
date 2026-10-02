/**
 * Virtual-stick mapping for the directed walkthrough.
 *
 * Left stick — timeline scrub on the horizontal axis only.
 * Push right (positive x) seeks forward; push left seeks backward.
 * The vertical axis is ignored for time so a resting thumb does not scrub.
 * At full deflection the playhead crosses the whole duration in
 * {@link SEEK_FULL_SPAN_S} seconds.
 *
 * Right stick — look.
 * Positive x yaws right. Screen-up (negative y) raises pitch (look up).
 */

export const STICK_DEADZONE = 0.18;
export const SEEK_FULL_SPAN_S = 8;
export const LOOK_YAW_DEG_PER_S = 80;
export const LOOK_PITCH_DEG_PER_S = 50;
export const PITCH_LIMIT_DEG = 85;

export type StickVector = { x: number; y: number };

export function stickFromPointer(dx: number, dy: number, radius: number): StickVector {
  const r = Math.max(radius, 1);
  let x = dx / r;
  let y = dy / r;
  const mag = Math.hypot(x, y);
  if (mag < STICK_DEADZONE) return { x: 0, y: 0 };
  const clamped = Math.min(1, mag);
  const scale = (clamped - STICK_DEADZONE) / (1 - STICK_DEADZONE);
  return { x: (x / mag) * scale, y: (y / mag) * scale };
}

export function seekFromStickX(currentT: number, duration: number, stickX: number, dt: number): number {
  if (!(duration > 0) || stickX === 0 || !(dt > 0)) return currentT;
  const rate = duration / SEEK_FULL_SPAN_S;
  const next = currentT + stickX * rate * dt;
  return Math.min(duration, Math.max(0, next));
}

export function lookFromStick(
  view: { yaw: number; pitch: number },
  stick: StickVector,
  dt: number,
): { yaw: number; pitch: number } {
  if (!(dt > 0)) return view;
  const yaw = view.yaw + stick.x * LOOK_YAW_DEG_PER_S * dt;
  const pitch = view.pitch - stick.y * LOOK_PITCH_DEG_PER_S * dt;
  return { yaw, pitch: Math.min(PITCH_LIMIT_DEG, Math.max(-PITCH_LIMIT_DEG, pitch)) };
}
