import { describe, expect, it } from "vitest";

import {
  applyLookDrag,
  clampPitch,
  distance3,
  EYE_HEIGHT_M,
  eyeHeightFor,
  floorBounds,
  lerpPose,
  lerpYaw,
  MAX_PITCH_RAD,
  nearestStation,
  poseForMode,
  smoothstep,
  wrapYaw,
  type FloorInfo,
  type WalkStation,
} from "./walkthrough-navigation";

const FLOORS: FloorInfo[] = [
  { index: 0, label: "Ground", elevationY: 0 },
  { index: 1, label: "Level 2", elevationY: 3.2 },
];

const STATIONS: WalkStation[] = [
  { id: "a", position: [0, 0, 0], floorIndex: 0 },
  { id: "b", position: [5, 0, 0], floorIndex: 0 },
  { id: "c", position: [0, 0, 6], floorIndex: 0, headingY: Math.PI / 2 },
  { id: "up", position: [0.1, 3.2, 0], floorIndex: 1 },
];

describe("smoothstep", () => {
  it("pins the endpoints and the midpoint", () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 6);
  });

  it("clamps outside [0,1] rather than overshooting", () => {
    expect(smoothstep(-3)).toBe(0);
    expect(smoothstep(4)).toBe(1);
  });
});

describe("clampPitch", () => {
  it("passes level and gentle angles through", () => {
    expect(clampPitch(0)).toBe(0);
    expect(clampPitch(0.5)).toBeCloseTo(0.5, 6);
  });

  it("clamps straight up and straight down to ±85°", () => {
    expect(clampPitch(Math.PI)).toBeCloseTo(MAX_PITCH_RAD, 6);
    expect(clampPitch(-Math.PI)).toBeCloseTo(-MAX_PITCH_RAD, 6);
  });
});

describe("wrapYaw", () => {
  it("leaves in-range yaw alone", () => {
    expect(wrapYaw(0)).toBeCloseTo(0, 6);
    expect(wrapYaw(1)).toBeCloseTo(1, 6);
  });

  it("wraps past ±π into range", () => {
    // The range is half-open, so a half-turn lands on one boundary or the
    // other — they are the same heading. What matters is that it is in range.
    expect(Math.abs(wrapYaw(Math.PI * 3))).toBeCloseTo(Math.PI, 5);
    expect(Math.abs(wrapYaw(-Math.PI * 3))).toBeCloseTo(Math.PI, 5);
    expect(wrapYaw(Math.PI * 2 + 0.25)).toBeCloseTo(0.25, 6);
    expect(wrapYaw(Math.PI * 20 + 1)).toBeLessThanOrEqual(Math.PI);
  });
});

describe("lerpYaw", () => {
  it("takes the short way across the ±π seam", () => {
    // 170° -> -170° is a 20° turn, not a 340° spin.
    const from = (170 * Math.PI) / 180;
    const to = (-170 * Math.PI) / 180;
    const mid = lerpYaw(from, to, 0.5);
    expect(Math.abs(mid)).toBeCloseTo(Math.PI, 4);
  });

  it("still interpolates ordinary turns linearly", () => {
    expect(lerpYaw(0, 1, 0.5)).toBeCloseTo(0.5, 6);
  });
});

describe("nearestStation", () => {
  it("finds an exact hit", () => {
    expect(nearestStation(STATIONS, [5, 0, 0], 4, 0)?.id).toBe("b");
  });

  it("ignores a closer station on another floor", () => {
    // "up" sits at the query point but on floor 1; "a" is 3.2 m away on floor 0.
    expect(nearestStation(STATIONS, [0.1, 3.2, 0], 4, 0)?.id).toBe("a");
  });

  it("returns null when everything is out of range", () => {
    expect(nearestStation(STATIONS, [40, 0, 40], 4, 0)).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(nearestStation([], [0, 0, 0], 4, 0)).toBeNull();
  });

  it("picks the nearer of two candidates in range", () => {
    expect(nearestStation(STATIONS, [3.6, 0, 0], 4, 0)?.id).toBe("b");
    expect(nearestStation(STATIONS, [1.4, 0, 0], 4, 0)?.id).toBe("a");
  });
});

describe("eyeHeightFor", () => {
  it("stands on the ground floor plane", () => {
    expect(eyeHeightFor(STATIONS[0], FLOORS)).toBeCloseTo(EYE_HEIGHT_M, 6);
  });

  it("stands on an upper floor plane, not on the ground", () => {
    expect(eyeHeightFor(STATIONS[3], FLOORS)).toBeCloseTo(3.2 + EYE_HEIGHT_M, 6);
  });

  it("falls back to the station's own Y when the floor is unknown", () => {
    const orphan: WalkStation = { id: "x", position: [0, 9, 0], floorIndex: 7 };
    expect(eyeHeightFor(orphan, FLOORS)).toBeCloseTo(9 + EYE_HEIGHT_M, 6);
  });
});

describe("distance3", () => {
  it("measures a 3-4-5 triangle", () => {
    expect(distance3([0, 0, 0], [3, 4, 0])).toBeCloseTo(5, 6);
  });
});

describe("floorBounds", () => {
  it("spans only the requested floor", () => {
    const b = floorBounds(STATIONS, 0);
    expect(b?.min).toEqual([0, 0, 0]);
    expect(b?.max).toEqual([5, 0, 6]);
  });

  it("returns null for a floor with no stations", () => {
    expect(floorBounds(STATIONS, 9)).toBeNull();
  });
});

