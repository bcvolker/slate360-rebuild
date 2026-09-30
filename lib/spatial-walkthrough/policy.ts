import type { SharePolicy } from "./types";
export type { MediaKind } from "./derivatives";
export { allowedMediaKind, selectDerivativeKey, stripMasterKeys } from "./derivatives";

export function filterProjectFilesForPolicy<T extends { id: string }>(
  files: T[],
  allowedIds: Set<string>,
  policy: SharePolicy,
): T[] {
  if (policy !== "public") return files;
  return files.filter((f) => allowedIds.has(f.id));
}

export const REJECTED_RAW_VIDEO_EXTENSIONS = [".insv", ".insp", ".360", ".dng", ".gpr"] as const;
export const ACCEPTED_VIDEO_MIME = ["video/mp4", "video/quicktime"] as const;
export const EQUIRECT_ASPECT_MIN = 1.7;
export const EQUIRECT_ASPECT_MAX = 2.3;

export function hasRejectedRawVideoExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return REJECTED_RAW_VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isAcceptedVideoMime(contentType: string): boolean {
  const c = contentType.toLowerCase().split(";")[0].trim();
  return (ACCEPTED_VIDEO_MIME as readonly string[]).includes(c) || c === "video/quicktime";
}

export function isEquirectAspectRatio(width: number, height: number): boolean {
  if (height <= 0) return false;
  const ratio = width / height;
  return ratio >= EQUIRECT_ASPECT_MIN && ratio <= EQUIRECT_ASPECT_MAX;
}

export function validateWalkthroughUpload(meta: {
  filename: string;
  contentType: string;
  size: number;
  width?: number;
  height?: number;
}): { ok: true } | { ok: false; error: string } {
  if (!meta.filename || !meta.contentType || !meta.size) {
    return { ok: false, error: "Missing required fields" };
  }
  if (hasRejectedRawVideoExtension(meta.filename)) {
    return {
      ok: false,
      error: "Raw camera files are not supported. Export a stitched 2:1 MP4 from Insta360 Studio first.",
    };
  }
  if (!isAcceptedVideoMime(meta.contentType) && !meta.filename.toLowerCase().endsWith(".mp4")) {
    return { ok: false, error: "Only stitched MP4 files are accepted." };
  }
  if (meta.width != null && meta.height != null && !isEquirectAspectRatio(meta.width, meta.height)) {
    return {
      ok: false,
      error: `This video does not appear to be equirectangular 2:1 (got ${meta.width}×${meta.height}).`,
    };
  }
  return { ok: true };
}
