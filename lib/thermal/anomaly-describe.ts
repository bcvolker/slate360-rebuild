/**
 * Human-readable, standards-aware descriptions for thermal anomalies.
 *
 * IMPORTANT: descriptions are driven by the report template's discipline/standards
 * (passed in via `standards`), NOT by any hardcoded certification or discipline.
 * This keeps the engine correct for every operator and every inspection type —
 * a roof scan cites ASTM C1153, an electrical scan cites NFPA 70B, etc., based on
 * whatever the active template declares. No personal credentials live here.
 */

export type ThermalAnomalyType = "hot_spot" | "cold_bridge" | "linear_streak";
export type ThermalSeverity = "action" | "watch" | "info";

export type ThermalBBox = { x: number; y: number; w: number; h: number };

export type ThermalAnomaly = {
  id: string;
  type: ThermalAnomalyType | string;
  severity: ThermalSeverity | string;
  confidence?: number;
  temp_c?: number;
  /** ΔT vs the SURROUNDING surface (local contrast) — the meaningful number. */
  delta_c?: number;
  /** ΔT vs the whole-scene median, for context. */
  scene_delta_c?: number;
  /** Mean temperature of the surrounding surface. */
  background_c?: number;
  /** Region shape: focal (sharp/localized), diffuse (soft/spread), or linear. */
  pattern?: "focal" | "diffuse" | "linear" | string;
  bbox?: ThermalBBox;
  area_px?: number;
  rule_id?: string;
};

export type DescribeUnit = "C" | "F";

export type DescribeOptions = {
  /** Standards from the active report template, e.g. ["ASTM C1153", "NFPA 70B"]. */
  standards?: string[];
  unit?: DescribeUnit;
};

/**
 * Functional severity colors for the diagnostic overlay. These are deliberately
 * NOT the banned brand amber — red/orange/sky read as severity without
 * reintroducing the amber look.
 */
export const SEVERITY_META: Record<
  ThermalSeverity,
  { label: string; color: string; chipClass: string }
> = {
  action: {
    label: "Action",
    color: "#ef4444",
    chipClass: "border-[#ef4444]/40 bg-[#ef4444]/15 text-[#fca5a5]",
  },
  watch: {
    label: "Watch",
    color: "#fb923c",
    chipClass: "border-[#fb923c]/40 bg-[#fb923c]/15 text-[#fdba74]",
  },
  info: {
    label: "Info",
    color: "#38bdf8",
    chipClass: "border-[#38bdf8]/40 bg-[#38bdf8]/15 text-[#7dd3fc]",
  },
};

export function severityMeta(severity: string) {
  return SEVERITY_META[(severity as ThermalSeverity)] ?? SEVERITY_META.info;
}

function fmtTemp(c: number | undefined, unit: DescribeUnit): string {
  if (typeof c !== "number" || !Number.isFinite(c)) return "—";
  const v = unit === "F" ? (c * 9) / 5 + 32 : c;
  return `${v.toFixed(1)}°${unit}`;
}

function fmtDelta(c: number | undefined, unit: DescribeUnit): string {
  if (typeof c !== "number" || !Number.isFinite(c)) return "—";
  const v = Math.abs(c) * (unit === "F" ? 9 / 5 : 1);
  return `${v.toFixed(1)}°${unit}`;
}

function standardsClause(standards?: string[]): string {
  if (!standards || standards.length === 0) return "";
  return ` Evaluate per ${standards.join(", ")}.`;
}

/**
 * Build a NEUTRAL, observation-first finding sentence for one anomaly.
 *
 * IMPORTANT (locked decision): the description reports what was MEASURED and the
 * thermal PATTERN only — it never asserts a cause. Cause is the operator's call (or
 * a scene-aware draft they confirm). This keeps the engine correct for any
 * inspection type and any user (no trade lock-in, no certification implied) and
 * keeps reports defensible for insurance/legal use. Phrasing uses "observed" /
 * "at the time of capture" and avoids "caused by / failure / defect".
 */
export function describeAnomaly(anomaly: ThermalAnomaly, opts: DescribeOptions = {}): string {
  const unit = opts.unit ?? "F";
  const std = standardsClause(opts.standards);
  const peak = fmtTemp(anomaly.temp_c, unit);
  const dt = fmtDelta(anomaly.delta_c, unit);
  const sev = (anomaly.severity as ThermalSeverity) ?? "info";
  const pattern = anomaly.pattern;
  const vsWarm =
    typeof anomaly.background_c === "number"
      ? `${dt} above adjacent surroundings (~${fmtTemp(anomaly.background_c, unit)})`
      : `ΔT ${dt} above surroundings`;
  const vsCold =
    typeof anomaly.background_c === "number"
      ? `${dt} below adjacent surroundings (~${fmtTemp(anomaly.background_c, unit)})`
      : `ΔT ${dt} below surroundings`;
  // Neutral follow-up scaled by severity — recommends review, never asserts cause.
  const act =
    sev === "action"
      ? " Recommend on-site verification."
      : sev === "watch"
        ? " Recommend review and follow-up."
        : "";

  if (anomaly.type === "hot_spot") {
    const shape = pattern === "diffuse" ? "diffuse (soft, spread)" : "focal (sharp, localized)";
    return `Elevated-temperature area observed — peak ${peak}, ${vsWarm} at the time of capture. Thermal pattern: ${shape} warm region. Confirm the source and context on site.${act}${std}`;
  }

  if (anomaly.type === "cold_bridge") {
    const shape = pattern === "focal" ? "focal (sharp, localized)" : "diffuse (soft, spread)";
    return `Reduced-temperature area observed — ${vsCold} at the time of capture. Thermal pattern: ${shape} cool region. Confirm the source and context on site.${act}${std}`;
  }

  if (anomaly.type === "linear_streak") {
    return `Linear thermal trace observed — an elongated temperature pattern following a line or seam at the time of capture. Confirm the source and context on site.${act}${std}`;
  }

  const polarity =
    typeof anomaly.delta_c === "number" && anomaly.delta_c < 0 ? vsCold : vsWarm;
  return `Thermal anomaly observed — ${polarity} at the time of capture. Confirm the source and context on site.${act}${std}`;
}
