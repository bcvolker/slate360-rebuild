export type TwinCreditAsset = {
  asset_kind: string;
  file_size_bytes: number;
};

const KIND_SURCHARGE: Record<string, number> = {
  video: 3,
  drone_video: 4,
  panorama_360: 4,
  ply_lidar: 5,
  lidar_depth: 4,
  // lidar_mesh: the app's own device-captured LiDAR mesh (RoomPlan/ARKit mesh
  // anchors) — a real pipeline input, real GPU cost, surcharge stays. NOT the
  // same thing as an uploaded external mesh file (.obj/.glb/etc.) — those are
  // rejected client-side before they ever reach this function (C4) since the
  // pipeline doesn't consume them; billing for them would be dishonest (C5).
  lidar_mesh: 5,
  photo: 1,
  drone_photo: 2,
};

/**
 * Computes processing credits for newly processed capture assets (incremental billing).
 *
 * C5: output format no longer affects price — the API only ever dispatches
 * spz (ply/glb output_format requests are rejected before reaching a job),
 * so a per-format multiplier here would price something that never ships.
 */
export function computeTwinProcessingCredits(assets: TwinCreditAsset[]): number {
  if (!assets.length) return 0;

  const totalBytes = assets.reduce((sum, row) => sum + Number(row.file_size_bytes ?? 0), 0);
  const gb = totalBytes / (1024 * 1024 * 1024);
  let credits = Math.max(1, Math.round(8 + gb * 35));

  for (const asset of assets) {
    credits += KIND_SURCHARGE[asset.asset_kind] ?? 0;
  }

  return Math.max(1, credits);
}
