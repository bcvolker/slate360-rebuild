/**
 * Splat orientation/framing manifest baked by the Modal twin worker
 * (workers/modal/twin-gaussian-splat/worker.py → compute_splat_manifest).
 *
 * Values are in the viewer's POST-flip space (the splatMesh renders with
 * rotation=[Math.PI,0,0]); `correction_quaternion` is applied to the PARENT
 * group on top of that flip so the model is upright + centered.
 */
export type SplatManifest = {
  version?: number;
  coordinate_system?: string;
  bounds?: { min?: number[]; max?: number[]; center?: number[]; radius?: number };
  up_axis?: string;
  tilt_deg?: number;
  /** [x, y, z, w] — apply to the model's parent THREE.Group. */
  correction_quaternion?: [number, number, number, number];
  recommended_orbit_camera?: {
    position: number[];
    target: number[];
    fov?: number;
    near?: number;
    far?: number;
  };
  interior_entry_point?: number[];
};

/**
 * Fetch the manifest for a (presigned or public) model URL via the server route,
 * which derives the sibling ".manifest.json" key and reads it from R2.
 * Returns null on any failure → callers must treat that as "no correction".
 */
export async function fetchSplatManifest(modelUrl: string): Promise<SplatManifest | null> {
  try {
    const res = await fetch(`/api/digital-twin/splat-manifest?u=${encodeURIComponent(modelUrl)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as SplatManifest | null;
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}
