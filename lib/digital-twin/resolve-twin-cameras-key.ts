import "server-only";

/**
 * Derive the R2 key for cameras.json from a model storage_key or quality_metrics.
 */
export function resolveTwinCamerasKey(
  storageKey: string | null | undefined,
  qualityMetrics?: Record<string, unknown> | null,
): string | null {
  const derivativeKeys = qualityMetrics?.derivativeKeys;
  if (derivativeKeys && typeof derivativeKeys === "object") {
    const cameras = (derivativeKeys as Record<string, unknown>).cameras;
    if (typeof cameras === "string" && cameras.length > 0) return cameras;
  }
  if (!storageKey) return null;
  const lower = storageKey.toLowerCase();
  for (const suffix of [".spz", ".glb", ".ply"]) {
    if (lower.endsWith(suffix)) {
      return `${storageKey.slice(0, -suffix.length)}.cameras.json`;
    }
  }
  return `${storageKey}.cameras.json`;
}
