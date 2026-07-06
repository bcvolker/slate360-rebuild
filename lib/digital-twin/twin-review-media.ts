export type TwinMediaCategory =
  | "phone_video"
  | "phone_photo"
  | "360_video"
  | "360_photo"
  | "drone_video"
  | "drone_photo"
  | "lidar"
  | "mesh"
  | "other";

/** Point-cloud / LiDAR scan formats. */
const LIDAR_EXT = /\.(ply|las|laz|e57|pcd|xyz|pts)$/i;
/** Textured-mesh / 3D-model formats. */
const MESH_EXT = /\.(obj|glb|gltf|fbx|stl)$/i;
/**
 * Best-effort drone detection from the filename. Drone files arrive with no
 * reliable client-side metadata, so we match the common manufacturer naming
 * conventions across brands. When `forceDrone` is passed (e.g. files added via
 * the dedicated "Drone Footage" picker) we trust that instead of guessing.
 */
const DRONE_HINT = /\b(drone|dji|mavic|phantom|matrice|inspire|avata|autel|evo|skydio|anafi|parrot|yuneec)\b|^dji_|^autel_|^drone[_-]/i;

export function isLikelyDroneFilename(name: string): boolean {
  return DRONE_HINT.test(name);
}

export function classifyTwinMedia(file: File, forceDrone = false): TwinMediaCategory {
  const name = file.name.toLowerCase();
  if (LIDAR_EXT.test(name) || file.type.includes("ply")) return "lidar";
  if (MESH_EXT.test(name)) return "mesh";
  const isVideo =
    file.type.startsWith("video/") || /\.(webm|mp4|mov|m4v)$/i.test(file.name);
  if (forceDrone || isLikelyDroneFilename(name)) {
    return isVideo ? "drone_video" : "drone_photo";
  }
  const is360 = name.includes("360") || name.includes("pano") || name.includes("insta360");
  if (is360 && isVideo) return "360_video";
  if (is360) return "360_photo";
  if (isVideo) return "phone_video";
  if (file.type.startsWith("image/")) return "phone_photo";
  return "other";
}

export function twinMediaToAssetKind(file: File, forceDrone = false): string {
  const category = classifyTwinMedia(file, forceDrone);
  switch (category) {
    case "360_video":
    case "360_photo":
      return "panorama_360";
    case "drone_video":
      return "drone_video";
    case "drone_photo":
      return "drone_photo";
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

/** True for drone-sourced photo/video. */
export function isTwinDroneCategory(category: TwinMediaCategory): boolean {
  return category === "drone_video" || category === "drone_photo";
}

/**
 * C4: formats accepted by the file picker but never actually consumed anywhere
 * in the reconstruction pipeline — textured meshes (worker.py has no .obj/.glb/
 * .gltf/.fbx/.stl handling anywhere), geospatial tracks (no .kml/.gpx/.geojson
 * parsing), and external point-cloud formats other than the app's own device
 * .ply (worker.py's LiDAR path only reads .ply — see _transform_and_write_lidar_ply
 * — never .las/.laz/.e57/.pcd/.xyz/.pts). Rejected client-side before upload
 * rather than silently accepted, billed for a surcharge, and unused.
 */
const UNUSABLE_SOURCE_EXT = /\.(obj|glb|gltf|fbx|stl|kml|gpx|geojson|las|laz|e57|pcd|xyz|pts)$/i;

export function isUnusableTwinSourceFile(file: File): boolean {
  return UNUSABLE_SOURCE_EXT.test(file.name.toLowerCase());
}

export function countTwinEstimateFrames(files: File[]): number {
  let frames = 0;
  for (const file of files) {
    const category = classifyTwinMedia(file);
    if (category === "phone_video" || category === "360_video" || category === "drone_video") {
      frames += 8;
    } else {
      frames += 1;
    }
  }
  return Math.max(1, frames);
}

export function hasMixedTwinMediaCategories(categories: TwinMediaCategory[]): boolean {
  const primary = new Set(
    categories.filter(
      (row) => row === "phone_video" || row === "360_video" || row === "drone_video",
    ),
  );
  return primary.size > 1;
}
