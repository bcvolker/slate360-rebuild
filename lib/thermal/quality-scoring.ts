import type { ThermalQualityMetrics } from "@/lib/thermal/types";

export type QualityBadgeTone = "good" | "warn" | "bad";

export function scoreToBadgeTone(score: number | undefined): QualityBadgeTone {
  if (score === undefined || Number.isNaN(score)) return "warn";
  if (score >= 0.75) return "good";
  if (score >= 0.5) return "warn";
  return "bad";
}

export function formatQualityScore(metrics: ThermalQualityMetrics | undefined): string {
  const score = metrics?.confidence_score;
  if (score === undefined) return "—";
  if (score <= 1) return `${Math.round(score * 100)}%`;
  return `${Math.round(score)}%`;
}

export function summarizeQualityFlags(metrics: ThermalQualityMetrics | undefined): string[] {
  if (!metrics) return [];
  const flags: string[] = [];
  if (metrics.is_radiometric === false) flags.push("Non-radiometric");
  if (metrics.gps_present === false) flags.push("No GPS");
  if ((metrics.saturation_pct ?? 0) > 0.08) flags.push("Saturation risk");
  if ((metrics.blur_score ?? 100) < 50) flags.push("Blur detected");
  if (metrics.error) flags.push(metrics.error);
  return flags;
}
