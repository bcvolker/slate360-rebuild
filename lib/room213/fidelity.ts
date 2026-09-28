import { SPIRULA_3DGUT_PROFILE, type SparkRenderProfile } from "../digital-twin/spark-render-profile";
import type { SparkProfileCheck } from "@/components/digital-twin/use-spark-profile-check";

export type Fidelity = { state: "pending" | "verified" | "degraded"; reasons: string[] };

/**
 * The Room 213 viewer serves ONE hash-bound asset (the golden Spirula 3DGUT model), so its render profile is not
 * "whatever the manifest resolved to": it must be the corrected Spirula profile, reached through the model's own
 * provenance, and the live renderer must actually be using it. Checked against SPIRULA_3DGUT_PROFILE's constants —
 * never against the resolved profile (a fallback to Spark defaults would otherwise validate against itself).
 */
export function goldenFidelity(resolved: SparkRenderProfile, check: SparkProfileCheck | null): Fidelity {
  const want = SPIRULA_3DGUT_PROFILE;
  const reasons: string[] = [];
  if (resolved.id !== want.id) reasons.push(`lineage: provenance resolved ${resolved.id}, expected ${want.id}`);
  if (check) {
    const e = check.effective;
    if (e.accumExtSplats !== want.accumExtSplats) reasons.push(`accumExtSplats=${e.accumExtSplats}`);
    if (want.accumExtSplats && e.uniformEnableExtSplats !== true) reasons.push(`enableExtSplats uniform=${e.uniformEnableExtSplats}`);
    if (e.uniformBlurAmount !== want.blurAmount) reasons.push(`blurAmount=${e.uniformBlurAmount}`);
    if (e.uniformPreBlurAmount !== want.preBlurAmount) reasons.push(`preBlurAmount=${e.uniformPreBlurAmount}`);
  }
  if (reasons.length) return { state: "degraded", reasons };
  return { state: check ? "verified" : "pending", reasons };
}
