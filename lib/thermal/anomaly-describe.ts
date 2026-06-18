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
 * Build a professional, standards-aware finding sentence for one anomaly.
 */
export function describeAnomaly(anomaly: ThermalAnomaly, opts: DescribeOptions = {}): string {
  const unit = opts.unit ?? "F";
  const std = standardsClause(opts.standards);
  const peak = fmtTemp(anomaly.temp_c, unit);
  const dt = fmtDelta(anomaly.delta_c, unit);
  const sev = (anomaly.severity as ThermalSeverity) ?? "info";
  const pattern = anomaly.pattern;
  const vs =
    typeof anomaly.background_c === "number"
      ? `${dt} above its surroundings (~${fmtTemp(anomaly.background_c, unit)})`
      : `ΔT ${dt} vs surroundings`;
  const vsCold =
    typeof anomaly.background_c === "number"
      ? `${dt} below its surroundings (~${fmtTemp(anomaly.background_c, unit)})`
      : `ΔT ${dt} below surroundings`;
  const act = sev === "action" ? " Prioritize on-site investigation." : sev === "watch" ? " Monitor and follow up." : "";

  if (anomaly.type === "hot_spot") {
    if (pattern === "diffuse") {
      return `Diffuse warm area — peak ${peak}, ${vs}. The soft, spread signature points to air leakage, thermal bridging, or moisture warming rather than a point fault.${act}${std}`;
    }
    return `Focal hot spot — peak ${peak}, ${vs}. The sharp, localized signature is consistent with elevated electrical resistance, a loose/overloaded connection, or mechanical friction.${act}${std}`;
  }

  if (anomaly.type === "cold_bridge") {
    if (pattern === "focal") {
      return `Localized cool spot — ${vsCold}. Consistent with an insulation gap, a fastener/structural heat sink, or a small breach.${act}${std}`;
    }
    return `Diffuse cool region — ${vsCold}. The soft pattern is characteristic of moisture intrusion or saturated insulation; confirm with a moisture meter.${act}${std}`;
  }

  if (anomaly.type === "linear_streak") {
    return `Linear thermal trace — the geometry suggests sub-surface piping, embedded wiring, or moisture tracking along a seam or framing member. Verify in the field.${std}`;
  }

  return `Thermal anomaly — ${vs}, severity ${sev}.${std}`;
}
