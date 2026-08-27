/** Quality presets. Values are research hypotheses until the 3090 is benchmarked. */

export const ENGINE_COMMIT = "1efc06fc7ad5e9eb552da58daecac41a2d9a8cf3";
export const ENGINE_ID = "odgs-slam";
export const SPLAT_TRANSFORM_PKG = "@playcanvas/splat-transform@2.7.1";
export const JOB_SCHEMA = "s360-research-job-1";

export const QUALITY_PRESETS = {
  preview: {
    id: "preview",
    label: "Preview",
    goal: "Prove reconstruction",
    frameRate: 2,
    imageDownsample: 8,
    maxSeconds: 120,
  },
  standard: {
    id: "standard",
    label: "Standard",
    goal: "Good visual model",
    frameRate: 2,
    imageDownsample: 4,
    maxSeconds: null,
  },
  "research-high": {
    id: "research-high",
    label: "Research High",
    goal: "Maximum test quality",
    frameRate: 4,
    imageDownsample: 2,
    maxSeconds: null,
    vramWarning: "May exceed 24 GB VRAM on 8K X4 source. Prefer Standard locally.",
  },
};

export function applyPreset(quality) {
  const preset = QUALITY_PRESETS[quality] ?? QUALITY_PRESETS.preview;
  return {
    quality: preset.id,
    frameRate: preset.frameRate,
    imageDownsample: preset.imageDownsample,
    maxSeconds: preset.maxSeconds,
  };
}

export function workingResolution(sourceWidth, sourceHeight, downsample) {
  const w = Math.max(2, Math.round(sourceWidth / downsample));
  const h = Math.max(2, Math.round(sourceHeight / downsample));
  return { width: w, height: h };
}
