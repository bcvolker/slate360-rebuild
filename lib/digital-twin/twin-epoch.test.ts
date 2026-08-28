import { describe, expect, it } from "vitest";

import {
  formatEpochLabel,
  identityMeshEpoch,
  layerFromRepresentation,
  meshDisplayFor,
  pinRetainsWorldAnchor,
  planEpochSwap,
  representationFromLayer,
  sortEpochsNewestFirst,
  splatVisibleFor,
} from "./twin-epoch";
import { vec3 } from "./s360-world";

describe("representation mapping", () => {
  it("maps existing Mesh/Splat/Both onto Reality/Hybrid/Geometry", () => {
    expect(representationFromLayer("splat")).toBe("reality");
    expect(representationFromLayer("both")).toBe("hybrid");
    expect(representationFromLayer("mesh")).toBe("geometry");
    expect(layerFromRepresentation("reality")).toBe("splat");
  });

  it("hides the metric mesh in Reality but keeps it as the collision surface", () => {
    expect(meshDisplayFor("reality")).toBe("collision");
    expect(meshDisplayFor("hybrid")).toBe("shown");
    expect(splatVisibleFor("geometry")).toBe(false);
    expect(splatVisibleFor("reality")).toBe(true);
  });
});

describe("epochs", () => {
  it("labels current vs calendar dates", () => {
    expect(formatEpochLabel("2026-08-27T12:00:00.000Z", true)).toBe("Current");
    expect(formatEpochLabel("2026-08-10T12:00:00.000Z")).toBe("Aug 10");
  });

  it("sorts Current first, then newest captured_at", () => {
    const a = identityMeshEpoch({
      id: "a",
      capturedAt: "2026-07-15T00:00:00.000Z",
      meshUrl: "/a",
    });
    const b = identityMeshEpoch({
      id: "b",
      capturedAt: "2026-08-27T00:00:00.000Z",
      meshUrl: "/b",
      isCurrent: true,
    });
    const c = identityMeshEpoch({
      id: "c",
      capturedAt: "2026-08-10T00:00:00.000Z",
      meshUrl: "/c",
    });
    expect(sortEpochsNewestFirst([a, c, b]).map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("preserves camera when swapping historical captures", () => {
    const epochs = [
      identityMeshEpoch({ id: "now", capturedAt: "2026-08-27T00:00:00.000Z", meshUrl: "/n", isCurrent: true }),
      identityMeshEpoch({ id: "aug10", capturedAt: "2026-08-10T00:00:00.000Z", meshUrl: "/o" }),
    ];
    const swap = planEpochSwap("now", "aug10", epochs);
    expect(swap?.preserveCamera).toBe(true);
    expect(swap?.compareReady).toBe(true);
  });
});

describe("pins across view modes", () => {
  it("keeps the S360_WORLD anchor when switching Reality/Hybrid/Geometry", () => {
    const anchor = vec3(1.2, 0.4, -3);
    expect(pinRetainsWorldAnchor(anchor, "reality", "geometry")).toEqual(anchor);
    expect(pinRetainsWorldAnchor(anchor, "geometry", "hybrid")).toEqual(anchor);
  });
});
