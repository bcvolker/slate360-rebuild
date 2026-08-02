import { describe, expect, it } from "vitest";
import { resolveTwinQualityStatus } from "../../lib/digital-twin/twin-quality-status";

describe("resolveTwinQualityStatus", () => {
  it("keeps unregistered exterior output honest", () => {
    expect(resolveTwinQualityStatus({ georeferenceStatus: "UNREGISTERED" })).toBe("UNREGISTERED");
  });

  it("marks measured but visually ungated output estimated", () => {
    expect(resolveTwinQualityStatus({ metric_scale_applied: true })).toBe("ESTIMATED");
  });

  it("does not call an unmeasured model verified", () => {
    expect(resolveTwinQualityStatus({})).toBe("LOW CONFIDENCE");
  });

  it("accepts an explicit verified georeference gate", () => {
    expect(resolveTwinQualityStatus({ georeferenceStatus: "verified" })).toBe("VERIFIED");
  });
});
