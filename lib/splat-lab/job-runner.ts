import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RunOptions, SplatLabJob, SplatLabStageRecord } from "@/lib/splat-lab/job-types";
import { toWslPath, wslCleanEnv, WSL_DISTRO, WSL_PYTHON, WSL_REPO } from "@/lib/splat-lab/wsl";

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
    `cd ${WSL_REPO}/workers/local/splat-lab;`,
    wslCleanEnv(),
    `${WSL_PYTHON} run.py`,
    `--input ${JSON.stringify(wslInput)}`,
    `--output ${JSON.stringify(wslOutput)}`,
    `--job-id ${job.id}`,
    `--clone ${opts.clone}`,
    opts.workspaceName ? `--workspace-name ${JSON.stringify(opts.workspaceName)}` : "",
    opts.is360 ? "--is360" : "",
    opts.removePeople ? "--remove-people" : "",
    opts.useLidar ? "--use-lidar" : "",
    opts.useRtk ? "--use-rtk" : "",
    `--fps ${opts.fps}`,
    `--spherical-mode ${opts.sphericalMode}`,
    `--image-size ${opts.imageSize}`,
    `--max-duration ${opts.maxDuration}`,
    `--max-features ${opts.maxFeatures}`,
    `--view-image-size ${opts.viewImageSize}`,
    `--sh-degree ${opts.shDegree}`,
    `--max-splats-millions ${opts.maxSplatsMillions}`,
    `--training-steps ${opts.trainingSteps}`,
    `--images-per-step ${opts.imagesPerStep}`,
    `--preset ${opts.preset}`,
    `--quality ${opts.quality}`,
    `--strategy ${opts.strategy}`,
    opts.useBilateralGrid ? "--use-bilateral-grid" : "",
    opts.fromStage ? `--from-stage ${opts.fromStage}` : "",
  ].filter(Boolean).join(" ");

  const proc = spawn("wsl.exe", ["-d", WSL_DISTRO, "--", "bash", "-lc", flags], { cwd: REPO_ROOT });
  procs.set(job.id, proc);

  let buffer = "";
  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let rec: Record<string, unknown>;
    try { rec = JSON.parse(trimmed); } catch { return; }
    applyRecord(job, rec, jobDir, commit);
  };

  let stderrTail = "";
  proc.stdout?.setEncoding("utf-8");
  proc.stdout?.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) handleLine(line);
  });
  proc.stderr?.setEncoding("utf-8");
  proc.stderr?.on("data", (chunk: string) => {
    // Buffered even when no stage has started yet — a failure before the
    // first JSON stage line (e.g. a Python import error, a bad WSL command)
    // must still be visible instead of silently dropped (root-caused
    // 2026-09-12: a job that failed before any stage started showed only
    // "runner exited with code 1" with no indication of why).
    stderrTail = `${stderrTail}${chunk}`.slice(-4000);
    const last = job.stages[job.stages.length - 1];
    if (last) { last.detail = `${last.detail ?? ""}\n${chunk}`.trim(); commit(job); }
  });
  proc.on("error", (err) => {
    job.status = "failed";
    job.error = String(err);
    commit(job);
  });
  proc.on("close", (code) => {
    procs.delete(job.id);
    if (code !== 0 && job.status === "running") {
      job.status = "failed";
      job.error = job.error ?? `runner exited with code ${code}` +
        (stderrTail.trim() ? `: ${stderrTail.trim().slice(-500)}` : "");
      commit(job);
    }
  });
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
    const qualityPath = join(jobDir, "quality.json");
    try {
      if (existsSync(qualityPath)) job.quality = JSON.parse(readFileSync(qualityPath, "utf-8"));
    } catch { /* ignore */ }
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
