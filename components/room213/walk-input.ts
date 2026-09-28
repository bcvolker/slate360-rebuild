import * as THREE from "three";

/** High-frequency Walk input shared between DOM handlers and the frame loop (refs only, no React state). */
export type WalkInput = {
  keys: Set<string>;
  /** Joystick axes in -1..1: x = strafe right, y = forward. */
  stick: { x: number; y: number; active: boolean };
  /** Right (look) joystick axes in -1..1: x = turn right, y = look up. */
  look: { x: number; y: number; active: boolean };
  /** Pending wheel travel in scene units (+ forward), drained smoothly by the frame loop. */
  wheel: number;
};

export function createWalkInput(): WalkInput {
  return { keys: new Set(), stick: { x: 0, y: 0, active: false }, look: { x: 0, y: 0, active: false }, wheel: 0 };
}

export function clearWalkInput(input: WalkInput): void {
  input.keys.clear();
  input.stick.x = 0;
  input.stick.y = 0;
  input.stick.active = false;
  input.look.x = 0;
  input.look.y = 0;
  input.look.active = false;
  input.wheel = 0;
}

export const WALK_SPEED = 1.3; // scene units / s at full input (≈1.4 m/s at the solve's unvalidated scale)
export const TURN_SPEED = Math.PI * 0.55; // rad / s for Left/Right
export const LOOK_STICK_YAW = Math.PI * 0.6; // rad / s at full right-stick deflection
export const LOOK_STICK_PITCH = Math.PI * 0.35;
export const WHEEL_UNITS_PER_NOTCH = 0.3;
export const MAX_TAP_STEP = 2.6; // bounded click/tap step, scene units
export const PITCH_LIMIT = THREE.MathUtils.degToRad(70);

const MOVE_KEYS: Record<string, [number, number]> = {
  w: [1, 0], arrowup: [1, 0], s: [-1, 0], arrowdown: [-1, 0], a: [0, -1], d: [0, 1],
};

/** Forward/strafe demand from keys + joystick (each -1..1), and turn demand from Left/Right. */
export function walkAxes(input: WalkInput): { forward: number; strafe: number; turn: number } {
  let forward = 0;
  let strafe = 0;
  for (const k of input.keys) {
    const m = MOVE_KEYS[k];
    if (m) {
      forward += m[0];
      strafe += m[1];
    }
  }
  if (input.stick.active) {
    forward += input.stick.y;
    strafe += input.stick.x;
  }
  const turn = (input.keys.has("arrowleft") ? 1 : 0) - (input.keys.has("arrowright") ? 1 : 0);
  return { forward: THREE.MathUtils.clamp(forward, -1, 1), strafe: THREE.MathUtils.clamp(strafe, -1, 1), turn };
}

export const WALK_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);

/** Camera forward on the ground plane for a yaw (three.js camera looks down -z at yaw 0). */
export function groundForward(yaw: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(-Math.sin(yaw), 0, -Math.cos(yaw));
}
