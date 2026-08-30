import type { SupabaseClient } from "@supabase/supabase-js";
import { clipReadyPatch } from "./derivatives";

export type WalkthroughCallbackPayload = {
  jobId: string;
  clipId: string;
  status: "progress" | "completed" | "failed";
  progressPct?: number;
  stage?: string;
  proxyKey?: string;
  posterKey?: string;
  manifestKey?: string;
  masterSha256?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  fps?: number;
  captureMeta?: Record<string, unknown>;
  publicProxyKey?: string;
  errorLog?: string;
};

export async function handleWalkthroughJobCallback(
  admin: SupabaseClient,
  body: WalkthroughCallbackPayload,
): Promise<{ ok: boolean; status?: number; error?: string; idempotent?: boolean }> {
  const { data: job } = await admin
    .from("spatial_processing_jobs")
    .select("id, clip_id, walkthrough_id, status, job_type")
    .eq("id", body.jobId)
    .maybeSingle();
  if (!job) return { ok: false, status: 404, error: "Job not found" };

  if (body.status === "progress") {
    await admin
      .from("spatial_processing_jobs")
      .update({ status: "processing", progress_pct: body.progressPct ?? 0, stage: body.stage ?? null })
      .eq("id", job.id);
    return { ok: true };
  }

  if (body.status === "failed") {
    await admin
      .from("spatial_processing_jobs")
      .update({ status: "failed", error_log: body.errorLog ?? "Ingest failed", progress_pct: 0 })
      .eq("id", job.id);
    if (job.job_type !== "privacy-bake" && job.clip_id) {
      await admin
        .from("spatial_clips")
        .update({ status: "failed", processing_error: body.errorLog ?? "Ingest failed" })
        .eq("id", job.clip_id);
    }
    if (job.job_type !== "privacy-bake") {
      await admin
        .from("spatial_walkthroughs")
        .update({ status: "failed", processing_error: body.errorLog ?? "Ingest failed" })
        .eq("id", job.walkthrough_id);
    }
    return { ok: true };
  }

  if (job.status === "ready" && !body.publicProxyKey) return { ok: true, idempotent: true };

  if (body.publicProxyKey && !body.proxyKey) {
    await admin
      .from("spatial_clips")
      .update({ public_proxy_key: body.publicProxyKey })
      .eq("id", job.clip_id ?? body.clipId);
    await admin
      .from("spatial_processing_jobs")
      .update({ status: "ready", progress_pct: 100, stage: "privacy-bake" })
      .eq("id", job.id);
    return { ok: true };
  }

  const clipId = job.clip_id ?? body.clipId;
  const duration = body.durationSec ?? null;
  await admin
    .from("spatial_clips")
    .update(clipReadyPatch({
      proxyKey: body.proxyKey,
      posterKey: body.posterKey,
      manifestKey: body.manifestKey,
      masterSha256: body.masterSha256,
      durationSec: duration,
      width: body.width,
      height: body.height,
      fps: body.fps,
      captureMeta: body.captureMeta,
      publicProxyKey: body.publicProxyKey,
    }))
    .eq("id", clipId);

  await admin
    .from("spatial_processing_jobs")
    .update({ status: "ready", progress_pct: 100, stage: "complete" })
    .eq("id", job.id);

  const { data: clips } = await admin
    .from("spatial_clips")
    .select("duration_s")
    .eq("walkthrough_id", job.walkthrough_id);

  const total = (clips ?? []).reduce((sum, c) => sum + (Number(c.duration_s) || 0), 0);
  await admin
    .from("spatial_walkthroughs")
    .update({ status: "ready", duration_s: total, processing_error: null })
    .eq("id", job.walkthrough_id);

  return { ok: true };
}
