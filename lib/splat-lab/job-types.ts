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
};

export type RunOptions = {
  input: string;
  is360: boolean;
  clone: SplatLabClone;
  fps: number;
  removePeople: boolean;
  sfmMode: string;
  imageSize: string;
  maxDuration: number;
  precompute360Faces: boolean;
  resolutionLimit: number;
  shDegree: number;
  maxSplatsMillions: number;
  trainingSteps: number;
  preset: string;
  quality: string;
  useLidar: boolean;
  useRtk: boolean;
};
