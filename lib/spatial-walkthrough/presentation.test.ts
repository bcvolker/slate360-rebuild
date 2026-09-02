import { describe, expect, it } from "vitest";
import { HOUSEWALK_PRESENTATION, HORIZON_REEXPORT_WORKFLOW, REEXPORT_FROM_STUDIO_REQUIRED } from "./presentation";

describe("HouseWalk presentation", () => {
  it("does not claim a horizon-locked source and requires studio re-export", () => {
    expect(HOUSEWALK_PRESENTATION.horizonLocked).toBe(false);
    expect(HOUSEWALK_PRESENTATION.levelOffsetPitchDeg).toBe(0);
    expect(HOUSEWALK_PRESENTATION.reexportRequired).toBe(true);
    expect(REEXPORT_FROM_STUDIO_REQUIRED).toBe("REEXPORT_FROM_STUDIO_REQUIRED");
    expect(HORIZON_REEXPORT_WORKFLOW[0]).toMatch(/INSV/);
  });
});
