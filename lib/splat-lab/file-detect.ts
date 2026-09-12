/**
 * Classifies dropped/browsed files by what they actually are, so the drop
 * zone can tell the user what it found and set the right pipeline options
 * automatically instead of asking them to know "SfM mode: Native vs Rig"
 * up front. Detection is by extension plus, for images, a lightweight
 * client-side dimension check (a 2:1 frame is almost certainly equirect
 * 360 footage; the pipeline still lets the user override the toggle).
 */

export type CaptureKind =
  | "video-360"
  | "video-flat"
  | "photogrammetry"
  | "lidar"
  | "rtk-gps"
  | "mixed"
  | "unknown";

export type ClassifiedFile = {
  name: string;
  relativePath: string;
  sizeBytes: number;
  kind: CaptureKind;
};

export type DropSummary = {
  kind: CaptureKind;
  files: ClassifiedFile[];
  totalBytes: number;
  suggestedIs360: boolean;
  suggestedSphericalMode: "native" | "rig";
  message: string;
  warnings: string[];
};

const VIDEO_360_HINT_EXT = new Set([".insv", ".lrv"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm", ".avi", ".insv", ".lrv", ".mts"]);
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".dng", ".tif", ".tiff", ".webp"]);
// Raw point-cloud / scan formats. Not yet consumed by the pipeline (see
// docs/ops/SPLAT_LAB_PARITY_BUILD_PLAN.md — LiDAR fusion is a Lab research
// item), but the drop zone must still recognize and keep them rather than
// silently dropping data the user explicitly handed it.
const LIDAR_EXT = new Set([".las", ".laz", ".e57", ".ptx", ".pts", ".xyz"]);
// RTK/PPK correction sidecars (DJI .MRK, generic .obs/.pos) and raw
// telemetry logs. Also not yet consumed as a positioning prior.
const RTK_EXT = new Set([".mrk", ".obs", ".pos", ".rtk", ".rtcm"]);

function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

function classifyOne(name: string): CaptureKind {
  const e = ext(name);
  if (VIDEO_360_HINT_EXT.has(e)) return "video-360";
  if (VIDEO_EXT.has(e)) return "video-flat"; // refined to video-360 by dimension check below
  if (LIDAR_EXT.has(e)) return "lidar";
  if (RTK_EXT.has(e)) return "rtk-gps";
  if (IMAGE_EXT.has(e)) return "photogrammetry"; // a lone still; folders of these become photogrammetry
  return "unknown";
}

/** True if a frame's aspect ratio is close enough to 2:1 to be equirectangular. */
export function looksEquirectangular(width: number, height: number): boolean {
  if (!width || !height) return false;
  const ratio = width / height;
  return ratio > 1.85 && ratio < 2.15;
}

export function classifyFiles(files: { name: string; relativePath: string; size: number }[]): DropSummary {
  const classified: ClassifiedFile[] = files.map((f) => ({
    name: f.name, relativePath: f.relativePath, sizeBytes: f.size, kind: classifyOne(f.name),
  }));
  const totalBytes = classified.reduce((s, f) => s + f.sizeBytes, 0);
  const kinds = new Set(classified.map((f) => f.kind));
  const warnings: string[] = [];

  const lidarFiles = classified.filter((f) => f.kind === "lidar");
  const rtkFiles = classified.filter((f) => f.kind === "rtk-gps");
  if (lidarFiles.length) {
    warnings.push(
      `${lidarFiles.length} LiDAR file(s) kept alongside your capture, but LiDAR fusion is not wired into ` +
      "the pipeline yet (Lab research item) — they will not affect this run's geometry.",
    );
  }
  if (rtkFiles.length) {
    warnings.push(
      `${rtkFiles.length} RTK/GPS file(s) kept alongside your capture, but RTK positioning priors are not ` +
      "wired into the pipeline yet (Lab research item) — this run uses SfM-only poses.",
    );
  }

  const videoFiles = classified.filter((f) => f.kind === "video-360" || f.kind === "video-flat");
  const imageFiles = classified.filter((f) => f.kind === "photogrammetry");
  const nonAsideCount = classified.length - lidarFiles.length - rtkFiles.length;

  let kind: CaptureKind = "unknown";
  let suggestedIs360 = false;
  let message = "";

  if (videoFiles.length > 0 && imageFiles.length === 0) {
    const any360Hint = videoFiles.some((f) => f.kind === "video-360");
    kind = "video-360"; // dimension check upgrades video-flat -> video-360 before this runs, see classifyDrop
    suggestedIs360 = any360Hint || videoFiles.some((f) => f.kind === "video-360");
    message = suggestedIs360
      ? `Detected 360 video: ${videoFiles.length} file(s), ${formatBytes(totalBytes)}. Looks like an Insta360/DJI-style equirectangular walk.`
      : `Detected flat video: ${videoFiles.length} file(s), ${formatBytes(totalBytes)}. Will run as a standard (non-360) capture.`;
  } else if (imageFiles.length > 3 && videoFiles.length === 0) {
    kind = "photogrammetry";
    suggestedIs360 = false;
    message = `Detected a photogrammetry mission: ${imageFiles.length} still images, ${formatBytes(totalBytes)}.`;
  } else if (imageFiles.length > 0 && videoFiles.length === 0) {
    kind = "photogrammetry";
    message = `Detected ${imageFiles.length} still image(s), ${formatBytes(totalBytes)}.`;
  } else if (videoFiles.length > 0 && imageFiles.length > 0) {
    kind = "mixed";
    message = `Detected a mixed drop: ${videoFiles.length} video(s) + ${imageFiles.length} image(s). Only one input kind is used per run — pick the video or the image set.`;
    warnings.push("Mixed video + still-image drops are not merged automatically; the pipeline uses whichever kind is present in the folder.");
  } else if (nonAsideCount === 0 && (lidarFiles.length || rtkFiles.length)) {
    kind = "unknown";
    message = "Only LiDAR/RTK files were dropped — no video or images to reconstruct from. Add a 360 video or a photo set alongside them.";
  } else {
    kind = "unknown";
    message = classified.length === 0 ? "No recognized capture files found." : `Dropped ${classified.length} file(s) of an unrecognized type.`;
  }

  return {
    kind, files: classified, totalBytes, suggestedIs360,
    suggestedSphericalMode: "native", message, warnings,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(1)} ${units[i]}`;
}
