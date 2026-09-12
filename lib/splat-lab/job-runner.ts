import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RunOptions, SplatLabJob, SplatLabStageRecord } from "@/lib/splat-lab/job-types";
import { toWslPath, wslCleanEnv, WSL_PYTHON, WSL_REPO } from "@/lib/splat-lab/wsl";

const REPO_ROOT = process.cwd();

export function spawnRunner(
  job: SplatLabJob,
  jobDir: string,
  opts: RunOptions,
  procs: Map<string, ChildProcess>,
  commit: (j: SplatLabJob) => void,
): void {
  const wslInput = toWslPath(opts.input);
  const wslOutput = toWslPath(join(REPO_ROOT, "tmp", "splat-lab"));
  const flags = [
    `cd ${WSL_REPO}`,
    wslCleanEnv(),
    `${WSL_PYTHON} workers/local/splat-lab/run.py`,
    `--input ${JSON.stringify(wslInput)}`,
    `--output ${JSON.stringify(wslOutput)}`,
    `--job-id ${job.id}`,
    `--clone ${opts.clone}`,
    opts.is360 ? "--is360" : "",
    opts.removePeople ? "--remove-people" : "",
    opts.useLidar ? "--use-lidar" : "",
    opts.useRtk ? "--use-rtk" : "",
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

  const proc = spawn("wsl.exe", ["bash", "-lc", flags], { cwd: REPO_ROOT });
  procs.set(job.id, proc);

  let buffer = "";
  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let rec: Record<string, unknown>;
    try { rec = JSON.parse(trimmed); } catch { return; }
    applyRecord(job, rec, jobDir, commit);
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
    const last = job.stages[job.stages.length - 1];
    if (last) last.detail = `${last.detail ?? ""}\n${chunk}`.trim();
    commit(job);
  });
  proc.on("error", (err) => {
    job.status = "failed";
    job.error = String(err);
    commit(job);
  });
  proc.on("close", () => { procs.delete(job.id); });
}

function applyRecord(
  job: SplatLabJob,
  rec: Record<string, unknown>,
  jobDir: string,
  commit: (j: SplatLabJob) => void,
): void {
  const stage = rec.stage as string;
  const status = rec.status as string;
  if (typeof rec.iteration === "number" || typeof rec.splats === "number") {
    job.telemetry = {
      iteration: rec.iteration as number | undefined,
      steps: rec.steps as number | undefined,
      splats: rec.splats as number | undefined,
      itPerSec: rec.it_s as number | undefined,
      etaSec: rec.eta_s as number | undefined,
    };
  }
  if (stage === "pipeline") {
    job.status = status === "failed" ? "failed" : status === "blocked" ? "blocked" : status === "completed" ? "completed" : job.status;
    const manifestPath = join(jobDir, "manifest.json");
    try {
      if (existsSync(manifestPath)) job.manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    } catch { /* ignore */ }
    const spz = join(jobDir, "output.spz");
    const ply = join(jobDir, "output.ply");
    if (existsSync(spz)) job.modelPath = spz;
    else if (existsSync(ply)) job.modelPath = ply;
    job.hasSfmPreview = existsSync(join(jobDir, "sfm", "preview.json"));
    commit(job);
    return;
  }
  const record: SplatLabStageRecord = {
    name: stage, status: status as SplatLabStageRecord["status"],
    progress: Number(rec.progress ?? 0),
    elapsed_s: rec.elapsed_s as number | undefined,
    detail: rec.detail as string | undefined,
    error: rec.error as string | undefined,
    artifacts: rec.artifacts as string[] | undefined,
  };
  const existing = job.stages.findIndex((s) => s.name === stage);
  if (existing >= 0) job.stages[existing] = record;
  else job.stages.push(record);
  commit(job);
}
