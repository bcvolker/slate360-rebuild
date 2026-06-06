/** Maps digital_twin_models.model_format (+ storage key) to viewer kind. */

export type TwinViewerKind = "splat" | "model" | "pano" | "unsupported";

const PANO_FORMATS = new Set(["360", "panorama", "panorama_360", "pano"]);
const MODEL_FORMATS = new Set(["glb", "gltf", "usdz"]);

export function resolveTwinViewerKind(
  modelFormat: string,
  storageKey: string,
): TwinViewerKind {
  const format = modelFormat.trim().toLowerCase();
  const ext = storageKey.split(/[?#]/)[0]?.split(".").pop()?.toLowerCase() ?? "";

  if (format === "spz" || ext === "spz") return "splat";
  if (PANO_FORMATS.has(format)) return "pano";
  if (MODEL_FORMATS.has(format) || ext === "glb" || ext === "gltf") return "model";
  if (format === "ply" || format === "splat_ply") return "unsupported";
  return "unsupported";
}
