import { describe, expect, it } from "vitest";
import {
  LOOK_PITCH_DEG_PER_S,
  LOOK_YAW_DEG_PER_S,
  PITCH_LIMIT_DEG,
  SEEK_FULL_SPAN_S,
  lookFromStick,
  seekFromStickX,
  stickFromPointer,
} from "./joystick-map";

describe("walkthrough joystick map", () => {
  it("ignores motion inside the deadzone and clamps to the rim", () => {
    expect(stickFromPointer(4, 2, 36)).toEqual({ x: 0, y: 0 });
    const full = stickFromPointer(36, 0, 36);
    expect(full.x).toBeCloseTo(1);
    expect(full.y).toBeCloseTo(0);
    const past = stickFromPointer(80, 0, 36);
    expect(past.x).toBeCloseTo(1);
  });

  it("seeks on stick X only, relative to duration", () => {
    const duration = 80;
    const dt = 0.5;
    const forward = seekFromStickX(10, duration, 1, dt);
    expect(forward).toBeCloseTo(10 + (duration / SEEK_FULL_SPAN_S) * dt);
    expect(seekFromStickX(10, duration, -1, dt)).toBeCloseTo(10 - (duration / SEEK_FULL_SPAN_S) * dt);
    expect(seekFromStickX(1, duration, -1, 2)).toBe(0);
    expect(seekFromStickX(duration - 1, duration, 1, 2)).toBe(duration);
    expect(seekFromStickX(10, duration, 0, dt)).toBe(10);
    expect(seekFromStickX(10, 0, 1, dt)).toBe(10);
  });

  it("yaws with stick X and looks up when the stick moves up", () => {
    const right = lookFromStick({ yaw: 5, pitch: 0 }, { x: 1, y: 0 }, 0.5);
    expect(right.yaw).toBeCloseTo(5 + LOOK_YAW_DEG_PER_S * 0.5);
    expect(right.pitch).toBeCloseTo(0);
    const up = lookFromStick({ yaw: 0, pitch: 0 }, { x: 0, y: -1 }, 1);
    expect(up.pitch).toBeCloseTo(LOOK_PITCH_DEG_PER_S);
    const clamped = lookFromStick({ yaw: 0, pitch: 80 }, { x: 0, y: -1 }, 1);
    expect(clamped.pitch).toBe(PITCH_LIMIT_DEG);
    const down = lookFromStick({ yaw: 0, pitch: -80 }, { x: 0, y: 1 }, 1);
    expect(down.pitch).toBe(-PITCH_LIMIT_DEG);
  });
});
