export type TwinMediaCategory =
  | "phone_video"
  | "phone_photo"
  | "360_video"
  | "360_photo"
  | "lidar"
  | "mesh"
  | "other";

/** Point-cloud / LiDAR scan formats. */
const LIDAR_EXT = /\.(ply|las|laz|e57|pcd|xyz|pts)$/i;
/** Textured-mesh / 3D-model formats. */
const MESH_EXT = /\.(obj|glb|gltf|fbx|stl)$/i;

export function classifyTwinMedia(file: File): TwinMediaCategory {
  const name = file.name.toLowerCase();
  if (LIDAR_EXT.test(name) || file.type.includes("ply")) return "lidar";
  if (MESH_EXT.test(name)) return "mesh";
  const is360 = name.includes("360") || name.includes("pano") || name.includes("insta360");
  const isVideo =
    file.type.startsWith("video/") || /\.(webm|mp4|mov|m4v)$/i.test(file.name);
  if (is360 && isVideo) return "360_video";
  if (is360) return "360_photo";
  if (isVideo) return "phone_video";
  if (file.type.startsWith("image/")) return "phone_photo";
  return "other";
}

export function twinMediaToAssetKind(file: File): string {
  const category = classifyTwinMedia(file);
  switch (category) {
    case "360_video":
    case "360_photo":
      return "panorama_360";
    case "phone_video":
      return "video";
    case "lidar":
      return "ply_lidar";
    case "mesh":
      return "lidar_mesh";
    case "phone_photo":
      return "photo";
    default:
      return "photo";
  }
}

/** True for added sources that are 3D scans/models rather than photo/video. */
export function isTwinScanCategory(category: TwinMediaCategory): boolean {
  return category === "lidar" || category === "mesh";
}

export function countTwinEstimateFrames(files: File[]): number {
  let frames = 0;
  for (const file of files) {
    const category = classifyTwinMedia(file);
    if (category === "phone_photo" || category === "360_photo") {
      frames += 1;
    } else if (category === "phone_video" || category === "360_video") {
      frames += 8;
    } else {
      frames += 1;
    }
  }
  return Math.max(1, frames);
}

export function hasMixedTwinMediaCategories(categories: TwinMediaCategory[]): boolean {
  const primary = new Set(
    categories.filter((row) => row === "phone_video" || row === "360_video"),
  );
  return primary.size > 1;
}
