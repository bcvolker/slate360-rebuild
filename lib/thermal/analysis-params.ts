/**
 * Manual anomaly-tuning parameters for a thermal session.
 *
 * Stored canonically in Celsius on the session metadata (`metadata.analysis_params`).
 * The worker's analyzer reads these to override its automatic defaults. When absent,
 * the analyzer falls back to the same defaults below, so auto-tuning is the default
 * and manual tuning only refines it.
 */

export type ThermalAnalysisParams = {
  /** Min ΔT above reference to flag a hot spot (°C). */
  hot_delta_c: number;
  /** Min ΔT below reference to flag a cold bridge (°C). */
  cold_delta_c: number;
  /** Min connected-pixel area to count as an anomaly. */
  min_area_px: number;
  /** ΔT at/above which severity = "action" (°C). */
  severity_action_c: number;
  /** ΔT at/above which severity = "watch" (°C). */
  severity_watch_c: number;
  detect_hot: boolean;
  detect_cold: boolean;
  detect_streaks: boolean;
  /** Optional emissivity override (HIKMICRO files carry their own otherwise). */
  emissivity_override: number | null;
};

export const DEFAULT_ANALYSIS_PARAMS: ThermalAnalysisParams = {
  hot_delta_c: 5,
  cold_delta_c: 4,
  min_area_px: 24,
  severity_action_c: 12,
  severity_watch_c: 7,
  detect_hot: true,
  detect_cold: true,
  detect_streaks: true,
  emissivity_override: null,
};

function clampNum(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

/** Merge a partial/unknown params object onto the defaults, clamping to safe ranges. */
export function normalizeAnalysisParams(raw: unknown): ThermalAnalysisParams {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_ANALYSIS_PARAMS;
  const emis = r.emissivity_override;
  return {
    hot_delta_c: clampNum(r.hot_delta_c, 0.5, 50, d.hot_delta_c),
    cold_delta_c: clampNum(r.cold_delta_c, 0.5, 50, d.cold_delta_c),
    min_area_px: Math.round(clampNum(r.min_area_px, 1, 5000, d.min_area_px)),
    severity_action_c: clampNum(r.severity_action_c, 1, 100, d.severity_action_c),
    severity_watch_c: clampNum(r.severity_watch_c, 0.5, 100, d.severity_watch_c),
    detect_hot: r.detect_hot === undefined ? d.detect_hot : Boolean(r.detect_hot),
    detect_cold: r.detect_cold === undefined ? d.detect_cold : Boolean(r.detect_cold),
    detect_streaks: r.detect_streaks === undefined ? d.detect_streaks : Boolean(r.detect_streaks),
    emissivity_override:
      emis === null || emis === undefined || emis === "" ? null : clampNum(emis, 0.05, 1.0, 0.95),
  };
}

export const cToFDelta = (c: number): number => (c * 9) / 5;
export const fToCDelta = (f: number): number => (f * 5) / 9;
