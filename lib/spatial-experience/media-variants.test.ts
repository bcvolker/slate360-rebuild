import { describe, expect, it } from "vitest";
import { pickGaussianVariant, pickPlanVariant, pickStationVariant, pickWalkVariant } from "./media-variants";

describe("media variants", () => {
  it("never requires technical names in the client API return", () => {
    expect(pickStationVariant({ viewportCss: 390, devicePixelRatio: 2, saveData: true })).toBe("preview");
    expect(pickWalkVariant({ viewportCss: 1280, devicePixelRatio: 1, quality: "high" })).toBe("high");
    expect(pickPlanVariant(false)).toBe("pdf");
    expect(pickGaussianVariant({ viewportCss: 390, devicePixelRatio: 2 })).toBe("mobile");
  });
});
