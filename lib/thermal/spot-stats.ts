/**
 * Measurement math for probe targets — point sampling and area (box) averaging.
 * Pure + grid-agnostic so it can be unit-tested and reused by the viewer.
 */

import type { ProbeSpot } from "@/components/ops/thermal/ThermalProbeViewer";

export type SpotStats = { value: number; min?: number; max?: number; pixels?: number };

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
  spot: ProbeSpot,
  temps: number[] | Float32Array | Float64Array,
  width: number,
  height: number,
): SpotStats {
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
