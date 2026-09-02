import { describe, expect, it } from "vitest";

import { HOUSEWALK_OPERATOR_KEYFRAMES } from "./housewalk-operator";
import {
  clampViewToRegard,
  COVERAGE_REQUIRED,
  fieldOfRegardAt,
  waypointHiddenByOperator,
  yawInOperatorSector,
} from "./field-of-regard";

describe("field of regard", () => {
  it("interpolates the operator sector and keeps look-ahead free", () => {
    const regard = fieldOfRegardAt(0, HOUSEWALK_OPERATOR_KEYFRAMES);
    expect(regard?.operatorYawCenter).toBe(-180);
    expect(yawInOperatorSector(0, regard!)).toBe(false);
    expect(yawInOperatorSector(-180, regard!)).toBe(true);
  });

  it("soft-stops at the sector edge across the +/-180 seam", () => {
    const regard = fieldOfRegardAt(0, HOUSEWALK_OPERATOR_KEYFRAMES)!;
    const hit = clampViewToRegard(-180, -20, regard);
    expect(hit.clamped).toBe(true);
    expect(yawInOperatorSector(hit.yaw, regard)).toBe(false);
    expect(COVERAGE_REQUIRED).toContain("Coverage required");
  });

  it("flags a waypoint sitting in the operator sector", () => {
    const regard = fieldOfRegardAt(18, HOUSEWALK_OPERATOR_KEYFRAMES);
    expect(waypointHiddenByOperator(-180, -40, regard)).toBe(true);
    expect(waypointHiddenByOperator(10, 0, regard)).toBe(false);
  });
});
