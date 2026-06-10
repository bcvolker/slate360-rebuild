export type TwinMediaCategory =
  | "phone_video"
  | "phone_photo"
  | "360_video"
  | "360_photo"
  | "other";

export function classifyTwinMedia(file: File): TwinMediaCategory {
  const name = file.name.toLowerCase();
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
  if (category === "360_video" || category === "360_photo") return "panorama_360";
  if (category === "phone_video") return "video";
  if (category === "phone_photo") return "photo";
  return "photo";
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
