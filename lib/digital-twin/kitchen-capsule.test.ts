import { describe, expect, it } from "vitest";

import {
  clampWalkHeight,
  meshRoleFlags,
  poseDelta,
  projectSlide,
  walkDelta,
} from "./kitchen-capsule";

describe("kitchen capsule locomotion", () => {
  it("slides along a wall instead of stopping", () => {
    const [dx, dz] = projectSlide(1, 0, -1, 0);
    expect(dx).toBeCloseTo(0, 6);
    expect(dz).toBeCloseTo(0, 6);
    const [sx, sz] = projectSlide(1, 0.4, -1, 0);
    expect(sx).toBeCloseTo(0, 6);
    expect(sz).toBeCloseTo(0.4, 6);
  });

  it("walks forward along -Z at yaw 0", () => {
    const [dx, dz] = walkDelta(1, 0, 0, 1, 1);
    expect(dx).toBeCloseTo(0, 6);
    expect(dz).toBeCloseTo(-1, 6);
  });

  it("reports zero pose jump for identical cameras", () => {
    const p = { x: 1, y: 0.005, z: -2, yaw: 0.2, pitch: 0 };
    expect(poseDelta(p, { ...p })).toBe(0);
  });

  it("keeps walk eye height between the floor and the ceiling cut", () => {
    const floor = -1.595;
    const ceiling = 1.1;
    const eye = floor + 1.6;
    expect(clampWalkHeight(eye, floor, ceiling)).toBeCloseTo(eye, 5);
    expect(clampWalkHeight(floor - 4, floor, ceiling)).toBeGreaterThan(floor + 1.4);
    expect(clampWalkHeight(ceiling + 4, floor, ceiling)).toBeLessThan(ceiling);
  });

  it("isolates display / nav / measure mesh roles", () => {
    expect(meshRoleFlags("display")).toEqual({
      twinDisplayMesh: true,
      twinNavMesh: false,
      twinWalkSurface: false,
      twinMeasureMesh: false,
    });
    expect(meshRoleFlags("nav")).toEqual({
      twinDisplayMesh: false,
      twinNavMesh: true,
      twinWalkSurface: true,
      twinMeasureMesh: false,
    });
    expect(meshRoleFlags("measure")).toEqual({
      twinDisplayMesh: false,
      twinNavMesh: false,
      twinWalkSurface: false,
      twinMeasureMesh: true,
    });
  });
});
