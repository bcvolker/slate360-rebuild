import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOOK_CONE,
  MAX_PAINT_COVERAGE,
  STILL_FOV,
  clampViewIntoCone,
  maxPaintCoverage,
  paintSectors,
  paintVisibleInCone,
  parseLookCone,
} from "./look-cone";
import { DEFAULT_OPERATOR_PATCH } from "@/lib/spatial-walkthrough/types";

const cone = { headingDeg: 0, halfWidthDeg: 110, pitchMinDeg: -30, pitchMaxDeg: 80 };

describe("look cone", () => {
  it("keeps a forward view unchanged", () => {
    expect(clampViewIntoCone(cone, 10, 5)).toEqual({ yaw: 10, pitch: 5, adjusted: false });
  });

  it("pulls a view that would show the operator back inside, frame edges included", () => {
    const r = clampViewIntoCone(cone, 180, -60);
    expect(r.adjusted).toBe(true);
    expect(Math.abs(((r.yaw + 540) % 360) - 180)).toBeLessThanOrEqual(cone.halfWidthDeg - STILL_FOV.h / 2 + 0.01);
    expect(r.pitch - STILL_FOV.v / 2).toBeGreaterThanOrEqual(cone.pitchMinDeg - 0.01);
  });

  it("wraps around 0/360", () => {
    const r = clampViewIntoCone({ ...cone, headingDeg: 350 }, 20, 0);
    expect(r.adjusted).toBe(false);
    expect(r.yaw).toBe(20);
  });

  it("parses and limits stored cones", () => {
    expect(parseLookCone({ headingDeg: -10, halfWidthDeg: 400, pitchMinDeg: -89, pitchMaxDeg: 80 })).toEqual({
      headingDeg: 350,
      halfWidthDeg: 150,
      pitchMinDeg: -60,
      pitchMaxDeg: 80,
    });
    expect(parseLookCone({ headingDeg: 0 })).toBeNull();
  });
});

describe("operator paint vs the published view", () => {
  it("the default rear-low paint stays out of the default cone and under the coverage cap", () => {
    const sectors = paintSectors(DEFAULT_OPERATOR_PATCH);
    expect(paintVisibleInCone(sectors, DEFAULT_LOOK_CONE)).toBe(false);
    expect(maxPaintCoverage(sectors)).toBeLessThan(MAX_PAINT_COVERAGE);
  });

  it("flags a below-the-horizon blackout (the AOB205 bake) as visible and oversized", () => {
    const blackout = { enabled: true, rearYawCenter: 0, rearYawWidth: 360, pitchMin: -88, pitchMax: 4 };
    const sectors = paintSectors(blackout);
    expect(paintVisibleInCone(sectors, cone)).toBe(true);
    expect(maxPaintCoverage(sectors)).toBeGreaterThan(MAX_PAINT_COVERAGE);
  });

  it("a disabled paint never blocks", () => {
    expect(paintSectors({ enabled: false })).toEqual([]);
  });
});
