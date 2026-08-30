import { describe, expect, it } from "vitest";
import { anchorsForPair } from "./compare-anchor";
import { datePairs, resolvePair } from "./compare-dates";
import { nextVerification } from "./compare-issue";
import { locatorFromView, yawDelta } from "./compare-locator";
import { matchCandidates } from "./compare-match";
import { desktopModes, mobileModes } from "./compare-mode";
import { APPROXIMATE_COPY, overlayGate } from "./compare-overlay";
import { linkedLook, mapThroughAnchors } from "./compare-sync";
import {
  HALL_ANCHORS,
  HALL_AUG_CHAPTERS,
  HALL_AUG_CLIP,
  HALL_AUG_WAYPOINTS,
  HALL_CAPTURES,
  HALL_JUN_CHAPTERS,
  HALL_JUN_CLIP,
  HALL_JUN_WAYPOINTS,
} from "./compare-preview-fixtures";

const mid = locatorFromView({
  walkthroughId: "wt-hall-jun",
  clipId: "clip-jun",
  chapterId: "ch-jun-hall",
  tSeconds: 36,
  yawDeg: 4,
  pitchDeg: -16,
});

describe("date pairs", () => {
  it("orders earlier capture as before", () => {
    const pairs = datePairs(HALL_CAPTURES);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].before.walkthroughId).toBe("wt-hall-jun");
    expect(pairs[0].after.walkthroughId).toBe("wt-hall-aug");
    const swapped = resolvePair(HALL_CAPTURES, "wt-hall-aug", "wt-hall-jun");
    expect(swapped?.before.walkthroughId).toBe("wt-hall-jun");
  });
});

describe("compare anchors", () => {
  it("maps a locator in A onto the corresponding locator in B", () => {
    const mapped = mapThroughAnchors(HALL_ANCHORS, mid);
    expect(mapped?.locator.walkthroughId).toBe("wt-hall-aug");
    expect(mapped?.locator.tSeconds).toBe(40);
    expect(mapped?.fromAnchorId).toBe("an-mid");
  });
  it("interpolates between mapped anchors while scrubbing", () => {
    const mapped = mapThroughAnchors(HALL_ANCHORS, { ...mid, tSeconds: 49 });
    expect(mapped?.interpolated).toBe(true);
    expect(mapped?.locator.tSeconds).toBeGreaterThan(40);
    expect(mapped?.locator.tSeconds).toBeLessThan(68);
  });
  it("links heading changes without claiming a shared world frame", () => {
    const mapped = mapThroughAnchors(HALL_ANCHORS, mid);
    const look = linkedLook(mapped!.locator, mid, { ...mid, yawDeg: 24 });
    expect(yawDelta(mapped!.locator.yawDeg, look.yawDeg)).toBeCloseTo(20, 0);
  });
});

describe("assisted matching", () => {
  it("suggests the same-named chapter and waypoint on the other date", () => {
    const hits = matchCandidates({
      source: mid,
      sourceChapters: HALL_JUN_CHAPTERS,
      sourceWaypoints: HALL_JUN_WAYPOINTS,
      destWalkthroughId: "wt-hall-aug",
      destClips: [HALL_AUG_CLIP],
      destChapters: HALL_AUG_CHAPTERS,
      destWaypoints: HALL_AUG_WAYPOINTS,
    });
    expect(hits.some((h) => h.reason === "both" && h.label === "Hall midpoint")).toBe(true);
    expect(hits.some((h) => h.reason === "chapter" && h.label === "Construction hallway")).toBe(true);
  });
});

describe("overlay gate", () => {
  it("enables overlay only near an anchor and always marks views as approximate", () => {
    const pair = anchorsForPair(HALL_ANCHORS, "wt-hall-jun", "wt-hall-aug");
    const ok = overlayGate(pair, mid, HALL_ANCHORS[1].after);
    expect(ok.enabled).toBe(true);
    expect(ok.approximate).toBe(true);
    expect(APPROXIMATE_COPY).toBe("Views are approximate");
    const far = overlayGate(pair, { ...mid, tSeconds: 12, yawDeg: 90 }, null);
    expect(far.enabled).toBe(false);
  });
});

describe("mobile modes", () => {
  it("does not offer split on a compact viewport", () => {
    expect(mobileModes(true)).toEqual(["flip", "swipe", "stack", "overlay"]);
    expect(desktopModes(false)).toEqual(["split", "swipe", "flip"]);
  });
});

describe("issue workflow", () => {
  it("advances Before → After → Verified", () => {
    expect(nextVerification("before")).toBe("after");
    expect(nextVerification("after")).toBe("verified");
    expect(nextVerification("verified")).toBe("verified");
  });
});
