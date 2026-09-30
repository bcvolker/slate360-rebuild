import { describe, expect, it } from "vitest";

import { applySim3, vec3 } from "./s360-world";
import {
  EXACT_FRAME_SIM3_SCALE,
  exactFrameSim3,
  kitchenDefaultStation,
  kitchenEyeY,
  KITCHEN_APPEARANCE_AVAILABLE,
  KITCHEN_APPEARANCE_KIND,
  KITCHEN_APPEARANCE_RESEARCH_KIND,
  KITCHEN_DEFAULT_STATION,
  KITCHEN_FIDELITY_CAMERA,
  KITCHEN_FLOOR_Y,
  KITCHEN_HUMAN_FOV,
  KITCHEN_SPLAT_MAX,
  KITCHEN_SPLAT_WORLD_MATRIX,
  KITCHEN_STATIONS,
} from "./kitchen-proof-world";
import { BRUSH_B_PRIMITIVE_COUNT } from "./spark-appearance-load";

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

  it("loads native Brush B and applies EXACT_FRAME_SIM3 as the Spark scene transform", () => {
    expect(KITCHEN_APPEARANCE_AVAILABLE).toBe(true);
    expect(KITCHEN_APPEARANCE_KIND).toBe("appearance-web.spz");
    expect(KITCHEN_APPEARANCE_RESEARCH_KIND).toBe("brush_x4_arkit.spz");
    expect(KITCHEN_SPLAT_MAX).toBe(BRUSH_B_PRIMITIVE_COUNT);
    const sim = exactFrameSim3();
    expect(KITCHEN_SPLAT_WORLD_MATRIX).toEqual(sim.matrix);
    expect(KITCHEN_SPLAT_WORLD_MATRIX[0]).toBeCloseTo(-0.5514738399579077, 9);
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

  it("pins the fridge fidelity camera to the registered kitchen station", () => {
    expect(KITCHEN_FIDELITY_CAMERA.position[0]).toBeCloseTo(0.72, 6);
    expect(KITCHEN_FIDELITY_CAMERA.position[1]).toBeCloseTo(kitchenEyeY(), 9);
    expect(KITCHEN_FIDELITY_CAMERA.position[2]).toBeCloseTo(-1.7, 6);
    expect(KITCHEN_FIDELITY_CAMERA.quaternionXyzw[1]).toBeCloseTo(-0.412321, 3);
    expect(KITCHEN_FIDELITY_CAMERA.quaternionXyzw[3]).toBeCloseTo(0.911039, 3);
  });
});
