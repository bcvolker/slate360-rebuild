import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

type RawCapture = {
  id: string;
  filename?: string | null;
  previewUrl?: string | null;
  quality_metrics?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  anomalies?: unknown[] | null;
};

/**
 * The one snake_case (DB) → camelCase (ThermalV2Capture) mapping — shared by
 * the session page's initial SSR data and the shell's client-side refetch
 * (audit remediation Batch 1) so the two never drift into different shapes.
 */
export function toThermalV2Captures(raw: RawCapture[]): ThermalV2Capture[] {
  return raw.map((c) => ({
    id: c.id,
    filename: c.filename ?? "Capture",
    previewUrl: c.previewUrl ?? null,
    qualityMetrics: (c.quality_metrics as Record<string, unknown> | null) ?? null,
    metadata: (c.metadata as Record<string, unknown> | null) ?? null,
    anomalies: (c.anomalies as unknown[] | null) ?? null,
  }));
}
