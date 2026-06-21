import * as THREE from "three";
import type { SplatMesh } from "@sparkjsdev/spark";

/**
 * Client-side orientation fallback for twins WITHOUT a worker-baked manifest
 * (legacy/un-reprocessed models). Estimates the floor normal via PCA on the
 * lower splat cluster and returns a correction quaternion to apply to the model's
 * PARENT group.
 *
 * Safety: `apply` is only true when the model is CLEARLY misoriented (tilt > 8°)
 * AND the floor cluster is confidently planar. Already-upright models return
 * apply=false → untouched → no regression. Any error → null.
 */
export type PcaOrientation = {
  quaternion: [number, number, number, number];
  apply: boolean;
  tiltDeg: number;
};

/** Jacobi eigendecomposition of a symmetric 3×3 given as [a00,a01,a02,a11,a12,a22]. */
function jacobiEigen3(m: number[]): { values: number[]; vectors: number[][] } {
  const a = [
    [m[0], m[1], m[2]],
    [m[1], m[3], m[4]],
    [m[2], m[4], m[5]],
  ];
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let iter = 0; iter < 32; iter++) {
    let p = 0;
    let q = 1;
    let max = Math.abs(a[0][1]);
    if (Math.abs(a[0][2]) > max) {
      max = Math.abs(a[0][2]);
      p = 0;
      q = 2;
    }
    if (Math.abs(a[1][2]) > max) {
      max = Math.abs(a[1][2]);
      p = 1;
      q = 2;
    }
    if (max < 1e-12) break;
    const phi = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    for (let k = 0; k < 3; k++) {
      const akp = a[k][p];
      const akq = a[k][q];
      a[k][p] = c * akp - s * akq;
      a[k][q] = s * akp + c * akq;
    }
    for (let k = 0; k < 3; k++) {
      const apk = a[p][k];
      const aqk = a[q][k];
      a[p][k] = c * apk - s * aqk;
      a[q][k] = s * apk + c * aqk;
    }
    for (let k = 0; k < 3; k++) {
      const vkp = v[k][p];
      const vkq = v[k][q];
      v[k][p] = c * vkp - s * vkq;
      v[k][q] = s * vkp + c * vkq;
    }
  }
  return {
    values: [a[0][0], a[1][1], a[2][2]],
    vectors: [
      [v[0][0], v[1][0], v[2][0]],
      [v[0][1], v[1][1], v[2][1]],
      [v[0][2], v[1][2], v[2][2]],
    ],
  };
}

const TMP = new THREE.Vector3();

export function estimateOrientationFromMesh(mesh: SplatMesh, maxSamples = 8000): PcaOrientation | null {
  try {
    mesh.updateMatrixWorld(true);
    const world = mesh.matrixWorld;
    const total = (mesh as unknown as { numSplats?: number }).numSplats ?? 0;
    const stride = total > maxSamples ? Math.floor(total / maxSamples) : 1;

    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    mesh.forEachSplat((index: number, center: THREE.Vector3) => {
      if (index % stride !== 0) return;
      TMP.copy(center).applyMatrix4(world);
      xs.push(TMP.x);
      ys.push(TMP.y);
      zs.push(TMP.z);
    });
    if (xs.length < 200) return null;

    const clip = (arr: number[]): [number, number] => {
      const s = [...arr].sort((a, b) => a - b);
      return [s[Math.floor(0.01 * (s.length - 1))], s[Math.floor(0.99 * (s.length - 1))]];
    };
    const [xlo, xhi] = clip(xs);
    const [ylo, yhi] = clip(ys);
    const [zlo, zhi] = clip(zs);

    const fx: number[] = [];
    const fy: number[] = [];
    const fz: number[] = [];
    for (let i = 0; i < xs.length; i++) {
      if (xs[i] >= xlo && xs[i] <= xhi && ys[i] >= ylo && ys[i] <= yhi && zs[i] >= zlo && zs[i] <= zhi) {
        fx.push(xs[i]);
        fy.push(ys[i]);
        fz.push(zs[i]);
      }
    }
    if (fx.length < 100) return null;

    // Floor cluster: bottom 25% by Y.
    const ySorted = [...fy].sort((a, b) => a - b);
    const ycut = ySorted[Math.floor(0.25 * (ySorted.length - 1))];
    const gx: number[] = [];
    const gy: number[] = [];
    const gz: number[] = [];
    for (let i = 0; i < fy.length; i++) {
      if (fy[i] <= ycut) {
        gx.push(fx[i]);
        gy.push(fy[i]);
        gz.push(fz[i]);
      }
    }
    const ux = gx.length >= 50 ? gx : fx;
    const uy = gx.length >= 50 ? gy : fy;
    const uz = gx.length >= 50 ? gz : fz;

    const n = ux.length;
    let mx = 0;
    let my = 0;
    let mz = 0;
    for (let i = 0; i < n; i++) {
      mx += ux[i];
      my += uy[i];
      mz += uz[i];
    }
    mx /= n;
    my /= n;
    mz /= n;
    let c00 = 0;
    let c01 = 0;
    let c02 = 0;
    let c11 = 0;
    let c12 = 0;
    let c22 = 0;
    for (let i = 0; i < n; i++) {
      const dx = ux[i] - mx;
      const dy = uy[i] - my;
      const dz = uz[i] - mz;
      c00 += dx * dx;
      c01 += dx * dy;
      c02 += dx * dz;
      c11 += dy * dy;
      c12 += dy * dz;
      c22 += dz * dz;
    }
    const inv = 1 / Math.max(n - 1, 1);
    const { values, vectors } = jacobiEigen3([
      c00 * inv,
      c01 * inv,
      c02 * inv,
      c11 * inv,
      c12 * inv,
      c22 * inv,
    ]);

    let si = 0;
    for (let i = 1; i < 3; i++) if (values[i] < values[si]) si = i;
    const sorted = [...values].sort((a, b) => a - b);
    const planarity = sorted[0] / Math.max(sorted[1], 1e-9); // small ⇒ flat floor ⇒ confident

    const normal = new THREE.Vector3(vectors[si][0], vectors[si][1], vectors[si][2]).normalize();
    if (normal.y < 0) normal.negate();
    const tiltDeg = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(normal.y, -1, 1)));
    const q = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0));

    // Only correct models that are clearly wrong AND have a confidently planar floor.
    const apply = tiltDeg > 8 && planarity < 0.25;
    return { quaternion: [q.x, q.y, q.z, q.w], apply, tiltDeg };
  } catch {
    return null;
  }
}
