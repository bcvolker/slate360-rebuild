import * as THREE from "three";
import type { SplatMesh } from "@sparkjsdev/spark";

export type SplatBoundsReport = {
  raw: { min: [number, number, number]; max: [number, number, number]; size: [number, number, number] };
  trimmed: { min: [number, number, number]; max: [number, number, number]; size: [number, number, number] };
  sampleCount: number;
  totalSplats: number;
};

const TMP = new THREE.Vector3();

function boxMetrics(box: THREE.Box3) {
  const size = new THREE.Vector3();
  box.getSize(size);
  return {
    min: [box.min.x, box.min.y, box.min.z] as [number, number, number],
    max: [box.max.x, box.max.y, box.max.z] as [number, number, number],
    size: [size.x, size.y, size.z] as [number, number, number],
  };
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx]!;
}

/**
 * Raw axis-aligned bounds from Spark (includes distant outlier splats).
 */
export function getRawSplatBoundingBox(mesh: SplatMesh): THREE.Box3 {
  mesh.updateMatrixWorld(true);
  return mesh.getBoundingBox(true).clone();
}

/**
 * World-space bounds from percentile-trimmed splat centers (default 2nd–98th per axis).
 */
export function computePercentileSplatBounds(
  mesh: SplatMesh,
  lowPercentile = 0.02,
  highPercentile = 0.98,
  maxSamples = 12_000,
): THREE.Box3 {
  mesh.updateMatrixWorld(true);
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];

  let total = 0;
  mesh.forEachSplat((_index, center) => {
    total += 1;
    TMP.copy(center).applyMatrix4(mesh.matrixWorld);
    xs.push(TMP.x);
    ys.push(TMP.y);
    zs.push(TMP.z);
  });

  if (xs.length === 0) {
    return getRawSplatBoundingBox(mesh);
  }

  let sampleXs = xs;
  let sampleYs = ys;
  let sampleZs = zs;

  if (xs.length > maxSamples) {
    const step = Math.ceil(xs.length / maxSamples);
    sampleXs = [];
    sampleYs = [];
    sampleZs = [];
    for (let i = 0; i < xs.length; i += step) {
      sampleXs.push(xs[i]!);
      sampleYs.push(ys[i]!);
      sampleZs.push(zs[i]!);
    }
  }

  sampleXs.sort((a, b) => a - b);
  sampleYs.sort((a, b) => a - b);
  sampleZs.sort((a, b) => a - b);

  return new THREE.Box3(
    new THREE.Vector3(
      percentile(sampleXs, lowPercentile),
      percentile(sampleYs, lowPercentile),
      percentile(sampleZs, lowPercentile),
    ),
    new THREE.Vector3(
      percentile(sampleXs, highPercentile),
      percentile(sampleYs, highPercentile),
      percentile(sampleZs, highPercentile),
    ),
  );
}

export function buildSplatBoundsReport(mesh: SplatMesh): SplatBoundsReport {
  const raw = getRawSplatBoundingBox(mesh);
  const trimmed = computePercentileSplatBounds(mesh);
  let totalSplats = 0;
  mesh.forEachSplat(() => {
    totalSplats += 1;
  });

  return {
    raw: boxMetrics(raw),
    trimmed: boxMetrics(trimmed),
    sampleCount: Math.min(totalSplats, 12_000),
    totalSplats,
  };
}
