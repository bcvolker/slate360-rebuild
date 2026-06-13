export type ThermalJobTypeEstimate =
  | "extract"
  | "align"
  | "analyze"
  | "report"
  | "full_pipeline";

/** Rough Modal CPU credit guidance for ops planning (not billing). */
export function estimateThermalJobCredits(
  captureCount: number,
  jobType: ThermalJobTypeEstimate,
): { credits: number; note: string } {
  const count = Math.max(captureCount, 1);
  const perCapture: Record<ThermalJobTypeEstimate, number> = {
    extract: 0.35,
    align: 0.08,
    analyze: 0.12,
    report: 0.18,
    full_pipeline: 0.75,
  };
  const credits = Math.round(count * perCapture[jobType] * 10) / 10;
  return {
    credits,
    note: `~${credits} Modal CPU credits for ${count} capture${count === 1 ? "" : "s"} (${jobType}). Large batches stay CPU-first; GPU steps are off by default.`,
  };
}
