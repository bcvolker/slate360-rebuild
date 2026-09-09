import { describe, expect, it } from "vitest";

import {
  clickLanding,
  FINE_STEP_M,
  fineStepTarget,
  MAX_OFF_STATION_M,
  offStationDistance,
} from "./walkthrough-fine-step";
import type { WalkStation } from "./walkthrough-navigation";

const STATIONS: WalkStation[] = [
  { id: "a", position: [0, 0, 0], floorIndex: 0 },
  { id: "b", position: [5, 0, 0], floorIndex: 0 },
  { id: "c", position: [0, 0, 6], floorIndex: 0, headingY: Math.PI / 2 },
  { id: "up", position: [0.1, 3.2, 0], floorIndex: 1 },
];

describe("offStationDistance", () => {
  it("measures horizontally to the nearest station on the floor", () => {
    expect(offStationDistance(STATIONS, [1, 9, 0], 0)).toBeCloseTo(1, 6);
    expect(offStationDistance(STATIONS, [0, 0, 0], 1)).toBeCloseTo(0.1, 6);
  });

  it("is infinite on a floor with no stations", () => {
    expect(offStationDistance(STATIONS, [0, 0, 0], 9)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("fineStepTarget", () => {
  it("moves FINE_STEP_M along the look direction and keeps height", () => {
    // yaw 0 looks along -Z.
    const next = fineStepTarget(STATIONS, [0, 1.6, 0], 0, 1, 0);
    expect(next).not.toBeNull();
    expect(next?.[0]).toBeCloseTo(0, 6);
    expect(next?.[1]).toBeCloseTo(1.6, 6);
    expect(next?.[2]).toBeCloseTo(-FINE_STEP_M, 6);
  });

  it("steps backwards with direction -1", () => {
    expect(fineStepTarget(STATIONS, [0, 1.6, 0], 0, -1, 0)?.[2]).toBeCloseTo(FINE_STEP_M, 6);
  });

  it("refuses to leave the corridor around the walked path", () => {
    // Standing at the corridor edge, stepping away would exceed MAX_OFF_STATION_M.
    expect(fineStepTarget(STATIONS, [0, 1.6, -MAX_OFF_STATION_M], 0, 1, 0)).toBeNull();
  });
});

describe("clickLanding", () => {
  it("lands exactly on the click when it is near a station", () => {
    const landing = clickLanding(STATIONS, [0.6, 0, 0.3], 0);
    expect(landing?.station.id).toBe("a");
    expect(landing?.point).toEqual([0.6, 0, 0.3]);
  });

  it("snaps to the nearest station when the click is out in the haze", () => {
    const landing = clickLanding(STATIONS, [2.5, 0, 0], 0);
    expect(landing?.station.id).toBe("a");
    expect(landing?.point).toEqual([0, 0, 0]);
  });

  it("returns null when nothing is within click range", () => {
    expect(clickLanding(STATIONS, [40, 0, 40], 0)).toBeNull();
  });
});
