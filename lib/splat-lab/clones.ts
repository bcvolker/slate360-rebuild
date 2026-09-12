/** Desktop clone presets. Proven stays the quality baseline; Lab is experimental. */
import type { RunOptions, SphericalMode, TrainStrategy, ViewImageSize } from "@/lib/splat-lab/job-types";

export type SplatLabClone = "proven" | "lab";

export type Knobs = {
  is360: boolean;
  removePeople: boolean;
  sphericalMode: SphericalMode;
  imageSize: "auto" | "4k" | "6k" | "8k";
  fps: number;
  maxDuration: number;
  maxFeatures: number;
  viewImageSize: ViewImageSize;
  shDegree: number;
  maxSplatsMillions: number;
  trainingSteps: number;
  imagesPerStep: number;
  preset: string;
  quality: "test" | "medium" | "high" | "auto";
  strategy: TrainStrategy;
  useBilateralGrid: boolean;
  useLidar: boolean;
  useRtk: boolean;
};

export const CLONE_META: Record<SplatLabClone, { label: string; tag: string; href: string }> = {
  proven: { label: "Slate360 Splat", tag: "Proven", href: "/splat-lab" },
  lab: { label: "Slate360 Splat Lab", tag: "Lab", href: "/splat-lab/lab" },
};

// Proven mirrors the reference studio's own architecture: native panorama SfM,
// 16 derived training views, quality-formula steps/cap. It must never default
// to the degraded settings the reference used on a dim capture (1024px,
// "safe"/low-quality preset) — those are what made that particular job soft.
export const PROVEN_KNOBS: Knobs = {
  is360: true,
  removePeople: true,
  sphericalMode: "native",
  imageSize: "auto",
  fps: 4,
  maxDuration: 0,
  maxFeatures: 16384,
  viewImageSize: "1280",
  shDegree: 3,
  maxSplatsMillions: 0, // 0 = auto (views * 500, GPU-capped)
  trainingSteps: 0,      // 0 = follow quality preset
  imagesPerStep: 2,
  preset: "classic",
  quality: "auto",
  strategy: "default",
  useBilateralGrid: false,
  useLidar: false,
  useRtk: false,
};

export const LAB_KNOBS: Knobs = {
  ...PROVEN_KNOBS,
  sphericalMode: "native",
  viewImageSize: "1024",
  shDegree: 3,
  quality: "medium",
  strategy: "mcmc",
  useLidar: true,
  useRtk: true,
};

export function defaultsFor(clone: SplatLabClone): Knobs {
  return clone === "lab" ? { ...LAB_KNOBS } : { ...PROVEN_KNOBS };
}

export function knobsToRunOptions(
  knobs: Knobs,
  input: string,
  clone: SplatLabClone,
  workspaceName?: string,
): Omit<RunOptions, "fromStage"> {
  return {
    input,
    clone,
    workspaceName,
    is360: knobs.is360,
    removePeople: knobs.removePeople,
    sphericalMode: knobs.sphericalMode,
    imageSize: knobs.imageSize,
    fps: knobs.fps,
    maxDuration: knobs.maxDuration,
    maxFeatures: knobs.maxFeatures,
    viewImageSize: knobs.viewImageSize,
    shDegree: knobs.shDegree,
    maxSplatsMillions: knobs.maxSplatsMillions,
    trainingSteps: knobs.trainingSteps,
    imagesPerStep: knobs.imagesPerStep,
    preset: knobs.preset,
    quality: knobs.quality,
    strategy: knobs.strategy,
    useBilateralGrid: knobs.useBilateralGrid,
    useLidar: knobs.useLidar,
    useRtk: knobs.useRtk,
  };
}
