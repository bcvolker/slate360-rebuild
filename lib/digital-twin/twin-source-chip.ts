/**
 * M1 — per-source classification chip model.
 *
 * The Review & Sources screen shows one chip per collected source (Phone / 360 / Drone /
 * LiDAR). The chip is user-correctable intent and feeds `asset_kind`, which the
 * reconstruction dispatch uses as its source role.
 *
 * A measured equirectangular probe remains authoritative for 360 detection. When a file is
 * measured as equirectangular or dual-fisheye, the UI exposes only the 360 chip.
 */

import { isLikelyDroneFilename } from "./twin-review-media";
import type { Twin360Projection } from "./twin-equirect-probe";

export type TwinSourceChip = "phone" | "360" | "drone" | "lidar";

export const TWIN_SOURCE_CHIPS: readonly TwinSourceChip[] = ["phone", "360", "drone", "lidar"];

/** Lightweight file shape shared by browser files and persisted asset rows. */
export type TwinFileDescriptor = {
  name: string;
  type: string;
};

const VIDEO_RE = /\.(webm|mp4|mov|m4v|insv)$/i;
// A4: the native iOS uploader gzips ply_lidar/lidar_poses evidence in-place
// (lidar_capture.ply.gz, lidar_poses.json.gz — see TwinGzip.gzipFile), so an
// end-anchored extension match misses them and the review UI mislabels
// native LiDAR files as "Phone". Tolerate an optional trailing ".gz".
const LIDAR_RE = /\.(ply|las|laz|e57|pcd|xyz|pts|s360depth)(\.gz)?$/i;
const LIDAR_POSES_RE = /(?:^|[_-])poses\.json(\.gz)?$/i;
const LIDAR_TRAJ_RE = /(?:^|[_-])traj\.jsonl(\.gz)?$/i;
const INSTA360_RAW_RE = /\.(insv|insp)$/i;

export function isVideoDescriptor(file: TwinFileDescriptor): boolean {
  return file.type.startsWith("video/") || VIDEO_RE.test(file.name);
}

export function isLidarDescriptor(file: TwinFileDescriptor): boolean {
  return LIDAR_RE.test(file.name) || LIDAR_POSES_RE.test(file.name) || LIDAR_TRAJ_RE.test(file.name) || file.type.includes("ply");
}

export function chipLabel(chip: TwinSourceChip): string {
  switch (chip) {
    case "phone":
      return "Phone";
    case "360":
      return "360";
    case "drone":
      return "Drone";
    case "lidar":
      return "LiDAR";
  }
}

/** True when measured projection prevents a non-360 interpretation. */
export function isChipLocked(chip: TwinSourceChip, projection: Twin360Projection): boolean {
  if (projection === "equirect" || projection === "dual_fisheye") return chip !== "360";
  return false;
}

/** LiDAR files and measured 360 files have a constrained set of valid chips. */
export function availableChipsForFile(
  file: TwinFileDescriptor,
  projection: Twin360Projection = "unknown",
): TwinSourceChip[] {
  if (isLidarDescriptor(file)) return ["lidar"];
  if (projection === "equirect" || projection === "dual_fisheye") return ["360"];
  if (INSTA360_RAW_RE.test(file.name)) return ["360"];
  return ["phone", "360", "drone"];
}

/** Measured projection wins, then a reliable filename hint, then Phone. */
export function defaultChipForFile(
  file: TwinFileDescriptor,
  projection: Twin360Projection = "unknown",
  forceDrone = false,
): TwinSourceChip {
  if (isLidarDescriptor(file)) return "lidar";
  if (projection === "equirect" || projection === "dual_fisheye") return "360";
  if (INSTA360_RAW_RE.test(file.name)) return "360";
  if (forceDrone || isLikelyDroneFilename(file.name)) return "drone";
  return "phone";
}

/** Map a chip to the asset kind consumed by existing upload and job contracts. */
export function assetKindForChip(chip: TwinSourceChip, file: TwinFileDescriptor): string {
  if (chip === "lidar") {
    if (/\.s360depth$/i.test(file.name)) return "lidar_depth";
    if (LIDAR_TRAJ_RE.test(file.name)) return "lidar_traj";
    if (LIDAR_POSES_RE.test(file.name)) return "lidar_poses";
    return "ply_lidar";
  }
  if (chip === "360") return "panorama_360";
  if (chip === "drone") return isVideoDescriptor(file) ? "drone_video" : "drone_photo";
  return isVideoDescriptor(file) ? "video" : "photo";
}

/** Map a persisted asset kind back to the visible chip. */
export function chipForAssetKind(assetKind: string): TwinSourceChip {
  switch (assetKind) {
    case "panorama_360":
      return "360";
    case "drone_photo":
    case "drone_video":
      return "drone";
    case "ply_lidar":
    case "lidar_depth":
    case "lidar_mesh":
    case "lidar_poses":
    case "lidar_traj":
      return "lidar";
    default:
      return "phone";
  }
}

/** Any Drone source selects the exterior product contract; other sources use the interior path. */
export function deriveJobType(
  chips: TwinSourceChip[],
): { jobType: "gaussian_splat" | "photogrammetry_mesh"; outputFormat: "spz" | "glb" } {
  if (chips.includes("drone")) return { jobType: "photogrammetry_mesh", outputFormat: "glb" };
  return { jobType: "gaussian_splat", outputFormat: "spz" };
}
