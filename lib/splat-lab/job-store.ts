/**
 * Splat Lab — job store + WSL subprocess manager. LOCAL DEV ONLY.
 *
 * Root-caused 2026-09-12: a plain in-memory Map is NOT reliably shared
 * across different Next.js API route handlers in dev mode — a job started
 * by POST /api/splat-lab/run was invisible to GET /api/splat-lab/jobs/[id]
 * moments later (verified: the second route's module instance had an empty
 * Map). Every live update is now ALSO written to
 * `<jobDir>/live-status.json` immediately, and every read prefers that file
 * over the in-process Map, so state survives across whichever route/module
 * instance happens to handle each request. The in-memory Map remains as a
 * fast path within a single request's own process.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ChildProcess } from "node:child_process";
import type { RunOptions, SplatLabJob } from "@/lib/splat-lab/job-types";
import { spawnRunner } from "@/lib/splat-lab/job-runner";
import { WSL_DISTRO } from "@/lib/splat-lab/wsl";

export type { RunOptions, SplatLabJob, SplatLabStageRecord, SplatLabTelemetry } from "@/lib/splat-lab/job-types";

const JOBS = new Map<string, SplatLabJob>();
const PROCS = new Map<string, ChildProcess>();
const REPO_ROOT = process.cwd();
export const SPLAT_LAB_ROOT = join(REPO_ROOT, "tmp", "splat-lab");

export function isSplatLabEnabled(): boolean {
  return process.env.SLATE360_SPLAT_LAB === "1" || process.env.NODE_ENV === "development";
}

function livePath(id: string): string {
  return join(jobDir(id), "live-status.json");
}

function writeLiveState(job: SplatLabJob): void {
  try {
    const dir = jobDir(job.id);
    mkdirSync(dir, { recursive: true });
    const tmp = `${livePath(job.id)}.tmp`;
    writeFileSync(tmp, JSON.stringify(job), "utf-8");
    renameSync(tmp, livePath(job.id)); // atomic on the same volume
  } catch {
    /* best effort — the in-memory Map still serves this process */
  }
}

function readLiveState(id: string): SplatLabJob | null {
  try {
    if (!existsSync(livePath(id))) return null;
    return JSON.parse(readFileSync(livePath(id), "utf-8")) as SplatLabJob;
  } catch {
    return null;
  }
}

function commit(job: SplatLabJob): void {
  const snapshot: SplatLabJob = { ...job, stages: [...job.stages] };
  JOBS.set(job.id, snapshot);
  writeLiveState(snapshot);
}

export function getJob(id: string): SplatLabJob | undefined {
  const fromDisk = readLiveState(id);
  if (fromDisk) return fromDisk;
  hydrate();
  return JOBS.get(id);
}

export function listJobs(): SplatLabJob[] {
  hydrate();
  const merged = new Map<string, SplatLabJob>(JOBS);
  if (existsSync(SPLAT_LAB_ROOT)) {
    for (const id of readdirSync(SPLAT_LAB_ROOT)) {
      const fromDisk = readLiveState(id);
      if (fromDisk) merged.set(id, fromDisk);
    }
  }
  return [...merged.values()].sort((a, b) => b.createdAt - a.createdAt);
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
    telemetry: null, hasSfmPreview: false, quality: null,
  };
  commit(job);
  spawnRunner(job, dir, opts, PROCS, commit);
  return id;
}

/**
 * Re-run an existing job starting from a given stage (a stage card's Rerun
 * button), reusing that job's own recorded config.json rather than asking
 * the caller to resupply every option. The stage cards further down the
 * pipeline (views/train/export) re-run unconditionally; frames/mask are
 * skipped by their own stages when their outputs already exist on disk.
 */
