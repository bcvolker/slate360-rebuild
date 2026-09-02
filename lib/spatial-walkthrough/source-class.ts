export type IngestClass =
  | "RAW_INSTA360"
  | "STITCHED_ERP_VIDEO"
  | "STITCHED_ERP_STILL"
  | "PERSPECTIVE_VIDEO"
  | "PERSPECTIVE_STILLS"
  | "RGBD_IPHONE"
  | "LIDAR"
  | "DRONE"
  | "DOCUMENT"
  | "UNKNOWN";

const INSV = /\.insv$/i;
const VIDEO = /\.(mp4|mov|m4v)$/i;
const STILL = /\.(jpe?g|dng|png|webp)$/i;
const DEPTH = /\.s360depth$/i;
const LIDAR = /(lidar_poses\.json|lidar_traj\.jsonl)$/i;
const MESH = /\.(ply|glb|spz)$/i;
const DOC = /\.(pdf|dwg|dxf)$/i;

export function classifySource(input: {
  fileName: string;
  mime?: string | null;
  width?: number | null;
  height?: number | null;
}): IngestClass {
  const name = input.fileName.trim();
  const mime = (input.mime ?? "").toLowerCase();
  if (INSV.test(name)) return "RAW_INSTA360";
  if (DEPTH.test(name) || /s360depth/i.test(mime)) return "RGBD_IPHONE";
  if (LIDAR.test(name)) return "LIDAR";
  if (MESH.test(name)) return "LIDAR";
  if (DOC.test(name) || mime === "application/pdf") return "DOCUMENT";
  if (/drone|dji_|mavic|air2s|mini3/i.test(name)) return "DRONE";
  if (isErp(input.width, input.height)) {
    if (VIDEO.test(name) || mime.startsWith("video/")) return "STITCHED_ERP_VIDEO";
    if (STILL.test(name) || mime.startsWith("image/")) return "STITCHED_ERP_STILL";
  }
  if (VIDEO.test(name) || mime.startsWith("video/")) return "PERSPECTIVE_VIDEO";
  if (STILL.test(name) || mime.startsWith("image/")) return "PERSPECTIVE_STILLS";
  return "UNKNOWN";
}

/** Full-sphere ERP is ~2:1. Raw .insv is never this. */
export function isErp(width?: number | null, height?: number | null): boolean {
  if (!width || !height || height < 2) return false;
  const ratio = width / height;
  return ratio >= 1.9 && ratio <= 2.15;
}

export function isBrowserPanorama(kind: IngestClass): boolean {
  return kind === "STITCHED_ERP_VIDEO" || kind === "STITCHED_ERP_STILL";
}
