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

export type ThermalV2Tool = "move" | "point" | "area" | "line";

/**
 * Same shape as the old ThermalProbeViewer's `ProbeSpot` / the capture PATCH
 * route's `SpotPayload` (kept structurally compatible so lib/thermal/spot-stats.ts
 * and the unchanged `/api/ops/thermal/captures/:id` `{ spots }` contract work
 * without modification).
 */
export type ThermalV2Spot = {
  id: string;
  x: number;
  y: number;
  imported?: boolean;
  kind?: "point" | "area" | "line";
  target?: "crosshair" | "crosshair-circle" | "dot" | "square";
  areaShape?: "box" | "circle";
  w?: number;
  h?: number;
  x2?: number;
  y2?: number;
  label?: string;
};

/**
 * Same shape as the old ThermalProbeViewer's `ProbeTuning` / the capture PATCH
 * route's `TuningPayload` (kept structurally compatible — no new backend).
 */
export type ThermalV2Tuning = {
  emissivity: number;
  reflected_c: number;
  distance_m?: number;
  humidity_pct?: number;
  atmospheric_c?: number;
};

export type ThermalV2Isotherm = { lo: number; hi: number } | null;
