import { describe, expect, it } from "vitest";

import {
  APPEARANCE_STALL_MS,
  appearanceStatusCopy,
  isByteStall,
  spatialPhase,
  withProxyFallback,
  absoluteSameOriginUrl,
} from "./asset-progress";

describe("asset progress", () => {
  it("does not treat a 15s wall clock as the primary failure rule", () => {
    expect(APPEARANCE_STALL_MS).toBe(8_000);
    expect(isByteStall(0, 7_999, 0, false)).toBe(false);
    expect(isByteStall(0, 8_000, 0, false)).toBe(true);
  });

  it("keeps panorama or geometry when Reality fails", () => {
    expect(
      spatialPhase({
        panoramaReady: true,
        geometryReady: true,
        realityReady: false,
        geometryFailed: false,
        realityFailed: true,
        webglLost: false,
      }),
    ).toBe("DEGRADED");
  });

  it("reaches Reality only after the splat is ready", () => {
    expect(
      spatialPhase({
        panoramaReady: true,
        geometryReady: true,
        realityReady: true,
        geometryFailed: false,
        realityFailed: false,
        webglLost: false,
      }),
    ).toBe("REALITY_READY");
  });

  it("adds a same-origin proxy fallback without duplicating it", () => {
    expect(withProxyFallback("/preview/twin-metric/asset?job=a&kind=x")).toBe(
      "/preview/twin-metric/asset?job=a&kind=x&proxy=1",
    );
    expect(withProxyFallback("/preview/twin-metric/asset?job=a&kind=x&proxy=1")).toBe(
      "/preview/twin-metric/asset?job=a&kind=x&proxy=1",
    );
    expect(absoluteSameOriginUrl("blob:https://example/x")).toBe("blob:https://example/x");
    expect(absoluteSameOriginUrl("https://cdn.example/a.spz")).toBe("https://cdn.example/a.spz");
  });

  it("keeps Geometry in the failure copy", () => {
    const copy = appearanceStatusCopy({ loadedBytes: 0, totalBytes: null, stalled: false, failed: true });
    expect(copy?.message).toMatch(/Geometry remains available/);
    expect(copy?.retry).toBe(true);
  });
});
