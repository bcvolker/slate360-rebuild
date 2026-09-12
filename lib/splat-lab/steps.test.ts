import { describe, expect, it } from "vitest";

import {
  ramEstimateBytes,
  ramFitsBudget,
  resolveAutoSplatCap,
  resolveAutoSteps,
  resolveSplatCap,
  resolveSteps,
  viewPx,
} from "./steps";

// Reference numbers from the reference studio's own kitchen job manifest
// (815 panoramas x 16 views = 13,040 views, imagesPerStep 2):
//   stepResolution.EffectiveSteps = 326,000
//   splatCapResolution.EffectiveLimit = 6,520,000
const KITCHEN_VIEWS = 13_040;
const KITCHEN_IMAGES_PER_STEP = 2;

describe("resolveAutoSteps", () => {
  it("matches the reference kitchen job: 13,040 views -> 326,000 steps", () => {
    expect(resolveAutoSteps(KITCHEN_VIEWS, KITCHEN_IMAGES_PER_STEP)).toBe(326_000);
  });

  it("floors at 25,000 for a tiny capture", () => {
    expect(resolveAutoSteps(16, 2)).toBe(25_000);
  });

  it("returns the floor when there are zero views", () => {
    expect(resolveAutoSteps(0, 2)).toBe(25_000);
  });
});

describe("resolveAutoSplatCap", () => {
  it("matches the reference kitchen job: 13,040 views -> 6,520,000 splats", () => {
    expect(resolveAutoSplatCap(KITCHEN_VIEWS)).toBe(6_520_000);
  });

  it("caps at the GPU-safe ceiling for a very large capture", () => {
    expect(resolveAutoSplatCap(1_000_000)).toBe(17_400_000);
  });
});

describe("resolveSteps", () => {
  it("prefers an explicit training-steps override over quality/auto", () => {
    expect(resolveSteps("auto", 12_345, KITCHEN_VIEWS, KITCHEN_IMAGES_PER_STEP)).toBe(12_345);
  });

  it("uses the quality-preset fixed step counts when not auto", () => {
    expect(resolveSteps("test", 0, KITCHEN_VIEWS, KITCHEN_IMAGES_PER_STEP)).toBe(5_000);
    expect(resolveSteps("medium", 0, KITCHEN_VIEWS, KITCHEN_IMAGES_PER_STEP)).toBe(30_000);
    expect(resolveSteps("high", 0, KITCHEN_VIEWS, KITCHEN_IMAGES_PER_STEP)).toBe(100_000);
  });

  it("uses the auto formula for quality=auto", () => {
    expect(resolveSteps("auto", 0, KITCHEN_VIEWS, KITCHEN_IMAGES_PER_STEP)).toBe(326_000);
  });
});

describe("resolveSplatCap", () => {
  it("prefers an explicit max-splats-millions override", () => {
    expect(resolveSplatCap(3.5, KITCHEN_VIEWS)).toBe(3_500_000);
  });

  it("falls back to the auto formula when 0", () => {
    expect(resolveSplatCap(0, KITCHEN_VIEWS)).toBe(6_520_000);
  });
});

describe("viewPx", () => {
  it("resolves fixed sizes directly", () => {
    expect(viewPx("768")).toBe(768);
    expect(viewPx("1024")).toBe(1024);
    expect(viewPx("1280")).toBe(1280);
    expect(viewPx("1920")).toBe(1920);
  });

  it("resolves max to pano width / 4", () => {
    expect(viewPx("max", 7680)).toBe(1920);
    expect(viewPx("max", 5760)).toBe(1440);
  });
});

describe("ramEstimateBytes / ramFitsBudget", () => {
  // Root-caused 2026-09-12 on a real 272-panorama/1280px run: raw pixel
  // bytes alone undercounts real usage ~3x (RAM_OVERHEAD_FACTOR) once
  // PyTorch/nerfstudio's own overhead is included — a 21.4 GB raw estimate
  // for that run actually used ~61 GB RSS and pushed WSL2 into heavy
  // swapping. At the full kitchen's 13,040 views, even Proven's stated
  // 1280px default does not actually fit once that overhead is accounted
  // for — a smaller capture or a lower Image size is needed for a walk this
  // large, and the UI's own RAM estimate now surfaces that honestly instead
  // of understating it.
  it("flags 13,040 views at 1920px as exceeding the RAM budget", () => {
    const bytes = ramEstimateBytes(KITCHEN_VIEWS, 1920);
    expect(bytes).toBeGreaterThan(75 * 1024 ** 3);
    expect(ramFitsBudget(KITCHEN_VIEWS, 1920)).toBe(false);
  });

  it("flags 13,040 views at 1280px as exceeding the RAM budget once real overhead is counted", () => {
    expect(ramFitsBudget(KITCHEN_VIEWS, 1280)).toBe(false);
  });

  it("a 272-panorama subset (4,352 views) at 1280px fits comfortably", () => {
    expect(ramFitsBudget(4_352, 1280)).toBe(true);
  });
});
