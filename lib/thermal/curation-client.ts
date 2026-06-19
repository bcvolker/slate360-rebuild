/**
 * Client helpers for the report-curation model (★ include-in-report + ordered set).
 *
 * Source of truth for ORDER is `thermal_analysis_sessions.metadata.report_set`
 * (an ordered array of capture ids). Each capture also carries
 * `metadata.in_report` (boolean) and `metadata.report_order` (its index) so a
 * single capture row is self-describing for the worker/report.
 */

import type { StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";

/** Best-effort camera label for grouping/filtering. */
export function cameraOf(c: StudioCapture): string {
  const meta = (c.metadata ?? {}) as Record<string, unknown>;
  const q = (c.qualityMetrics ?? {}) as Record<string, unknown>;
  const sp = (q.sensorProfile ?? meta.sensorProfile ?? {}) as Record<string, unknown>;
  const candidate =
    (typeof meta.camera === "string" && meta.camera) ||
    (typeof q.sensor_model === "string" && q.sensor_model) ||
    (typeof q.sensor_make === "string" && q.sensor_make) ||
    (typeof sp.camera === "string" && sp.camera) ||
    (typeof sp.model === "string" && sp.model) ||
    (typeof sp.make === "string" && sp.make);
  return candidate || "Unknown camera";
}

type AnomalyLike = { severity?: string; delta_c?: number; scene_delta_c?: number };

/** "High ΔT" = an action/critical anomaly, or a large local ΔT vs surroundings. */
export function isHighDelta(c: StudioCapture, thresholdC = 10): boolean {
  const anomalies = (c.anomalies ?? []) as AnomalyLike[];
  return anomalies.some((a) => {
    const sev = String(a?.severity ?? "").toLowerCase();
    if (sev === "action" || sev === "critical") return true;
    const d = Math.abs(Number(a?.delta_c ?? a?.scene_delta_c ?? 0));
    return Number.isFinite(d) && d >= thresholdC;
  });
}

export function isInReport(c: StudioCapture): boolean {
  return Boolean((c.metadata as Record<string, unknown> | null)?.in_report);
}

export function reportOrderOf(c: StudioCapture): number {
  const v = Number((c.metadata as Record<string, unknown> | null)?.report_order);
  return Number.isFinite(v) ? v : Number.POSITIVE_INFINITY;
}

/** Seed the ordered report set from captures (report_set order falls back to report_order). */
export function seedReportOrder(captures: StudioCapture[], reportSet?: string[] | null): string[] {
  if (Array.isArray(reportSet) && reportSet.length) {
    const ids = new Set(captures.map((c) => c.id));
    return reportSet.filter((id) => ids.has(id));
  }
  return captures
    .filter(isInReport)
    .sort((a, b) => reportOrderOf(a) - reportOrderOf(b))
    .map((c) => c.id);
}

export async function persistCaptureInReport(
  captureId: string,
  inReport: boolean,
  reportOrder: number,
): Promise<void> {
  await fetch(`/api/ops/thermal/captures/${captureId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ in_report: inReport, report_order: reportOrder }),
  }).catch(() => {});
}

export async function persistReportSet(sessionId: string, order: string[]): Promise<void> {
  await fetch(`/api/ops/thermal/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata: { report_set: order } }),
  }).catch(() => {});
}
