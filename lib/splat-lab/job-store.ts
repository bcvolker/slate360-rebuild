/** Splat Lab — in-memory job store + subprocess manager.
 *
 * LOCAL DEV ONLY. Spawns a local WSL subprocess to run the Python pipeline.
 * Never used in production (the API routes gate on SLATE360_SPLAT_LAB=1).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type SplatLabStageRecord = {
  name: string;
  status: "running" | "done" | "failed" | "blocked" | "skipped";
  progress: number;
  elapsed_s?: number;
  detail?: string;
  error?: string;
  artifacts?: string[];
};

export type SplatLabJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "blocked";
  input: string;
  is360: boolean;
  createdAt: number;
  stages: SplatLabStageRecord[];
  manifest: Record<string, unknown> | null;
  modelPath: string | null;
  error: string | null;
};

const JOBS = new Map<string, SplatLabJob>();
const PROCS = new Map<string, ChildProcess>();

const REPO_ROOT = process.cwd();
export const SPLAT_LAB_ROOT = join(REPO_ROOT, "tmp", "splat-lab");
const WSL_PYTHON =
  process.env.SPLAT_LAB_PYTHON ||
  "/home/rian_/slate360-engines/nerfstudio/.venv/bin/python";
const WSL_REPO = process.env.SPLAT_LAB_WSL_REPO || "/mnt/c/s360";
const WSL_COLMAP_BIN =
  process.env.SPLAT_LAB_COLMAP_BIN ||
  "/home/rian_/slate360-engines/colmap-4.1.0/bin";

export function isSplatLabEnabled(): boolean {
  return process.env.SLATE360_SPLAT_LAB === "1" || process.env.NODE_ENV === "development";
}

function toWslPath(winPath: string): string {
  const p = winPath.replace(/\\/g, "/").trim();
  const m = /^([A-Za-z]):(.*)$/.exec(p);
  if (m) return `/mnt/${m[1].toLowerCase()}${m[2]}`;
  return p;
}

export function getJob(id: string): SplatLabJob | undefined {
  return JOBS.get(id);
}

export function listJobs(): SplatLabJob[] {
  return [...JOBS.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function readJobModel(id: string): Buffer | null {
  const job = JOBS.get(id);
  if (!job?.modelPath || !existsSync(job.modelPath)) return null;
  return readFileSync(job.modelPath);
}

export function jobModelSize(id: string): number | null {
  const job = JOBS.get(id);
  if (!job?.modelPath || !existsSync(job.modelPath)) return null;
  return statSync(job.modelPath).size;
}

export type RunOptions = {
  input: string;
  is360: boolean;
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
};

export function startJob(opts: RunOptions): string {
  const id = randomUUID().slice(0, 8);
  const jobDir = join(SPLAT_LAB_ROOT, id);
  mkdirSync(jobDir, { recursive: true });
  const job: SplatLabJob = {
    id, status: "queued", input: opts.input, is360: opts.is360,
    createdAt: Date.now(), stages: [], manifest: null,
    modelPath: null, error: null,
  };
  JOBS.set(id, job);
  spawnRunner(id, jobDir, opts);
  return id;
}

function spawnRunner(id: string, jobDir: string, opts: RunOptions): void {
  const job = JOBS.get(id)!;
  job.status = "running";

  const wslInput = toWslPath(opts.input);
  const wslOutput = toWslPath(join(SPLAT_LAB_ROOT));
  const wslJobDir = toWslPath(jobDir);
  const script = [
    `cd ${WSL_REPO}`,
    `export PATH=${WSL_COLMAP_BIN}:$PATH`,
    `${WSL_PYTHON} workers/local/splat-lab/run.py`,
    `--input ${JSON.stringify(wslInput)}`,
    `--output ${JSON.stringify(wslOutput)}`,
    `--job-id ${id}`,
    opts.is360 ? "--is360" : "",
    opts.removePeople ? "--remove-people" : "",
    `--fps ${opts.fps}`,
    `--sfm-mode ${opts.sfmMode}`,
    `--image-size ${opts.imageSize}`,
    `--max-duration ${opts.maxDuration}`,
    opts.precompute360Faces ? "--precompute-360-faces" : "--no-precompute-360-faces",
    `--resolution-limit ${opts.resolutionLimit}`,
    `--sh-degree ${opts.shDegree}`,
    `--max-splats-millions ${opts.maxSplatsMillions}`,
    `--training-steps ${opts.trainingSteps}`,
    `--preset ${opts.preset}`,
    `--quality ${opts.quality}`,
  ].filter(Boolean).join(" ");

  const proc = spawn("wsl.exe", ["bash", "-lc", `PYTHONIOENCODING=utf-8 ${script}`], {
    cwd: REPO_ROOT,
  env: process.env,
  });
  PROCS.set(id, proc);

  let buffer = "";
  const commit = () => {
    job.stages = [...job.stages];
    JOBS.set(id, { ...job });
  };

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let rec: Record<string, unknown>;
    try { rec = JSON.parse(trimmed); } catch { return; }
    const stage = rec.stage as string;
    const status = rec.status as string;
    if (stage === "pipeline") {
      job.status = status === "failed" ? "failed" : status === "blocked" ? "blocked" : status === "completed" ? "completed" : job.status;
      if (status === "completed" || status === "blocked") {
        const manifestPath = join(wslJobDir, "manifest.json");
        try {
          if (existsSync(manifestPath)) {
            job.manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
          }
        } catch { /* ignore */ }
        const spz = join(jobDir, "output.spz");
        const ply = join(jobDir, "output.ply");
        if (existsSync(spz)) job.modelPath = spz;
        else if (existsSync(ply)) job.modelPath = ply;
      }
      JOBS.set(id, { ...job });
      return;
    }
    const existing = job.stages.findIndex((s) => s.name === stage);
    const record: SplatLabStageRecord = {
      name: stage, status: status as SplatLabStageRecord["status"], progress: Number(rec.progress ?? 0),
      elapsed_s: rec.elapsed_s as number | undefined,
      detail: rec.detail as string | undefined,
      error: rec.error as string | undefined,
      artifacts: rec.artifacts as string[] | undefined,
    };
    if (existing >= 0) job.stages[existing] = record;
    else job.stages.push(record);
    commit();
  };

  proc.stdout?.setEncoding("utf-8");
  proc.stdout?.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) handleLine(line);
  });
  proc.stderr?.setEncoding("utf-8");
  proc.stderr?.on("data", (chunk: string) => {
    // Surface stderr as a synthetic error detail on the latest stage.
    const last = job.stages[job.stages.length - 1];
    if (last) last.detail = `${last.detail ?? ""}\n${chunk}`.trim();
    commit();
  });
  proc.on("error", (err) => {
    job.status = "failed"; job.error = String(err);
    JOBS.set(id, { ...job });
  });
  proc.on("close", () => { PROCS.delete(id); });
}

export function cancelJob(id: string): boolean {
  const proc = PROCS.get(id);
  if (!proc) return false;
  proc.kill("SIGTERM");
  const job = JOBS.get(id);
  if (job) { job.status = "failed"; job.error = "cancelled"; JOBS.set(id, { ...job }); }
  return true;
}

export function deleteJob(id: string): void {
  cancelJob(id);
  JOBS.delete(id);
}

export function hashId(s: string): string {
  return createHash("sha1").update(s).digest("hex").slice(0, 8);
}
