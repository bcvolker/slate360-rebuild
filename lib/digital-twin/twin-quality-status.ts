export type TwinQualityMetrics = Record<string, unknown> | null | undefined;

export type TwinQualityStatus =
  | "VERIFIED"
  | "ESTIMATED"
  | "LOW CONFIDENCE"
  | "UNREGISTERED";

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function resolveTwinQualityStatus(metrics: TwinQualityMetrics): TwinQualityStatus {
  const georeferenceStatus =
    typeof metrics?.georeferenceStatus === "string"
      ? metrics.georeferenceStatus.toUpperCase()
      : "";
  if (georeferenceStatus === "UNREGISTERED") return "UNREGISTERED";
  if (georeferenceStatus === "VERIFIED") return "VERIFIED";
  const metricScaleApplied =
    metrics?.metricScaleApplied === true ||
    metrics?.metric_scale_applied === true ||
    asNumber(metrics?.scaleFactorApplied) !== null ||
    // The gaussian worker emits `scaleFactor` (nullable); a finite value means
    // metric scale was actually recovered and applied.
    asNumber(metrics?.scaleFactor) !== null;
  if (metricScaleApplied) return "ESTIMATED";
  return "LOW CONFIDENCE";
}
