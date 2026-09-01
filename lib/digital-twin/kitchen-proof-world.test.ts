import { describe, expect, it } from "vitest";

import { applySim3, vec3 } from "./s360-world";
import {
  EXACT_FRAME_SIM3_SCALE,
  exactFrameSim3,
  kitchenEyeY,
  KITCHEN_APPEARANCE_AVAILABLE,
  KITCHEN_FLOOR_Y,
  KITCHEN_HUMAN_FOV,
  KITCHEN_STATIONS,
} from "./kitchen-proof-world";

describe("kitchen proof world", () => {
  it("keeps human-eye height in the 1.5–1.65 m band above the detected floor", () => {
    const eye = kitchenEyeY();
    expect(eye - KITCHEN_FLOOR_Y).toBeCloseTo(1.6, 6);
    expect(eye).toBeGreaterThan(KITCHEN_FLOOR_Y + 1.5);
    expect(eye).toBeLessThan(KITCHEN_FLOOR_Y + 1.65);
  });

  it("starts FOV in the 65–80° band", () => {
    expect(KITCHEN_HUMAN_FOV).toBeGreaterThanOrEqual(65);
    expect(KITCHEN_HUMAN_FOV).toBeLessThanOrEqual(80);
  });

  it("does not claim a trained V1 Gaussian is available", () => {
    expect(KITCHEN_APPEARANCE_AVAILABLE).toBe(false);
  });

  it("names the three walk targets plus the human opening view", () => {
    expect(KITCHEN_STATIONS.map((s) => s.id)).toEqual(["human", "fridge", "island", "opening"]);
  });

  it("applies locked EXACT_FRAME_SIM3 without Spark Rx(π)", () => {
    const sim = exactFrameSim3();
    expect(sim.scale).toBe(1);
    expect(EXACT_FRAME_SIM3_SCALE).toBeCloseTo(0.6300199669353641, 9);
    const tag0x4 = vec3(2.1801455987865324, 0.25205560627800566, 0.1845032104679485);
    const out = applySim3(sim, tag0x4);
    expect(out.x).toBeCloseTo(0.6077676545055801, 3);
    expect(out.y).toBeCloseTo(0.05263148427980266, 3);
    expect(out.z).toBeCloseTo(-1.6845858826355267, 3);
  });
});
