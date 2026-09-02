/**
 * Pixel + camera probes for spatial layers. A layer is READY only when the
 * asset loaded, the renderer initialized, AND a sampled frame is not graphite.
 * Call at layer activation / QA checkpoints — not every frame.
 */

/** Canvas clear color matches --graphite-canvas (11, 15, 21). */
export const GRAPHITE_RGB: readonly [number, number, number] = [11, 15, 21];
export const VISIBLE_RATIO_MIN = 0.04;

export type VisibleLayer = "hero" | "geometry" | "reality";

export type Box3n = { min: [number, number, number]; max: [number, number, number] };

export type PixelProbe = {
  nonBackgroundPixelRatio: number;
  frameVariance: number;
  visible: boolean;
  samples: number;
};

export type VisibilityLog = {
  layerRequested: VisibleLayer | string;
  assetLoaded: boolean;
  objectCount: number;
  cameraPosition: [number, number, number];
  sceneBbox: Box3n | null;
  visibleObjectCount: number;
  nonBackgroundPixelRatio: number;
  frameVariance: number;
  firstVisibleFrameMs: number | null;
};

export function isGraphitePixel(
  r: number,
  g: number,
  b: number,
  bg: readonly [number, number, number] = GRAPHITE_RGB,
  slop = 16,
): boolean {
  return Math.abs(r - bg[0]) <= slop && Math.abs(g - bg[1]) <= slop && Math.abs(b - bg[2]) <= slop;
}

function regionCenters(width: number, height: number): Array<[number, number]> {
  const ix = Math.max(8, Math.floor(width * 0.22));
  const iy = Math.max(8, Math.floor(height * 0.22));
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  return [
    [cx, cy],
    [ix, iy],
    [width - ix, iy],
    [ix, height - iy],
    [width - ix, height - iy],
  ];
}

/** Sample RGBA buffer (WebGL canvas). HUD is HTML overlay — not in this buffer. */
export function probeRgbaBuffer(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  bg: readonly [number, number, number] = GRAPHITE_RGB,
): PixelProbe {
  const patch = 6;
  let samples = 0;
  let hits = 0;
  let sum = 0;
  let sumSq = 0;
  for (const [cx, cy] of regionCenters(width, height)) {
    for (let dy = -patch; dy <= patch; dy += 2) {
      for (let dx = -patch; dx <= patch; dx += 2) {
        const x = Math.min(width - 1, Math.max(0, cx + dx));
        const y = Math.min(height - 1, Math.max(0, cy + dy));
        const i = (y * width + x) * 4;
        const r = pixels[i] ?? 0;
        const g = pixels[i + 1] ?? 0;
        const b = pixels[i + 2] ?? 0;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sum += lum;
        sumSq += lum * lum;
        samples += 1;
        if (!isGraphitePixel(r, g, b, bg)) hits += 1;
      }
    }
  }
  const mean = samples ? sum / samples : 0;
  const variance = samples ? Math.max(0, sumSq / samples - mean * mean) : 0;
  const ratio = samples ? hits / samples : 0;
  return {
    nonBackgroundPixelRatio: ratio,
    frameVariance: variance,
    visible: ratio >= VISIBLE_RATIO_MIN && (variance >= 8 || ratio >= 0.2),
    samples,
  };
}

export function pointInBox(p: [number, number, number], box: Box3n, pad = 0): boolean {
  return (
    p[0] >= box.min[0] - pad &&
    p[0] <= box.max[0] + pad &&
    p[1] >= box.min[1] - pad &&
    p[1] <= box.max[1] + pad &&
    p[2] >= box.min[2] - pad &&
    p[2] <= box.max[2] + pad
  );
}

/** Slab test: does origin + t*dir hit the AABB for some t in [near, far]? */
export function lookRayHitsBox(
  origin: [number, number, number],
  dir: [number, number, number],
  box: Box3n,
  near = 0.06,
  far = 60,
): boolean {
  let tmin = near;
  let tmax = far;
  for (let i = 0; i < 3; i++) {
    const d = dir[i];
    const o = origin[i];
    const min = box.min[i];
    const max = box.max[i];
    if (Math.abs(d) < 1e-8) {
      if (o < min || o > max) return false;
      continue;
    }
    const inv = 1 / d;
    let t1 = (min - o) * inv;
    let t2 = (max - o) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmax < tmin) return false;
  }
  return true;
}

export function cameraSeesBox(args: {
  position: [number, number, number];
  look: [number, number, number];
  near: number;
  far: number;
  box: Box3n;
}): { cameraInsideBbox: boolean; lookHitsBbox: boolean } {
  const len = Math.hypot(args.look[0], args.look[1], args.look[2]) || 1;
  const dir: [number, number, number] = [args.look[0] / len, args.look[1] / len, args.look[2] / len];
  return {
    cameraInsideBbox: pointInBox(args.position, args.box, 0.35),
    lookHitsBbox: lookRayHitsBox(args.position, dir, args.box, args.near, args.far),
  };
}

export function fallbackEyeInBox(box: Box3n, eyeHeight = 1.6): {
  position: [number, number, number];
  yaw: number;
} {
  const cx = (box.min[0] + box.max[0]) / 2;
  const cz = (box.min[2] + box.max[2]) / 2;
  const y = box.min[1] + eyeHeight;
  return { position: [cx, y, cz], yaw: 0 };
}

export function emptyVisibilityLog(layer: string): VisibilityLog {
  return {
    layerRequested: layer,
    assetLoaded: false,
    objectCount: 0,
    cameraPosition: [0, 0, 0],
    sceneBbox: null,
    visibleObjectCount: 0,
    nonBackgroundPixelRatio: 0,
    frameVariance: 0,
    firstVisibleFrameMs: null,
  };
}
