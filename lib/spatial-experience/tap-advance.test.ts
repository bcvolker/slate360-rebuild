import { describe, expect, it } from "vitest";
import { tapAdvance } from "./tap-advance";

const anchors = [
  { id: "a", tSeconds: 10, yawDeg: 0 },
  { id: "b", tSeconds: 20, yawDeg: 8 },
  { id: "c", tSeconds: 40, yawDeg: 170 },
];

describe("tap advance", () => {
  it("picks the next cone match", () => {
    const r = tapAdvance(anchors, 5, 0, 4);
    expect(r.kind).toBe("one");
    if (r.kind === "one") expect(r.anchor.id).toBe("a");
  });

  it("does not invent 6DoF when nothing is ahead", () => {
    expect(tapAdvance(anchors, 80, 0, 0).kind).toBe("none");
  });
});
