import { describe, expect, it } from "vitest";

import {
  angleDegrees,
  computeMeasurementValue,
  distance3,
  formatMeasured,
  horizontalDistance,
  metersToUnit,
  polygonArea,
  polygonPerimeter,
  polylineLength,
  unitToMeters,
  verticalHeight,
} from "./measurement-math";
import { vec3 } from "./s360-world";

describe("distance3", () => {
  it("measures a 3-4-5 triangle", () => {
    expect(distance3(vec3(0, 0, 0), vec3(3, 4, 0))).toBeCloseTo(5, 10);
  });
});

describe("polylineLength", () => {
  it("sums segments", () => {
    expect(polylineLength([vec3(0, 0, 0), vec3(2, 0, 0), vec3(2, 0, 3)])).toBeCloseTo(5, 10);
  });
});

describe("verticalHeight / horizontalDistance", () => {
  it("splits a 3D span into height vs plan distance", () => {
    const a = vec3(0, 1, 0);
    const b = vec3(3, 5, 4);
    expect(verticalHeight(a, b)).toBe(4);
    expect(horizontalDistance(a, b)).toBeCloseTo(5, 10);
  });
});

describe("polygonArea / perimeter", () => {
  it("computes a 3×4 rectangle on the XZ plane", () => {
    const rect = [vec3(0, 1, 0), vec3(3, 1, 0), vec3(3, 1, 4), vec3(0, 1, 4)];
    expect(polygonArea(rect)).toBeCloseTo(12, 6);
    expect(polygonPerimeter(rect)).toBeCloseTo(14, 6);
  });

  it("computes a vertical wall rectangle (YZ plane)", () => {
    const wall = [vec3(2, 0, 0), vec3(2, 2, 0), vec3(2, 2, 5), vec3(2, 0, 5)];
    expect(polygonArea(wall)).toBeCloseTo(10, 6);
  });
});

describe("angleDegrees", () => {
  it("returns 90° at a right corner", () => {
    expect(angleDegrees(vec3(1, 0, 0), vec3(0, 0, 0), vec3(0, 0, 2))).toBeCloseTo(90, 6);
  });
});

describe("unit conversion", () => {
  it("round-trips metres and feet", () => {
    const ft = metersToUnit(1, "ft");
    expect(ft).toBeCloseTo(3.28084, 4);
    expect(unitToMeters(ft, "ft")).toBeCloseTo(1, 10);
  });

  it("formats construction precision", () => {
    expect(formatMeasured(1.2346, "m")).toBe("1.235 m");
    expect(formatMeasured(0.0254, "in")).toBe("1.0 in");
    expect(formatMeasured(12, "m", "area")).toBe("12.00 m²");
    expect(formatMeasured(90, "m", "angle")).toBe("90.0°");
  });
});

describe("computeMeasurementValue", () => {
  it("dispatches each kind", () => {
    const a = vec3(0, 0, 0);
    const b = vec3(3, 4, 0);
    expect(computeMeasurementValue("distance", [a, b])).toBeCloseTo(5, 10);
    expect(computeMeasurementValue("height", [a, vec3(0, 2.4, 0)])).toBeCloseTo(2.4, 10);
    expect(computeMeasurementValue("angle", [vec3(1, 0, 0), a, vec3(0, 1, 0)])).toBeCloseTo(90, 6);
    expect(computeMeasurementValue("area", [a])).toBeNull();
  });
});
