import { describe, expect, it } from "vitest";
import { SAMPLE_WALK_SEGMENTS, deriveClientPath, mustNotJoin, segmentForTime } from "./trajectory";

describe("trajectory contract", () => {
  it("does not join across the 129.2–130 break", () => {
    expect(mustNotJoin(segmentForTime(SAMPLE_WALK_SEGMENTS, 129), segmentForTime(SAMPLE_WALK_SEGMENTS, 131))).toBe(true);
    expect(mustNotJoin(segmentForTime(SAMPLE_WALK_SEGMENTS, 10), segmentForTime(SAMPLE_WALK_SEGMENTS, 20))).toBe(false);
  });

  it("simplifies to a client path of at most 40 anchors", () => {
    const poses = Array.from({ length: 328 }, (_, i) => ({ t: i * 0.48, x: i, y: 0, z: 0, yaw: 0 }));
    const path = deriveClientPath(poses, SAMPLE_WALK_SEGMENTS);
    expect(path.length).toBeGreaterThanOrEqual(20);
    expect(path.length).toBeLessThanOrEqual(40);
  });
});
