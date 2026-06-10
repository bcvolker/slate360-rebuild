import "server-only";

import {
  computeTwinProcessingCredits,
  type TwinCreditAsset,
} from "@/lib/twin/processing-credits";

import type { TwinProcessingQuality } from "@/lib/twin/processing-estimate-types";

export type { TwinProcessingQuality };

export type TwinProcessingEstimate = {
  creditsRequired: number;
  estimatedMinutes: number;
  frameCount: number;
  assetCount: number;
};

/** Calibrated: ~17 minutes processing for 124 frames at Standard quality. */
const STANDARD_MINUTES_PER_FRAME = 17 / 124;

const QUALITY_CREDIT_MULTIPLIER: Record<TwinProcessingQuality, number> = {
  standard: 1,
  high: 1.35,
};

const QUALITY_TIME_MULTIPLIER: Record<TwinProcessingQuality, number> = {
  standard: 1,
  high: 1.82,
};

export function estimateTwinProcessingMinutes(
  frameCount: number,
  quality: TwinProcessingQuality = "standard",
): number {
  const frames = Math.max(1, frameCount);
  const minutes = frames * STANDARD_MINUTES_PER_FRAME * QUALITY_TIME_MULTIPLIER[quality];
  return Math.max(1, Math.round(minutes));
}

export function computeTwinSourcesProcessingEstimate(
  assets: TwinCreditAsset[],
  outputFormat: "spz" | "ply" | "glb" = "spz",
  quality: TwinProcessingQuality = "standard",
  frameCount?: number,
): TwinProcessingEstimate {
  const assetCount = assets.length;
  const baseCredits = computeTwinProcessingCredits(assets, outputFormat);
  const creditsRequired = Math.max(
    1,
    Math.round(baseCredits * QUALITY_CREDIT_MULTIPLIER[quality]),
  );
  const resolvedFrames =
    frameCount ??
    Math.max(
      1,
      assets.filter((row) => row.asset_kind === "photo" || row.asset_kind === "drone_photo").length,
    );
  const estimatedMinutes = estimateTwinProcessingMinutes(resolvedFrames, quality);

  return {
    creditsRequired,
    estimatedMinutes,
    frameCount: resolvedFrames,
    assetCount,
  };
}