describe("poseForMode", () => {
  it("inside stands at eye height and honours the station heading", () => {
    const pose = poseForMode("inside", STATIONS[2], FLOORS, STATIONS, 0, 0);
    expect(pose?.position[1]).toBeCloseTo(EYE_HEIGHT_M, 6);
    expect(pose?.yaw).toBeCloseTo(Math.PI / 2, 6);
    expect(pose?.pitch).toBe(0);
  });

  it("inside keeps the current look direction when the station has none", () => {
    expect(poseForMode("inside", STATIONS[0], FLOORS, STATIONS, 0, 1.1)?.yaw).toBeCloseTo(1.1, 6);
  });

  it("floorplan looks straight down from above the floor centre", () => {
    const pose = poseForMode("floorplan", STATIONS[0], FLOORS, STATIONS, 0, 0);
    expect(pose?.pitch).toBeCloseTo(-Math.PI / 2, 6);
    expect(pose?.position[0]).toBeCloseTo(2.5, 6);
    expect(pose?.position[2]).toBeCloseTo(3, 6);
    expect(pose?.position[1]).toBeGreaterThan(5);
  });

  it("dollhouse pulls back and above, tilted down", () => {
    const pose = poseForMode("dollhouse", STATIONS[0], FLOORS, STATIONS, 0, 0);
    expect(pose?.pitch).toBeLessThan(0);
    expect(pose?.position[1]).toBeGreaterThan(EYE_HEIGHT_M);
  });

  it("dollhouse actually LOOKS AT the room, not away from it", () => {
    // The whole mode is worthless if the sign is flipped: the camera sits
    // behind the room and frames empty space. Walk the view ray forward and
    // assert it closes on the floor centre.
    for (const yaw of [0, Math.PI / 3, -2.1, Math.PI]) {
      const pose = poseForMode("dollhouse", STATIONS[0], FLOORS, STATIONS, 0, yaw)!;
      const forward = [-Math.sin(pose.yaw), 0, -Math.cos(pose.yaw)];
      const centre = [2.5, 3];
      const here = Math.hypot(pose.position[0] - centre[0], pose.position[2] - centre[1]);
      const ahead = Math.hypot(
        pose.position[0] + forward[0] - centre[0],
        pose.position[2] + forward[2] - centre[1],
      );
      expect(ahead).toBeLessThan(here);
    }
  });

  it("floorplan sits directly over the floor centre", () => {
    const pose = poseForMode("floorplan", STATIONS[0], FLOORS, STATIONS, 0, 1.2)!;
    expect(pose.position[0]).toBeCloseTo(2.5, 6);
    expect(pose.position[2]).toBeCloseTo(3, 6);
  });

  it("returns null for an overview of a floor with no stations", () => {
    expect(poseForMode("dollhouse", null, FLOORS, STATIONS, 9, 0)).toBeNull();
  });
});

describe("lerpPose", () => {
  it("returns the endpoints exactly", () => {
    const from = { position: [0, 0, 0] as [number, number, number], yaw: 0, pitch: 0 };
    const to = { position: [10, 2, 4] as [number, number, number], yaw: 1, pitch: -0.5 };
    expect(lerpPose(from, to, 0).position).toEqual([0, 0, 0]);
    expect(lerpPose(from, to, 1).position[0]).toBeCloseTo(10, 6);
    expect(lerpPose(from, to, 1).pitch).toBeCloseTo(-0.5, 6);
  });

  it("eases rather than moving linearly", () => {
    const from = { position: [0, 0, 0] as [number, number, number], yaw: 0, pitch: 0 };
    const to = { position: [10, 0, 0] as [number, number, number], yaw: 0, pitch: 0 };
    expect(lerpPose(from, to, 0.25).position[0]).toBeLessThan(2.5);
    expect(lerpPose(from, to, 0.5).position[0]).toBeCloseTo(5, 6);
  });
});


describe("applyLookDrag", () => {
  const at = (yaw: number, pitch: number) => ({
    position: [0, 1.6, 0] as [number, number, number],
    yaw,
    pitch,
  });

  it("drags the world with the finger, not against it", () => {
    // Grab-the-world: dragging RIGHT must increase yaw, which turns the camera
    // left and slides the room right under the finger. Both signs shipped
    // inverted once; this test is why it cannot happen quietly again.
    expect(applyLookDrag(at(0, 0), 100, 0, 0.005).yaw).toBeGreaterThan(0);
    expect(applyLookDrag(at(0, 0), -100, 0, 0.005).yaw).toBeLessThan(0);
    expect(applyLookDrag(at(0, 0), 0, 100, 0.005).pitch).toBeGreaterThan(0);
    expect(applyLookDrag(at(0, 0), 0, -100, 0.005).pitch).toBeLessThan(0);
  });

  it("keeps the viewer standing where they are", () => {
    const before = at(0.4, 0.1);
    expect(applyLookDrag(before, 50, 50, 0.005).position).toEqual(before.position);
  });

  it("still clamps pitch and wraps yaw under a violent drag", () => {
    const spun = applyLookDrag(at(0, 0), 100000, 100000, 0.005);
    expect(Math.abs(spun.yaw)).toBeLessThanOrEqual(Math.PI);
    expect(spun.pitch).toBeCloseTo(MAX_PITCH_RAD, 6);
  });
});
