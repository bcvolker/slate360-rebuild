/**
 * Auto step/splat-cap formulas, mirrored exactly from
 * workers/local/splat-lab/config.py so the UI can show the resolved numbers
 * before Run without waiting on the Python worker. Constants sourced from
 * the reference studio's own kitchen job (13,040 views, imagesPerStep 2 ->
 * 326,000 steps, splat cap 6,520,000 — verified in its own
 * splats/0/airvisstudio-splat.json).
 */

export const STEPS_PER_VIEW = 50;
export const STEPS_FLOOR = 25_000;
export const SPLATS_PER_VIEW = 500;
// Mirrors the reference's own GPU-safe limit for a 24 GB card (their
// splatCapResolution.GpuSafeLimit was ~17.4M on this same RTX 3090).
export const GPU_SAFE_SPLATS = 17_400_000;

export const QUALITY_STEPS: Record<"test" | "medium" | "high", number> = {
  test: 5_000,
  medium: 30_000,
  high: 100_000,
};

export const VIEWS_PER_PANO = 16;

// nerfstudio 1.1.5 caches every training image in RAM/VRAM (no disk
// streaming — verified via `ns-train --help`). Root-caused 2026-09-12 on a
// real 272-panorama/1280px run: raw pixel bytes alone undercounts real usage
// by roughly 3x once PyTorch/nerfstudio's own overhead (mask cache, prefetch
// buffers, tensor copies) is included — a 21.4 GB raw estimate actually used
// ~61 GB RSS and pushed WSL2 into heavy swapping, cratering training from
// ~6 it/s to under 2 it/s. RAM_OVERHEAD_FACTOR folds that in. WSL2's memory
// ceiling was also raised from its ~62 GB default to 100 GB via .wslconfig —
// RAM_BUDGET_BYTES leaves headroom under that for the OS and other stages.
export const RAM_OVERHEAD_FACTOR = 3.0;
export const RAM_BUDGET_BYTES = 75 * 1024 ** 3; // target ceiling under WSL2's 100 GB (see .wslconfig)

export const VIEW_IMAGE_SIZES_PX: Record<string, number> = {
  "768": 768,
  "1024": 1024,
  "1280": 1280,
  "1920": 1920,
};

export function viewPx(viewImageSize: string, panoWidthPx = 7680): number {
  if (viewImageSize === "max") return Math.max(256, Math.floor(panoWidthPx / 4));
  return VIEW_IMAGE_SIZES_PX[viewImageSize] ?? 1280;
}

/** Realistic estimate of actual RSS during training, not just raw pixel
 * bytes — see RAM_OVERHEAD_FACTOR above for why the multiplier is needed. */
export function ramEstimateBytes(viewCount: number, widthPx: number): number {
  return Math.round(viewCount * widthPx * widthPx * 3 * RAM_OVERHEAD_FACTOR);
}

/** views * 50 / imagesPerStep, floor 25,000 (the reference's own formula). */
export function resolveAutoSteps(viewCount: number, imagesPerStep: number): number {
  if (viewCount <= 0 || imagesPerStep <= 0) return STEPS_FLOOR;
  return Math.max(STEPS_FLOOR, Math.round((viewCount * STEPS_PER_VIEW) / imagesPerStep));
}

/** views * 500, capped by the GPU-safe ceiling for this card. */
export function resolveAutoSplatCap(viewCount: number): number {
  return Math.min(GPU_SAFE_SPLATS, Math.max(1, viewCount) * SPLATS_PER_VIEW);
}

export function resolveSteps(
  quality: "test" | "medium" | "high" | "auto",
  trainingSteps: number,
  viewCount: number,
  imagesPerStep: number,
): number {
  if (trainingSteps > 0) return trainingSteps;
  if (quality === "auto") return resolveAutoSteps(viewCount, imagesPerStep);
  return QUALITY_STEPS[quality] ?? 30_000;
}

export function resolveSplatCap(maxSplatsMillions: number, viewCount: number): number {
  if (maxSplatsMillions > 0) return Math.round(maxSplatsMillions * 1_000_000);
  return resolveAutoSplatCap(viewCount);
}

export function panoramaCountEstimate(registeredCameras: number): number {
  return Math.max(0, registeredCameras);
}

export function ramFitsBudget(viewCount: number, widthPx: number): boolean {
  return ramEstimateBytes(viewCount, widthPx) <= RAM_BUDGET_BYTES;
}
