import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase credentials required");
  return createClient(url, key);
};

export const spatialWalkthroughIngestTask = task({
  id: "spatial-walkthrough.ingest",
  maxDuration: 120,
  run: async (payload: { jobId: string; callbackBaseUrl?: string; mode?: string }) => {
    const supabase = getSupabase();
    const { data: job } = await supabase
      .from("spatial_processing_jobs")
      .select("id, org_id, walkthrough_id, clip_id, status, source_s3_key, metadata, job_type")
      .eq("id", payload.jobId)
      .maybeSingle();
    if (!job) throw new Error(`Job not found: ${payload.jobId}`);
    if (job.status !== "queued") return { skipped: true, status: job.status };

    await supabase
      .from("spatial_processing_jobs")
      .update({ status: "processing", progress_pct: 5, stage: "dispatch" })
      .eq("id", job.id);

    const endpoint = process.env.MODAL_SPATIAL_WALKTHROUGH_ENDPOINT?.trim();
    if (!endpoint) {
      await supabase
        .from("spatial_processing_jobs")
        .update({
          status: "failed",
          error_log: "MODAL_SPATIAL_WALKTHROUGH_ENDPOINT is not configured",
        })
        .eq("id", job.id);
      return { failed: true, reason: "missing-endpoint" };
    }

    const meta = (job.metadata ?? {}) as {
      mode?: string;
      operatorPatch?: unknown;
      skipIntervals?: unknown;
    };
    const mode = payload.mode || meta.mode || (job.job_type === "privacy-bake" ? "privacy-bake" : undefined);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job.id,
        clipId: job.clip_id,
        orgId: job.org_id,
        sourceKey: job.source_s3_key,
        mode,
        operatorPatch: meta.operatorPatch,
        skipIntervals: meta.skipIntervals ?? [],
        callbackBaseUrl:
          payload.callbackBaseUrl?.trim() ||
          process.env.SITE_URL?.trim() ||
          process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
          "",
      }),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 400);
      await supabase
        .from("spatial_processing_jobs")
        .update({ status: "failed", error_log: `Modal dispatch ${res.status}: ${detail}` })
        .eq("id", job.id);
      if (job.clip_id && mode !== "privacy-bake") {
        await supabase
          .from("spatial_clips")
          .update({ status: "failed", processing_error: detail })
          .eq("id", job.clip_id);
      }
      return { failed: true, status: res.status };
    }
    const runId = res.headers.get("x-modal-run-id") ?? undefined;
    if (runId) {
      await supabase.from("spatial_processing_jobs").update({ worker_run_id: runId }).eq("id", job.id);
    }
    return { dispatched: true, jobId: job.id };
  },
});