export async function rerunJob(id: string, fromStage: string): Promise<boolean> {
  if (!/^[0-9a-f]{8}$/.test(id)) return false;
  const dir = jobDir(id);
  const configPath = join(dir, "config.json");
  if (!existsSync(configPath)) return false;
  let config: Record<string, unknown>;
  try { config = JSON.parse(readFileSync(configPath, "utf-8")); } catch { return false; }

  // Must fully finish (including its internal 1s SIGKILL sweep) before the
  // new process is spawned below — root-caused 2026-09-12: the old
  // fire-and-forget kill's delayed sweep matches on job id, not a specific
  // PID, so it was also killing the brand-new process for the same job id
  // moments after Rerun started it.
  await killWslJobTreeAndWait(id);

  const opts: RunOptions = {
    input: String(config.input_path ?? ""),
    is360: Boolean(config.is360),
    clone: config.clone === "lab" ? "lab" : "proven",
    workspaceName: String(config.workspace_name ?? ""),
    fps: Number(config.fps ?? 4),
    removePeople: Boolean(config.remove_people),
    sphericalMode: config.spherical_mode === "rig" ? "rig" : "native",
    imageSize: String(config.image_size ?? "auto"),
    maxDuration: Number(config.max_duration ?? 0),
    maxFeatures: Number(config.max_features ?? 16384),
    viewImageSize: (String(config.view_image_size ?? "1280")) as RunOptions["viewImageSize"],
    shDegree: Number(config.sh_degree ?? 3),
    maxSplatsMillions: Number(config.max_splats_millions ?? 0),
    trainingSteps: Number(config.training_steps ?? 0),
    imagesPerStep: Number(config.images_per_step ?? 2),
    preset: String(config.preset ?? "classic"),
    quality: String(config.quality ?? "auto"),
    strategy: config.strategy === "mcmc" ? "mcmc" : "default",
    useBilateralGrid: Boolean(config.use_bilateral_grid),
    useLidar: Boolean(config.use_lidar),
    useRtk: Boolean(config.use_rtk),
    fromStage,
  };

  const job: SplatLabJob = {
    id, status: "running", input: opts.input, is360: opts.is360,
    clone: opts.clone, createdAt: Date.now(), stages: [],
    manifest: null, modelPath: null, error: null,
    telemetry: null, hasSfmPreview: false, quality: null,
  };
  commit(job);
  spawnRunner(job, dir, opts, PROCS, commit);
  return true;
}

/**
 * Cancel is a two-step kill: the Windows-side `wsl.exe` wrapper (only
 * reachable if this process instance happens to hold the child handle) AND
 * a systemwide WSL pkill by job-id pattern, which works regardless of which
 * process/module instance handles the cancel request. SIGTERM on `wsl.exe`
 * alone leaves the Linux chain running for hours — this was root-caused
 * 2026-09-12 (an exhaustive `colmap` matcher survived 2h35m after the UI
 * job was "cancelled"; only a machine reboot killed it).
 */
export function cancelJob(id: string): boolean {
  if (!/^[0-9a-f]{8}$/.test(id)) return false;
  const proc = PROCS.get(id);

  killWslJobTree(id);
  if (proc) proc.kill("SIGTERM");

  const job = getJob(id) ?? JOBS.get(id);
  if (job) { job.status = "failed"; job.error = "cancelled"; commit(job); }
  return true;
}

function killScript(id: string): string {
  const pattern = `--job-id ${id}( |$)`;
  return `pkill -TERM -f -- "${pattern}" 2>/dev/null; sleep 1; ` +
    `pkill -KILL -f -- "${pattern}" 2>/dev/null; ` +
    `pkill -KILL -f -- "splat-lab/${id}/" 2>/dev/null; true`;
}

// Fire-and-forget: used by cancelJob, which wants instant UI feedback and
// never spawns a new process for the same job id afterward, so the delayed
// internal sweep (see killScript) racing a later spawn is not a concern here.
function killWslJobTree(id: string): void {
  try {
    execFile("wsl.exe", ["-d", WSL_DISTRO, "--", "bash", "-lc", killScript(id)], { timeout: 8000 }, () => {
      /* best effort; nothing to do with the result */
    });
  } catch {
    /* best effort */
  }
}

// Awaited: used by rerunJob, which spawns a new process for the SAME job id
// right after — must not return until the kill (including its internal
// SIGKILL sweep a second later) is fully done.
async function killWslJobTreeAndWait(id: string): Promise<void> {
  try {
    await promisify(execFile)("wsl.exe", ["-d", WSL_DISTRO, "--", "bash", "-lc", killScript(id)], { timeout: 8000 });
  } catch {
    /* best effort — proceed to spawn regardless */
  }
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
