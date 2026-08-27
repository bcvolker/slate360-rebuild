import { describe, expect, it } from "vitest";
import {
  estimateTwinGpuUsd,
  formatTwinGpuUsd,
} from "./gpu-usd-estimate";

describe("estimateTwinGpuUsd", () => {
  it("prices the hybrid viewer at zero", () => {
    const estimate = estimateTwinGpuUsd("viewer_only");
    expect(estimate.usdHigh).toBe(0);
    expect(formatTwinGpuUsd(estimate)).toBe("$0");
  });

  it("quotes a bounded A10G range for the authors' ODGS sample", () => {
    const estimate = estimateTwinGpuUsd("odgs_authors_sample");
    expect(estimate.gpu).toBe("A10G");
    expect(estimate.usdLow).toBeGreaterThan(0);
    expect(estimate.usdHigh).toBeGreaterThan(estimate.usdLow);
    expect(estimate.usdHigh).toBeLessThan(5);
  });

  it("keeps an X4 clip more expensive than the authors' sample", () => {
    const sample = estimateTwinGpuUsd("odgs_authors_sample");
    const clip = estimateTwinGpuUsd("odgs_x4_clip");
    expect(clip.usdLow).toBeGreaterThanOrEqual(sample.usdLow);
    expect(clip.usdHigh).toBeGreaterThan(sample.usdHigh);
  });
});
