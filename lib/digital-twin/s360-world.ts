/**
 * S360_WORLD — common construction-twin coordinate frame.
 *
 * Source assets keep their native coordinates. A Sim(3) (uniform scale +
 * rotation + translation) maps them into this world. Never bake unexplained
 * viewer rotations into every future asset.
 *
 * Spark's splatMesh rotation={[Math.PI,0,0]} is Rx(π) ≡ (x, -y, -z). That is a
 * Gaussian/Spark SOURCE convention matching COLMAP PLY, NOT an S360_WORLD law.
 * LiDAR/TSDF meshes must not receive it. ODGS assets must declare their own
 * coordinate_system + registration instead of inheriting this flip.
 */

export const S360_WORLD = "S360_WORLD" as const;

export type SourceFrame =
  | typeof S360_WORLD
  | "SPARK_SPLAT_POST_PI_FLIP"
  | "COLMAP_OPENCV"
  | "ARKIT_LIDAR"
  | "TSDF_MESH"
  | "CUSTOM";

export type Vec3 = { x: number; y: number; z: number };

/** Uniform-scale rigid transform. `matrix` is column-major 4×4 (three.js). */
export type Sim3 = {
  matrix: readonly number[];
  scale: number;
};

export type AssetPose = {
  sourceFrame: SourceFrame;
  toWorld: Sim3;
};

const I16 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] as const;

export function identitySim3(): Sim3 {
  return { matrix: [...I16], scale: 1 };
}

/** Rx(π): Spark splatMesh rotation={[Math.PI,0,0]}. Apply only to Gaussian assets. */
export function sparkPiXFlipSim3(): Sim3 {
  // column-major: x' = x, y' = -y, z' = -z
  return {
    matrix: [1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1],
    scale: 1,
  };
}

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function isFiniteVec3(value: unknown): value is Vec3 {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.x === "number" &&
    typeof v.y === "number" &&
    typeof v.z === "number" &&
    Number.isFinite(v.x) &&
    Number.isFinite(v.y) &&
    Number.isFinite(v.z)
  );
}

function mat4(m: readonly number[]): number[] {
  if (m.length !== 16) {
    throw new Error("Sim3.matrix must be a column-major 4×4 (length 16)");
  }
  return [...m];
}

/** Apply uniform scale, then the 4×4 (rotation + translation). */
export function applySim3(sim: Sim3, p: Vec3): Vec3 {
  const s = sim.scale;
  const x = p.x * s;
  const y = p.y * s;
  const z = p.z * s;
  const m = mat4(sim.matrix);
  return {
    x: m[0] * x + m[4] * y + m[8] * z + m[12],
    y: m[1] * x + m[5] * y + m[9] * z + m[13],
    z: m[2] * x + m[6] * y + m[10] * z + m[14],
  };
}

export function sourceToWorld(point: Vec3, pose: AssetPose): Vec3 {
  return applySim3(pose.toWorld, point);
}

export function composeSim3(first: Sim3, second: Sim3): Sim3 {
  const a = mat4(first.matrix);
  const b = mat4(second.matrix);
  const out = new Array<number>(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[col * 4 + row] =
        a[row] * b[col * 4] +
        a[4 + row] * b[col * 4 + 1] +
        a[8 + row] * b[col * 4 + 2] +
        a[12 + row] * b[col * 4 + 3];
    }
  }
  return { matrix: out, scale: first.scale * second.scale };
}

export function translationSim3(tx: number, ty: number, tz: number): Sim3 {
  const m = [...I16];
  m[12] = tx;
  m[13] = ty;
  m[14] = tz;
  return { matrix: m, scale: 1 };
}

export function uniformScaleSim3(scale: number): Sim3 {
  return { matrix: [...I16], scale };
}

/** Row-major 4×4 → column-major (three.js / this module). */
export function rowMajor4ToColumnMajor(rowMajor: readonly (readonly number[])[]): number[] {
  if (rowMajor.length !== 4 || rowMajor.some((r) => r.length !== 4)) {
    throw new Error("expected a 4×4 row-major matrix");
  }
  const out = new Array<number>(16);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      out[col * 4 + row] = rowMajor[row][col];
    }
  }
  return out;
}

export function sim3FromRowMajor4(rowMajor: readonly (readonly number[])[], scale: number): Sim3 {
  return { matrix: rowMajor4ToColumnMajor(rowMajor), scale };
}

/** Rotate about Y (radians), then translate. Scale stays 1. */
export function yawTranslationSim3(yawRad: number, tx: number, ty: number, tz: number): Sim3 {
  const c = Math.cos(yawRad);
  const s = Math.sin(yawRad);
  return {
    matrix: [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, tx, ty, tz, 1],
    scale: 1,
  };
}

export type RegistrationStatus = "validated" | "unvalidated" | "absent";

export type AssetRegistration = {
  toWorld: Sim3;
  sourceFrame: SourceFrame;
  method: string | null;
  rmse: number | null;
  status: RegistrationStatus;
  timestamp: string | null;
  version: string | null;
};

export function defaultRegistration(
  sourceFrame: SourceFrame,
  status: RegistrationStatus = "unvalidated",
): AssetRegistration {
  return {
    toWorld: identitySim3(),
    sourceFrame,
    method: null,
    rmse: null,
    status,
    timestamp: null,
    version: null,
  };
}

export type MetricRaycastTarget = "metric-mesh" | "unavailable";

/**
 * Measurement picks always hit the LiDAR/TSDF mesh when one exists — even if
 * that mesh is visually hidden under a Gaussian Reality view.
 * Gaussian geometry is never a fallback metric surface.
 */
export function measurementRaycastTarget(hasMetricMesh: boolean): MetricRaycastTarget {
  return hasMetricMesh ? "metric-mesh" : "unavailable";
}

export function metricMeasurementAllowed(args: {
  hasMetricMesh: boolean;
  meshRegistration: AssetRegistration | null;
}): boolean {
  if (!args.hasMetricMesh) return false;
  const status = args.meshRegistration?.status ?? "unvalidated";
  // The mesh itself is metric truth. Unvalidated Gaussian-to-mesh registration
  // does not poison mesh-on-mesh picks. Absent mesh registration still allows
  // measuring the mesh in its native frame (treated as S360_WORLD).
  return status !== "absent" || args.hasMetricMesh;
}
