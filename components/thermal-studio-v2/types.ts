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

export type ThermalV2Tool = "move" | "point" | "area" | "line" | "polygon";

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
  kind?: "point" | "area" | "line" | "polygon";
  target?: "crosshair" | "crosshair-circle" | "dot" | "square";
  areaShape?: "box" | "circle";
  w?: number;
  h?: number;
  x2?: number;
  y2?: number;
  label?: string;
  /** Auto-seated extreme marker ("mark hottest/coldest") — re-seated when the tuned grid changes. */
  auto?: "max" | "min";
  /** Polygon vertices in grid pixels (kind === "polygon"). */
  points?: { x: number; y: number }[];
};

/**
 * Same shape as the old ThermalProbeViewer's `ProbeTuning` / the capture PATCH
 * route's `TuningPayload` (route extended additively 2026-07-07 for the three
 * FLIR-parity fields — V2.1 addendum).
 */
export type ThermalV2Tuning = {
  emissivity: number;
  reflected_c: number;
  distance_m?: number;
  humidity_pct?: number;
  atmospheric_c?: number;
  ext_optics_temp_c?: number;
  ext_optics_trans?: number;
  reference_temp_c?: number;
};

/**
 * S5.6 alarm suite (supersedes the old single-band ThermalV2Isotherm):
 * session-local, NOT persisted (doc: "display-only, do NOT persist in v1").
 * "interval" mode is the old manual isotherm band; the other four modes
 * derive their effective band from tuning/thresholds (see lib/thermal/alarm-band.ts).
 */
export type ThermalV2AlarmMode = "off" | "above" | "below" | "interval" | "dewpoint" | "insulation";

export type ThermalV2Alarm = {
  mode: ThermalV2AlarmMode;
  /** above/below: single limit stored in `hi` (below) or `lo` (above). interval: manual band. */
  lo?: number;
  hi?: number;
  /** dewpoint: added to the dew point before highlighting (default 2°C). */
  margin?: number;
  /** dewpoint: air temp override (else falls back to Tuning's atmospheric_c). insulation: indoor air temp. */
  indoor_c?: number;
  /** insulation: outdoor air temp. */
  outdoor_c?: number;
  /** insulation: 0-1 thermographic-index-style threshold (1 = as warm as indoor, 0 = as cold as outdoor). */
  factor?: number;
};

/** S5.6 severity bands (ΔT-vs-reference thresholds, °C) — null until a preset is chosen (labels stay neutral). */
export type ThermalV2SeverityBands = { advisory: number; warning: number; critical: number } | null;

/**
 * S5.6 non-destructive rotate/flip (F1.2): a pure DISPLAY transform, persisted
 * per-image (`metadata.display_transform`) — the underlying temperature grid
 * never changes. Rotation is clockwise degrees.
 */
export type ThermalV2DisplayTransform = { rotation: 0 | 90 | 180 | 270; flipH: boolean; flipV: boolean };
