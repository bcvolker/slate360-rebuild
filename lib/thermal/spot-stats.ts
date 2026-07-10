/**
 * Measurement math for probe targets — point sampling and area (box) averaging.
 * Pure + grid-agnostic so it can be unit-tested and reused by the viewer.
 */

import type { ProbeSpot } from "@/components/ops/thermal/ThermalProbeViewer";

export type SpotStats = { value: number; min?: number; max?: number; pixels?: number };

/** Additive extension for V2's polygon areas — old callers pass plain ProbeSpot unchanged. */
export type StatSpot = Omit<ProbeSpot, "kind"> & {
  kind?: ProbeSpot["kind"] | "polygon";
  points?: { x: number; y: number }[];
};

/** Ray-cast point-in-polygon (even-odd rule). */
function insidePolygon(x: number, y: number, pts: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function sampleAt(temps: number[] | Float32Array | Float64Array, w: number, h: number, x: number, y: number): number {
  const cx = Math.max(0, Math.min(w - 1, Math.round(x)));
  const cy = Math.max(0, Math.min(h - 1, Math.round(y)));
  return temps[cy * w + cx];
}

/**
 * For a point target: the temperature at (x,y). For an area target: the average
 * temperature over the box, plus min/max and pixel count. `value` is the figure
 * used for the spot's headline reading and Δ comparisons.
 */
export function spotStats(
  spot: StatSpot,
  temps: number[] | Float32Array | Float64Array,
  width: number,
  height: number,
): SpotStats {
  // Polygon target: average all pixels inside the vertex loop (V2 additive).
  if (spot.kind === "polygon" && Array.isArray(spot.points) && spot.points.length >= 3) {
    const pts = spot.points;
    const x0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.x))));
    const y0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.y))));
    const x1 = Math.min(width - 1, Math.ceil(Math.max(...pts.map((p) => p.x))));
    const y1 = Math.min(height - 1, Math.ceil(Math.max(...pts.map((p) => p.y))));
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let n = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!insidePolygon(x + 0.5, y + 0.5, pts)) continue;
        const v = temps[y * width + x];
        sum += v;
        if (v < min) min = v;
        if (v > max) max = v;
        n += 1;
      }
    }
    if (n === 0) return { value: sampleAt(temps, width, height, spot.x, spot.y) };
    return { value: sum / n, min, max, pixels: n };
  }
  // Line target: sample along the segment; value = average, plus min/max.
  if (spot.kind === "line" && spot.x2 != null && spot.y2 != null) {
    const dx = spot.x2 - spot.x;
    const dy = spot.y2 - spot.y;
    const steps = Math.max(2, Math.ceil(Math.hypot(dx, dy)));
    let sum = 0, min = Infinity, max = -Infinity;
    for (let i = 0; i <= steps; i++) {
      const v = sampleAt(temps, width, height, spot.x + (dx * i) / steps, spot.y + (dy * i) / steps);
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return { value: sum / (steps + 1), min, max, pixels: steps + 1 };
  }
  if (spot.kind !== "area" || !spot.w || !spot.h) {
    return { value: sampleAt(temps, width, height, spot.x, spot.y) };
  }
  const x0 = Math.max(0, Math.round(spot.x - spot.w / 2));
  const y0 = Math.max(0, Math.round(spot.y - spot.h / 2));
  const x1 = Math.min(width - 1, Math.round(spot.x + spot.w / 2));
  const y1 = Math.min(height - 1, Math.round(spot.y + spot.h / 2));
  const circle = spot.areaShape === "circle";
  const rx = spot.w / 2 || 1;
  const ry = spot.h / 2 || 1;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      // For an ellipse target, only count pixels inside the ellipse.
      if (circle) {
        const nx = (x - spot.x) / rx;
        const ny = (y - spot.y) / ry;
        if (nx * nx + ny * ny > 1) continue;
      }
      const v = temps[y * width + x];
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
      n += 1;
    }
  }
  if (n === 0) return { value: sampleAt(temps, width, height, spot.x, spot.y) };
  return { value: sum / n, min, max, pixels: n };
}
