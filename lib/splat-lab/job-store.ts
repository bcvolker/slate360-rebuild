/** Splat Lab — in-memory job store + WSL subprocess manager. LOCAL DEV ONLY. */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ChildProcess } from "node:child_process";
import type { RunOptions, SplatLabJob } from "@/lib/splat-lab/job-types";
import { spawnRunner } from "@/lib/splat-lab/job-runner";

export type { RunOptions, SplatLabJob, SplatLabStageRecord, SplatLabTelemetry } from "@/lib/splat-lab/job-types";

const JOBS = new Map<string, SplatLabJob>();
const PROCS = new Map<string, ChildProcess>();
const REPO_ROOT = process.cwd();
export const SPLAT_LAB_ROOT = join(REPO_ROOT, "tmp", "splat-lab");

export function isSplatLabEnabled(): boolean {
  return process.env.SLATE360_SPLAT_LAB === "1" || process.env.NODE_ENV === "development";
}

function commit(job: SplatLabJob): void {
  JOBS.set(job.id, { ...job, stages: [...job.stages] });
}

export function getJob(id: string): SplatLabJob | undefined {
  hydrate();
  return JOBS.get(id);
}

export function listJobs(): SplatLabJob[] {
  hydrate();
  return [...JOBS.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function readJobModel(id: string): Buffer | null {
  const job = getJob(id);
  if (!job?.modelPath || !existsSync(job.modelPath)) return null;
  return readFileSync(job.modelPath);
}

export function jobModelSize(id: string): number | null {
  const job = getJob(id);
  if (!job?.modelPath || !existsSync(job.modelPath)) return null;
  return statSync(job.modelPath).size;
}

export function jobDir(id: string): string {
  return join(SPLAT_LAB_ROOT, id);
}

export function startJob(opts: RunOptions): string {
  const id = randomUUID().slice(0, 8);
  const dir = jobDir(id);
  mkdirSync(dir, { recursive: true });
  const job: SplatLabJob = {
    id, status: "running", input: opts.input, is360: opts.is360,
    clone: opts.clone, createdAt: Date.now(), stages: [],
    manifest: null, modelPath: null, error: null,
    telemetry: null, hasSfmPreview: false,
  };
  JOBS.set(id, job);
  spawnRunner(job, dir, opts, PROCS, commit);
  return id;
}

export function cancelJob(id: string): boolean {
  const proc = PROCS.get(id);
  if (!proc) return false;
  proc.kill("SIGTERM");
  const job = JOBS.get(id);
  if (job) { job.status = "failed"; job.error = "cancelled"; commit(job); }
  return true;
}

export function deleteJob(id: string): void {
  cancelJob(id);
  JOBS.delete(id);
}

let hydrated = false;
function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  if (!existsSync(SPLAT_LAB_ROOT)) return;
  for (const id of readdirSync(SPLAT_LAB_ROOT)) {
    if (JOBS.has(id)) continue;
    const dir = jobDir(id);
    const manifestPath = join(dir, "manifest.json");
    const configPath = join(dir, "config.json");
    if (!existsSync(manifestPath) && !existsSync(configPath)) continue;
    let manifest: Record<string, unknown> | null = null;
    let config: Record<string, unknown> = {};
    try { if (existsSync(manifestPath)) manifest = JSON.parse(readFileSync(manifestPath, "utf-8")); } catch { /* ignore */ }
    try { if (existsSync(configPath)) config = JSON.parse(readFileSync(configPath, "utf-8")); } catch { /* ignore */ }
    const spz = join(dir, "output.spz");
    const ply = join(dir, "output.ply");
    const status = (manifest?.status as SplatLabJob["status"]) || "completed";
    JOBS.set(id, {
      id, status: status === "completed" || status === "failed" || status === "blocked" ? status : "completed",
      input: String(manifest?.input ?? config.input_path ?? ""),
      is360: Boolean(manifest?.is360 ?? config.is360),
      clone: config.clone === "lab" ? "lab" : "proven",
      createdAt: existsSync(manifestPath) ? statSync(manifestPath).mtimeMs : Date.now(),
      stages: Array.isArray(manifest?.stages) ? manifest.stages as SplatLabJob["stages"] : [],
      manifest, modelPath: existsSync(spz) ? spz : existsSync(ply) ? ply : null,
      error: null, telemetry: null,
      hasSfmPreview: existsSync(join(dir, "sfm", "preview.json")),
    });
  }
}
