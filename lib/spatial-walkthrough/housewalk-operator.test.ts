import { describe, expect, it } from "vitest";

import { HOUSEWALK_OPERATOR_KEYFRAMES, resolvePatchAtTime } from "./housewalk-operator";
import { interpolateKeyframes } from "./keyframes";
import { DEFAULT_OPERATOR_PATCH } from "./types";

describe("HouseWalk operator coverage", () => {
  it("widens a skinny static patch with time-keyframed rear/nadir coverage", () => {
    const skinny = { ...DEFAULT_OPERATOR_PATCH, rearYawWidth: 28.8, pitchMax: -18 };
    const standing = resolvePatchAtTime(skinny, [], 4);
    const doorway = resolvePatchAtTime(skinny, HOUSEWALK_OPERATOR_KEYFRAMES, 22);
    expect(standing?.rearYawWidth).toBeGreaterThan(80);
    expect(doorway?.rearYawWidth).toBeGreaterThan(120);
    expect(doorway?.pitchMax).toBeGreaterThan(0);
    expect(interpolateKeyframes(HOUSEWALK_OPERATOR_KEYFRAMES, 18)?.yawWidth).toBeGreaterThan(100);
  });
});
