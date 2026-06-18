/**
 * Thermal probe color palettes + pure formatting helpers.
 * Extracted from ThermalProbeViewer to keep that component under the 300-line rule.
 */

export type Unit = "C" | "F";
export type MarkerShape = "circle" | "crosshair" | "box";

type Stops = Array<[number, number, number]>;

export const PALETTES: Record<string, Stops> = {
  Inferno: [
    [0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99],
    [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164],
  ],
  Iron: [
    [0, 0, 0], [40, 0, 80], [120, 0, 90], [200, 30, 30],
    [245, 120, 0], [255, 200, 40], [255, 255, 200], [255, 255, 255],
  ],
  Rainbow: [
    [0, 0, 143], [0, 0, 255], [0, 255, 255], [120, 255, 0],
    [255, 255, 0], [255, 0, 0], [128, 0, 0],
  ],
  Grayscale: [
    [0, 0, 0], [255, 255, 255],
  ],
  Arctic: [
    [0, 0, 40], [0, 40, 120], [0, 120, 200], [120, 200, 255], [255, 255, 255],
  ],
  "Hot Metal": [
    [0, 0, 0], [120, 0, 0], [220, 80, 0], [255, 200, 0], [255, 255, 255],
  ],
};

export const PALETTE_NAMES = Object.keys(PALETTES);

export function samplePalette(name: string, t: number): [number, number, number] {
  const stops = PALETTES[name] ?? PALETTES.Inferno;
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = stops[i];
  const b = stops[Math.min(stops.length - 1, i + 1)];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

export function fmtTemp(c: number, unit: Unit, withUnit = true): string {
  const v = unit === "F" ? (c * 9) / 5 + 32 : c;
  return `${v.toFixed(1)}${withUnit ? `°${unit}` : "°"}`;
}

export function fmtDelta(deltaC: number, unit: Unit): string {
  const d = Math.abs(deltaC) * (unit === "F" ? 9 / 5 : 1);
  return `${d.toFixed(1)}°${unit}`;
}

export function newSpotId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Paint a temperature grid onto a canvas context using a palette and an explicit
 * display range [lo, hi] (the "level/span" — temps outside the range clamp to the
 * palette ends). Returns nothing; mutates the context's image data.
 */
export function renderHeatmap(
  ctx: CanvasRenderingContext2D,
  temps: number[] | Float32Array | Float64Array,
  width: number,
  height: number,
  palette: string,
  lo: number,
  hi: number,
): void {
  const img = ctx.createImageData(width, height);
  const span = hi - lo || 1;
  for (let i = 0; i < temps.length; i++) {
    const [r, g, b] = samplePalette(palette, (temps[i] - lo) / span);
    const o = i * 4;
    img.data[o] = r;
    img.data[o + 1] = g;
    img.data[o + 2] = b;
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
