export type Tab = "process" | "view" | "results" | "log" | "environment";
export type Quality = "preview" | "standard" | "research-high";
export type CaptureType = "unknown" | "high" | "low" | "normal";

export type Check = { status: "READY" | "MISSING" | "ERROR"; detail: string };

export type EnvStatus = {
  host: string;
  gpu: Check;
  driver: Check;
  wsl2: Check;
  ubuntu: Check;
  cudaWsl: Check;
  ffmpeg: Check;
  odgs: Check;
  spz: Check;
  mockMode: boolean;
  suggestedOutputRoot: string;
};

export type ClassifiedError = {
  id: string;
  title: string;
  advice: string;
  raw: string;
};

export type JobEvent = {
  ts?: number;
  stage: string;
  label?: string;
  progress?: number;
  frame?: number;
  total?: number;
  mock?: boolean;
  outputDir?: string;
  ply?: string | null;
  spz?: string | null;
  error?: ClassifiedError;
  validation?: { verdict: string; flags: { id: string; level: string; message: string }[] };
};
