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
  "White Hot": [
    [0, 0, 0], [255, 255, 255],
  ],
  "Black Hot": [
    [255, 255, 255], [0, 0, 0],
  ],
  Lava: [
    [0, 0, 0], [60, 0, 0], [140, 10, 0], [220, 70, 0], [255, 170, 20], [255, 240, 120], [255, 255, 255],
  ],
  Glowbow: [
    [0, 0, 0], [70, 0, 120], [180, 0, 140], [255, 60, 40], [255, 170, 0], [255, 255, 120], [255, 255, 255],
  ],
  Medical: [
    [0, 0, 80], [0, 120, 200], [0, 200, 160], [120, 220, 0], [255, 230, 0], [255, 120, 0], [200, 0, 0],
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

/** Temperature band to spotlight (isotherm). Pixels outside render grayscale. */
export type Isotherm = { lo: number; hi: number };

/**
 * Paint a temperature grid onto a canvas context using a palette and an explicit
 * display range [lo, hi] (the "level/span" — temps outside the range clamp to the
 * palette ends). When `isotherm` is given, only temps inside [iso.lo, iso.hi] are
 * painted in palette color; the rest render as dimmed grayscale so the band pops.
 */
export function renderHeatmap(
  ctx: CanvasRenderingContext2D,
  temps: number[] | Float32Array | Float64Array,
  width: number,
  height: number,
  palette: string,
  lo: number,
  hi: number,
  isotherm?: Isotherm | null,
): void {
  const img = ctx.createImageData(width, height);
  const span = hi - lo || 1;
  for (let i = 0; i < temps.length; i++) {
    const t = temps[i];
    const norm = (t - lo) / span;
    const o = i * 4;
    if (isotherm && (t < isotherm.lo || t > isotherm.hi)) {
      // Dimmed grayscale for out-of-band pixels.
      const g = Math.round(Math.max(0, Math.min(1, norm)) * 150);
      img.data[o] = g;
      img.data[o + 1] = g;
      img.data[o + 2] = g;
    } else {
      const [r, g, b] = samplePalette(palette, norm);
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
    }
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Bins temperatures across [lo, hi] into `bins` buckets — for the span histogram.
 * Out-of-range values clamp into the end buckets.
 */
export function computeHistogram(
  temps: number[] | Float32Array | Float64Array,
  lo: number,
  hi: number,
  bins = 40,
): number[] {
  const out = new Array(bins).fill(0);
  const span = hi - lo || 1;
  for (let i = 0; i < temps.length; i++) {
    let b = Math.floor(((temps[i] - lo) / span) * bins);
    if (b < 0) b = 0;
    else if (b >= bins) b = bins - 1;
    out[b] += 1;
  }
  return out;
}

/**
 * S5.6 "Local contrast (display only)": rank-normalizes every pixel into
 * [lo, hi] by its percentile within the frame, so subtle local gradients pop
 * even inside a narrow real-temperature band. DISPLAY-ONLY — callers must
 * keep reading the true `temps` array for every readout (hover/loupe/list);
 * this output is only ever fed to `renderHeatmap`.
 */
export function histogramEqualize(temps: number[] | Float32Array | Float64Array, lo: number, hi: number): Float32Array {
  const n = temps.length;
  const order = new Uint32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  const indices = Array.from(order);
  indices.sort((a, b) => temps[a] - temps[b]);
  const out = new Float32Array(n);
  const span = hi - lo || 1;
  const denom = Math.max(1, n - 1);
  for (let rank = 0; rank < n; rank++) {
    out[indices[rank]] = lo + (rank / denom) * span;
  }
  return out;
}
