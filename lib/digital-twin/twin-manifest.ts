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
  /** R8.1: same shape as recommended_orbit_camera — the new preferred name.
   * Both are written by the worker (identical values); read fallback_camera
   * first, falling back to recommended_orbit_camera for pre-R8 models. */
  fallback_camera?: {
    position: number[];
    target: number[];
    fov?: number;
    near?: number;
    far?: number;
  };
  /** R8.1: a real capture pose (median-time, sharpest-nearby COLMAP-registered
   * frame) to open the model on — preferred over fallback_camera whenever
   * present. Same post-flip space as bounds/fallback_camera. */
  initial_camera?: {
    position: number[];
    /** [x, y, z, w] */
    rotation: [number, number, number, number];
    source: "capture_pose";
  } | null;
  interior_entry_point?: number[];
  /** Q1: true when a real metric scale factor (recovered from ARKit<->COLMAP
   * trajectory correspondence) was baked into this model's positions. */
  metric_scale_applied?: boolean;
};

/**
 * Fetch the manifest for a (presigned or public) model URL via the server route,
 * which derives the sibling ".manifest.json" key and reads it from R2.
 * Returns null on any failure → callers must treat that as "no correction".
 */
export async function fetchSplatManifest(modelUrl: string): Promise<SplatManifest | null> {
  try {
    // Share links stream the model via `/api/share/twin/<token>/splat`, whose path
    // has no `.spz` suffix — so the generic `?u=` manifest route can't derive the
    // sibling key and 404s (leaving the model uncorrected/upside-down on the branded
    // link). Route those URLs to the token-scoped share manifest endpoint instead.
    const shareMatch = modelUrl.match(/\/api\/share\/twin\/([^/?]+)\/splat(?:$|\?)/);
    // Authenticated viewer streams via /api/digital-twin/models/<id>/splat (no .spz suffix) — route
    // its manifest to the org-scoped sibling endpoint, same as the share path does for its token.
    const authMatch = modelUrl.match(/\/api\/digital-twin\/models\/([^/?]+)\/splat(?:$|\?)/);
    const endpoint = shareMatch
      ? `/api/share/twin/${shareMatch[1]}/manifest`
      : authMatch
        ? `/api/digital-twin/models/${authMatch[1]}/manifest`
        : `/api/digital-twin/splat-manifest?u=${encodeURIComponent(modelUrl)}`;
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const data = (await res.json()) as SplatManifest | null;
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}
