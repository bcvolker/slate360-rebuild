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
  lidar_mesh: 5,
  photo: 1,
  drone_photo: 2,
};

const OUTPUT_MULTIPLIER: Record<string, number> = {
  spz: 1,
  ply: 1.12,
  glb: 1.28,
};

/**
 * Computes processing credits for newly processed capture assets (incremental billing).
 */
export function computeTwinProcessingCredits(
  assets: TwinCreditAsset[],
  outputFormat = "spz",
): number {
  if (!assets.length) return 0;

  const totalBytes = assets.reduce((sum, row) => sum + Number(row.file_size_bytes ?? 0), 0);
  const gb = totalBytes / (1024 * 1024 * 1024);
  let credits = Math.max(1, Math.round(8 + gb * 35));

  for (const asset of assets) {
    credits += KIND_SURCHARGE[asset.asset_kind] ?? 0;
  }

  const outputMul = OUTPUT_MULTIPLIER[outputFormat] ?? 1;
  return Math.max(1, Math.round(credits * outputMul));
}
