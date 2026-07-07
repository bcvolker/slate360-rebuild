export type ThermalV2Tab = "library" | "analyze" | "ai-review" | "report" | "deliver";

export type ThermalV2ScopeKind = "image" | "selected" | "all";

export type ThermalV2Scope =
  | { kind: "image" }
  | { kind: "selected"; count: number }
  | { kind: "all"; count: number };

/**
 * Same shape as the old ThermalStudioWorkView's `StudioCapture` (kept structurally
 * compatible on purpose so lib/thermal/curation-client.ts helpers — cameraOf,
 * isHighDelta, isInReport, persistCaptureInReport, persistReportSet — work on
 * V2 captures without modification; that lib is backend-adjacent and stays as-is).
 */
export type ThermalV2Capture = {
  id: string;
  filename: string;
  previewUrl?: string | null;
  qualityMetrics?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  anomalies?: unknown[] | null;
};

export type ThermalV2LibraryFilter = "all" | "flagged" | "in_report" | "high_delta" | string;
