/**
 * Settings fingerprints so "Run All" can skip a stage whose inputs and
 * options haven't changed since it last succeeded, instead of always
 * re-running the whole pipeline from frame extraction.
 */
import { createHash } from "node:crypto";
import type { RunOptions } from "@/lib/splat-lab/job-types";

// Only the knobs that actually change each stage's OUTPUT are included, so
// tweaking a downstream-only option (e.g. SH degree) doesn't invalidate SfM.
const STAGE_KEYS: Record<string, (keyof RunOptions)[]> = {
  frames: ["input", "is360", "fps", "maxDuration"],
  mask: ["input", "is360", "fps", "maxDuration", "removePeople"],
  sfm: ["input", "is360", "fps", "maxDuration", "removePeople", "sphericalMode", "maxFeatures", "imageSize"],
  views: ["input", "is360", "fps", "maxDuration", "removePeople", "sphericalMode", "maxFeatures",
          "imageSize", "viewImageSize"],
  train: ["input", "is360", "fps", "maxDuration", "removePeople", "sphericalMode", "maxFeatures",
          "imageSize", "viewImageSize", "shDegree", "maxSplatsMillions", "trainingSteps",
          "imagesPerStep", "quality", "strategy", "useBilateralGrid"],
  export: ["input", "is360", "fps", "maxDuration", "removePeople", "sphericalMode", "maxFeatures",
           "imageSize", "viewImageSize", "shDegree", "maxSplatsMillions", "trainingSteps",
           "imagesPerStep", "quality", "strategy", "useBilateralGrid"],
};

export function stageFingerprint(stage: string, opts: RunOptions): string {
  const keys = STAGE_KEYS[stage] ?? [];
  const subset: Record<string, unknown> = {};
  for (const k of keys) subset[k] = opts[k];
  const json = JSON.stringify(subset, Object.keys(subset).sort());
  return createHash("sha1").update(json).digest("hex").slice(0, 16);
}

export function allFingerprints(opts: RunOptions): Record<string, string> {
  return Object.fromEntries(Object.keys(STAGE_KEYS).map((stage) => [stage, stageFingerprint(stage, opts)]));
}
