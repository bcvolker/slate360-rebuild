import { describe, expect, it } from "vitest";

import { poseDelta, projectSlide, walkDelta } from "./kitchen-capsule";

describe("kitchen capsule locomotion", () => {
  it("slides along a wall instead of stopping", () => {
    const [dx, dz] = projectSlide(1, 0, -1, 0);
    expect(dx).toBeCloseTo(0, 6);
    expect(dz).toBeCloseTo(0, 6);
    const [sx, sz] = projectSlide(1, 0.4, -1, 0);
    expect(sx).toBeCloseTo(0, 6);
    expect(sz).toBeCloseTo(0.4, 6);
  });

  it("walks forward along -Z at yaw 0", () => {
    const [dx, dz] = walkDelta(1, 0, 0, 1, 1);
    expect(dx).toBeCloseTo(0, 6);
    expect(dz).toBeCloseTo(-1, 6);
  });

  it("reports zero pose jump for identical cameras", () => {
    const p = { x: 1, y: 0.005, z: -2, yaw: 0.2, pitch: 0 };
    expect(poseDelta(p, { ...p })).toBe(0);
  });
});
