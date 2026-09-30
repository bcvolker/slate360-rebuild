/**
 * Twin Metric Processor V1 job contract.
 *
 * Processing master is .s360depth + lidar_poses.json (ARKit c2w keyframes).
 * preview_point_cloud.ply is never reconstruction truth.
 */

export const METRIC_PROCESSOR_JOB_TYPE = "metric_processor" as const;
export const METRIC_PROCESSOR_TRIGGER_TASK = "twin.metric_processor";
export const METRIC_PROCESSOR_MODAL_ENV = "MODAL_METRIC_ENDPOINT";
export const METRIC_PROCESSOR_OUTPUT_FORMAT = "glb" as const;

export const METRIC_REQUIRED_ASSET_KINDS = ["lidar_depth", "lidar_poses"] as const;
export const METRIC_OPTIONAL_ASSET_KINDS = [
  "lidar_traj",
  "video",
  "photo",
  "other",
] as const;

export type TwinAssetKindRef = { asset_kind: string | null | undefined };

export function isPreviewPointCloud(kind: string | null | undefined, filename?: string): boolean {
  if (kind === "ply_lidar") return true;
  return Boolean(filename && /preview_point_cloud\.ply$/i.test(filename));
}

export function metricProcessorInputAssets<T extends TwinAssetKindRef>(assets: T[]): T[] {
  return assets.filter((row) => {
    const kind = row.asset_kind ?? "";
    if (kind === "ply_lidar") return false;
    return (
      kind === "lidar_depth" ||
      kind === "lidar_poses" ||
      kind === "lidar_traj" ||
      kind === "video" ||
      kind === "photo"
    );
  });
}

export function metricProcessorMissingRequirements<T extends TwinAssetKindRef>(
  assets: T[],
): string | null {
  const kinds = new Set(assets.map((row) => row.asset_kind));
  if (!kinds.has("lidar_depth")) {
    return "Metric processor requires a ready .s360depth (lidar_depth) asset";
  }
  if (!kinds.has("lidar_poses")) {
    return "Metric processor requires a ready lidar_poses.json asset";
  }
  return null;
}

export function twinJobTriggerTaskId(jobType: string): string {
  if (jobType === "photogrammetry_mesh") return "twin.photogrammetry_mesh";
  if (jobType === "lidar_scan") return "twin.lidar_scan";
  if (jobType === "metric_processor") return METRIC_PROCESSOR_TRIGGER_TASK;
  return "twin.gaussian_splat";
}
