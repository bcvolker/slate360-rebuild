import { describe, expect, it } from "vitest";
import { applyPlanFrame, solvePlanFrame } from "./plan-calibration";

describe("plan calibration", () => {
  it("recovers a known scale/rotation from two controls", () => {
    const frame = solvePlanFrame([
      { pathX: 0, pathY: 0, planU: 10, planV: 20 },
      { pathX: 10, pathY: 0, planU: 10, planV: 40 },
    ]);
    expect(frame).not.toBeNull();
    expect(frame!.controlCount).toBe(2);
    const mid = applyPlanFrame(frame!, 5, 0);
    expect(mid.u).toBeCloseTo(10, 5);
    expect(mid.v).toBeCloseTo(30, 5);
  });

  it("refuses a single control", () => {
    expect(solvePlanFrame([{ pathX: 0, pathY: 0, planU: 1, planV: 1 }])).toBeNull();
  });
});
