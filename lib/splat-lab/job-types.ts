import type { SplatLabClone } from "@/lib/splat-lab/clones";

export type SplatLabStageRecord = {
  name: string;
  status: "running" | "done" | "failed" | "blocked" | "skipped";
  progress: number;
  elapsed_s?: number;
  detail?: string;
  error?: string;
  artifacts?: string[];
};

export type SplatLabTelemetry = {
  iteration?: number;
  steps?: number;
  splats?: number;
  itPerSec?: number;
  etaSec?: number;
  gpu?: string;
};

export type SplatLabQuality = {
  sampled: number;
  meanLuma: number;
  deepShadowFraction: number;
  clippedHighlightFraction: number;
  laplacianVariance: number;
  lowQuality: boolean;
  message: string | null;
};

export type SplatLabJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "blocked";
  input: string;
  is360: boolean;
  clone: SplatLabClone;
  createdAt: number;
  stages: SplatLabStageRecord[];
  manifest: Record<string, unknown> | null;
  modelPath: string | null;
  error: string | null;
  telemetry: SplatLabTelemetry | null;
  hasSfmPreview: boolean;
  quality?: SplatLabQuality | null;
};

export type SphericalMode = "native" | "rig";
export type ViewImageSize = "768" | "1024" | "1280" | "1920" | "max";
export type TrainStrategy = "default" | "mcmc";

export type RunOptions = {
  input: string;
  is360: boolean;
  clone: SplatLabClone;
  workspaceName?: string;
  fps: number;
  removePeople: boolean;
  sphericalMode: SphericalMode;
  imageSize: string;
  maxDuration: number;
  maxFeatures: number;
  viewImageSize: ViewImageSize;
  shDegree: number;
  maxSplatsMillions: number;
  trainingSteps: number;
  imagesPerStep: number;
  preset: string;
  quality: string;
  strategy: TrainStrategy;
  useBilateralGrid: boolean;
  useLidar: boolean;
  useRtk: boolean;
  fromStage?: string;
};
