/** Device-aware asset pick. Never show variant names to clients. */

export const STATION_VARIANTS = ["thumb", "preview", "standard", "full"] as const;
export const WALK_VARIANTS = ["low", "standard", "high"] as const;
export const PLAN_VARIANTS = ["thumbnail", "screen", "pdf"] as const;
export const GAUSSIAN_VARIANTS = ["poster", "mobile", "standard", "high"] as const;

export type VariantHint = {
  viewportCss: number;
  devicePixelRatio: number;
  saveData?: boolean;
  effectiveType?: string;
  quality?: "auto" | "low" | "high";
};

export function pickStationVariant(hint: VariantHint): (typeof STATION_VARIANTS)[number] {
  if (hint.quality === "low" || hint.saveData) return "preview";
  if (hint.quality === "high" && hint.viewportCss >= 1024) return "full";
  if (hint.viewportCss * hint.devicePixelRatio < 900) return "preview";
  return "standard";
}

export function pickWalkVariant(hint: VariantHint): (typeof WALK_VARIANTS)[number] {
  if (hint.quality === "low" || hint.saveData || hint.effectiveType === "3g") return "low";
  if (hint.quality === "high" && hint.viewportCss >= 1024) return "high";
  return "standard";
}

export function pickPlanVariant(hasRaster: boolean): (typeof PLAN_VARIANTS)[number] {
  return hasRaster ? "screen" : "pdf";
}

export function pickGaussianVariant(hint: VariantHint): (typeof GAUSSIAN_VARIANTS)[number] {
  if (hint.viewportCss < 768 || hint.saveData) return "mobile";
  if (hint.quality === "high") return "high";
  return "standard";
}
