import type { Vec3 } from "./s360-world";

export type MeasurementKind =
  | "distance"
  | "polyline"
  | "height"
  | "horizontal"
  | "area"
  | "perimeter"
  | "angle"
  | "clearance";

export type DisplayUnit = "m" | "mm" | "ft" | "in";

const METERS_PER_FOOT = 0.3048;
const METERS_PER_INCH = 0.0254;

export function distance3(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

export function polylineLength(points: readonly Vec3[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i += 1) {
    sum += distance3(points[i - 1], points[i]);
  }
  return sum;
}

/** Absolute vertical separation — construction storey / opening height. */
export function verticalHeight(a: Vec3, b: Vec3): number {
  return Math.abs(b.y - a.y);
}

/** Plan-distance ignoring Y (level distance on the floor plate). */
export function horizontalDistance(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

/**
 * Polygon area via Newell's method. Points are NOT closed by the caller; this
 * closes the ring. Returns m². Works for floor plates and vertical walls.
 */
export function polygonArea(points: readonly Vec3[]): number {
  if (points.length < 3) return 0;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    nx += (a.y - b.y) * (a.z + b.z);
    ny += (a.z - b.z) * (a.x + b.x);
    nz += (a.x - b.x) * (a.y + b.y);
  }
  return 0.5 * Math.hypot(nx, ny, nz);
}

export function polygonPerimeter(points: readonly Vec3[]): number {
  if (points.length < 2) return 0;
  return polylineLength(points) + distance3(points[points.length - 1], points[0]);
}

/** Interior angle at `vertex` formed by `a → vertex → c`, degrees in (0, 180]. */
export function angleDegrees(a: Vec3, vertex: Vec3, c: Vec3): number {
  const ux = a.x - vertex.x;
  const uy = a.y - vertex.y;
  const uz = a.z - vertex.z;
  const vx = c.x - vertex.x;
  const vy = c.y - vertex.y;
  const vz = c.z - vertex.z;
  const lu = Math.hypot(ux, uy, uz);
  const lv = Math.hypot(vx, vy, vz);
  if (lu < 1e-12 || lv < 1e-12) return 0;
  const cos = Math.max(-1, Math.min(1, (ux * vx + uy * vy + uz * vz) / (lu * lv)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Point-to-surface: distance from the probe to the hit on the metric mesh. */
export function pointToSurface(point: Vec3, surfaceHit: Vec3): number {
  return distance3(point, surfaceHit);
}

export function metersToUnit(meters: number, unit: DisplayUnit): number {
  if (unit === "mm") return meters * 1000;
  if (unit === "ft") return meters / METERS_PER_FOOT;
  if (unit === "in") return meters / METERS_PER_INCH;
  return meters;
}

export function unitToMeters(value: number, unit: DisplayUnit): number {
  if (unit === "mm") return value / 1000;
  if (unit === "ft") return value * METERS_PER_FOOT;
  if (unit === "in") return value * METERS_PER_INCH;
  return value;
}

/** Construction-sensible display precision (still stored in metres). */
export function formatMeasured(meters: number, unit: DisplayUnit, kind?: MeasurementKind): string {
  const v = metersToUnit(meters, unit);
  if (kind === "area") {
    const suffix = unit === "m" || unit === "mm" ? "m²" : "ft²";
    const area = unit === "m" || unit === "mm" ? meters : meters / (METERS_PER_FOOT * METERS_PER_FOOT);
    return `${area.toFixed(2)} ${suffix}`;
  }
  if (kind === "angle") return `${meters.toFixed(1)}°`;
  if (unit === "mm") return `${Math.round(v)} mm`;
  if (unit === "in") return `${v.toFixed(1)} in`;
  if (unit === "ft") return `${v.toFixed(2)} ft`;
  return `${v.toFixed(3)} m`;
}

export function minPointsForKind(kind: MeasurementKind): number {
  if (kind === "polyline") return 2;
  if (kind === "area" || kind === "perimeter") return 3;
  if (kind === "angle") return 3;
  return 2;
}

export function isClosedKind(kind: MeasurementKind): boolean {
  return kind === "area" || kind === "perimeter";
}

export function computeMeasurementValue(kind: MeasurementKind, points: readonly Vec3[]): number | null {
  if (points.length < minPointsForKind(kind)) return null;
  switch (kind) {
    case "distance":
    case "clearance":
      return distance3(points[0], points[1]);
    case "polyline":
      return polylineLength(points);
    case "height":
      return verticalHeight(points[0], points[points.length - 1]);
    case "horizontal":
      return horizontalDistance(points[0], points[points.length - 1]);
    case "area":
      return polygonArea(points);
    case "perimeter":
      return polygonPerimeter(points);
    case "angle":
      return angleDegrees(points[0], points[1], points[2]);
    default:
      return null;
  }
}
