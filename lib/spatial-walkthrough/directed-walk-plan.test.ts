import { describe, expect, it } from "vitest";
import { solvePlanFrame } from "@/lib/local-artifacts/plan-calibration";
import { buildDirectedWalkOverlay, hitWalkOverlay } from "./directed-walk-plan";
import { readRegistration, readWaypointSpace, timePins } from "./directed-walk-registration";

const anchors = [
  { pathX: 0, pathY: 0, planU: 0.2, planV: 0.8 },
  { pathX: 10, pathY: 0, planU: 0.8, planV: 0.8 },
  { pathX: 0, pathY: 10, planU: 0.2, planV: 0.2 },
];

describe("directed walk plan overlay", () => {
  it("scales a path through stored reference points and seeks the midpoint", () => {
    const overlay = buildDirectedWalkOverlay({
      anchors,
      accuracyHint: "georef",
      path: [
        { id: "a", t: 0, x: 0, y: 0, label: "Entry", clipId: "c1" },
        { id: "b", t: 20, x: 10, y: 0, label: "East", clipId: "c1" },
        { id: "c", t: 40, x: 0, y: 10, label: "North", clipId: "c1" },
      ],
    });
    expect(overlay.accuracy).toBe("georef");
    expect(overlay.points[0]).toMatchObject({ u: expect.closeTo(0.2, 5), v: expect.closeTo(0.8, 5) });
    expect(overlay.points[2]).toMatchObject({ u: expect.closeTo(0.2, 5), v: expect.closeTo(0.2, 5) });
    const hit = hitWalkOverlay(overlay, 0.5, 0.8);
    expect(hit?.t).toBeCloseTo(10, 4);
    expect(hit?.segmentKey).toBe("a:b");
    expect(hitWalkOverlay(overlay, 0.05, 0.05)).toBeNull();
  });

  it("does not join clips or a path that has no scale", () => {
    const overlay = buildDirectedWalkOverlay({
      anchors: anchors.slice(0, 2),
      path: [
        { id: "a", t: 0, x: 0, y: 0, clipId: "c1" },
        { id: "b", t: 4, x: 10, y: 0, clipId: "c2" },
      ],
    });
    expect(overlay.accuracy).toBe("two-point");
    expect(overlay.segments).toEqual([]);
    expect(buildDirectedWalkOverlay({ path: [{ id: "a", t: 0, x: 0, y: 0 }, { id: "b", t: 1, x: 1, y: 1 }] }).accuracy).toBe("unregistered");
  });

  it("keeps sheet-fraction waypoints and pin order when nothing else is registered", () => {
    const sheet = buildDirectedWalkOverlay({
      sheetPath: [
        { id: "a", t: 3, u: 0.2, v: 0.4 },
        { id: "b", t: 9, u: 0.6, v: 0.4 },
      ],
    });
    expect(sheet.accuracy).toBe("sheet-fraction");
    expect(hitWalkOverlay(sheet, 0.4, 0.4)?.t).toBeCloseTo(6, 4);

    const pins = buildDirectedWalkOverlay({
      pinTiming: "index",
      pins: [
        { id: "p1", u: 0.1, v: 0.2, t: 5, label: "Door" },
        { id: "p2", u: 0.4, v: 0.2, t: 15, label: "Desk" },
      ],
    });
    expect(pins.accuracy).toBe("pin-polyline");
    expect(pins.note).toMatch(/pin order/);
    expect(hitWalkOverlay(pins, 0.25, 0.2)?.t).toBeCloseTo(10, 4);
  });

  it("reads publisher metadata, waypoint space, and pin times", () => {
    const frame = solvePlanFrame([
      { pathX: 0, pathY: 0, planU: 0.1, planV: 0.2 },
      { pathX: 10, pathY: 0, planU: 0.1, planV: 0.7 },
    ]);
    const reg = readRegistration({ planFrame: frame, directedWalk: { sheetId: "s1", accuracy: "georef", anchors } });
    expect(reg.frame?.controlCount).toBe(2);
    expect(reg.sheetId).toBe("s1");
    expect(reg.accuracy).toBe("georef");
    expect(readWaypointSpace({ x: 1, y: 2, segmentId: "seg" })).toEqual({ kind: "path", x: 1, y: 2, segmentId: "seg" });
    expect(readWaypointSpace({ u: 0.2, v: 0.4 })?.kind).toBe("sheet");
    expect(readWaypointSpace({ sheetHint: "A803" })).toBeNull();

    const labeled = timePins(
      [{ id: "p", u: 0.2, v: 0.2, t: null, label: "Entry door" }],
      [{ label: "entry door", t: 8, clipId: "c1" }],
      [],
    );
    expect(labeled.timing).toBe("label");
    expect(labeled.pins[0].t).toBe(8);

    const ordered = timePins(
      [
        { id: "a", u: 0.1, v: 0.1, t: null, label: "One" },
        { id: "b", u: 0.2, v: 0.2, t: null, label: "Two" },
      ],
      [],
      [
        { t: 1, clipId: "c1" },
        { t: 2, clipId: "c1" },
      ],
    );
    expect(ordered.timing).toBe("index");
    expect(ordered.pins.map((p) => p.t)).toEqual([1, 2]);
  });
});
