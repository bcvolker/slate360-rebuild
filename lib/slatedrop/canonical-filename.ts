/**
 * SlateDrop canonical asset naming: YYYY-MM-DD_HH-MM_[Type]_[ID].ext
 */
export type CanonicalAssetType =
  | "Photo"
  | "Note"
  | "VoiceMemo"
  | "Clip"
  | "Model"
  | "SourceAsset"
  | "Plan"
  | "Deliverable"
  | "Document"
  | "File";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatTimestamp(at: Date): string {
  const date = `${at.getFullYear()}-${pad2(at.getMonth() + 1)}-${pad2(at.getDate())}`;
  const time = `${pad2(at.getHours())}-${pad2(at.getMinutes())}`;
  return `${date}_${time}`;
}

function shortId(id: string): string {
  const compact = id.replace(/-/g, "");
  return compact.length >= 8 ? compact.slice(0, 8) : compact;
}

function normalizeExtension(ext: string): string {
  return ext.replace(/^\./, "").toLowerCase() || "bin";
}

export function buildCanonicalAssetFilename(params: {
  type: CanonicalAssetType;
  id: string;
  ext: string;
  at?: Date;
}): string {
  const stamp = formatTimestamp(params.at ?? new Date());
  const safeExt = normalizeExtension(params.ext);
  return `${stamp}_${params.type}_${shortId(params.id)}.${safeExt}`;
}

export function extensionFromFilename(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "bin";
}

export function extensionFromMime(mime: string, fallback = "bin"): string {
  const lower = mime.toLowerCase();
  if (lower.includes("jpeg") || lower === "image/jpg") return "jpg";
  if (lower.includes("png")) return "png";
  if (lower.includes("webp")) return "webp";
  if (lower.includes("heic")) return "heic";
  if (lower.includes("pdf")) return "pdf";
  if (lower.includes("webm")) return "webm";
  if (lower.includes("mp4")) return "mp4";
  if (lower.includes("mpeg")) return "mp3";
  if (lower.includes("wav")) return "wav";
  if (lower.includes("ogg")) return "ogg";
  return fallback;
}
