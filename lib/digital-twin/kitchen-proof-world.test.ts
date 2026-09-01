import { describe, expect, it } from "vitest";

import { applySim3, vec3 } from "./s360-world";
import {
  EXACT_FRAME_SIM3_SCALE,
  exactFrameSim3,
  kitchenDefaultStation,
  kitchenEyeY,
  KITCHEN_APPEARANCE_AVAILABLE,
  KITCHEN_APPEARANCE_KIND,
  KITCHEN_DEFAULT_STATION,
  KITCHEN_FLOOR_Y,
  KITCHEN_HUMAN_FOV,
  KITCHEN_SPLAT_IDENTITY_MATRIX,
  KITCHEN_SPLAT_MAX,
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

  it("loads Brush appearance baked into ARKit, not a view-time SIM3", () => {
    expect(KITCHEN_APPEARANCE_AVAILABLE).toBe(true);
    expect(KITCHEN_APPEARANCE_KIND).toBe("brush_x4_arkit.spz");
    expect(KITCHEN_SPLAT_MAX).toBeGreaterThanOrEqual(672_348);
    expect(KITCHEN_SPLAT_IDENTITY_MATRIX).toHaveLength(16);
    expect(KITCHEN_SPLAT_IDENTITY_MATRIX[0]).toBe(1);
    expect(KITCHEN_SPLAT_IDENTITY_MATRIX[15]).toBe(1);
  });

  it("starts at a human-eye hero station", () => {
    expect(KITCHEN_DEFAULT_STATION).toBe("hero");
    const home = kitchenDefaultStation();
    expect(home.id).toBe("hero");
    expect(home.position[1]).toBe(KITCHEN_FLOOR_Y);
  });

  it("names the hero start plus the walk targets", () => {
    expect(KITCHEN_STATIONS.map((s) => s.id)).toEqual(["hero", "human", "fridge", "island", "opening"]);
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
