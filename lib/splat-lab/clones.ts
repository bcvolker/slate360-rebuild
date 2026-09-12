/** Desktop clone presets. Proven stays the quality baseline; Lab is experimental. */

export type SplatLabClone = "proven" | "lab";

export type Knobs = {
  is360: boolean;
  removePeople: boolean;
  sfmMode: "faster" | "hq";
  imageSize: "auto" | "4k" | "6k" | "8k";
  fps: number;
  maxDuration: number;
  precompute360Faces: boolean;
  resolutionLimit: number;
  shDegree: number;
  maxSplatsMillions: number;
  trainingSteps: number;
  preset: string;
  quality: "test" | "medium" | "high" | "auto";
  useLidar: boolean;
  useRtk: boolean;
};

export const CLONE_META: Record<SplatLabClone, { label: string; tag: string; href: string }> = {
  proven: { label: "Splat Lab", tag: "Proven", href: "/splat-lab" },
  lab: { label: "Splat Lab — Lab", tag: "Lab", href: "/splat-lab/lab" },
};

export const PROVEN_KNOBS: Knobs = {
  is360: true,
  removePeople: true,
  sfmMode: "hq",
  imageSize: "auto",
  fps: 4,
  maxDuration: 0,
  precompute360Faces: true,
  resolutionLimit: 1920,
  shDegree: 3,
  maxSplatsMillions: 20,
  trainingSteps: 0,
  preset: "classic",
  quality: "auto",
  useLidar: false,
  useRtk: false,
};

export const LAB_KNOBS: Knobs = {
  ...PROVEN_KNOBS,
  sfmMode: "faster",
  resolutionLimit: 1280,
  shDegree: 2,
  maxSplatsMillions: 5,
  quality: "medium",
  useLidar: true,
  useRtk: true,
};

export function defaultsFor(clone: SplatLabClone): Knobs {
  return clone === "lab" ? { ...LAB_KNOBS } : { ...PROVEN_KNOBS };
}
