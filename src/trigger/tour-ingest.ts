import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl) throw new Error("supabaseUrl is required.");
  if (!supabaseServiceKey) throw new Error("supabaseServiceKey is required.");
  return createClient(supabaseUrl, supabaseServiceKey);
};

function getModalEndpoint(): string {
  const url = process.env.MODAL_TOUR_ENDPOINT?.trim();
  if (!url) throw new Error("MODAL_TOUR_ENDPOINT is not configured");
  return url;
}

async function markFailed(
  supabase: ReturnType<typeof getSupabase>,
  jobId: string,
  sceneId: string | null,
  message: string,
) {
  await supabase
    .from("tour_processing_jobs")
    .update({ status: "failed", error_log: message, progress_pct: 0 })
    .eq("id", jobId);
  if (sceneId) {
    await supabase
      .from("tour_scenes")
      .update({ status: "failed", processing_error: message })
      .eq("id", sceneId);
  }
}

/**
 * tour.ingest — dispatch a queued tour ingest job to the Modal worker.
 * Reads the job row, POSTs to MODAL_TOUR_ENDPOINT; Modal processes the panorama and
 * calls back /api/tours/jobs/callback (signed) to write derivatives + flip status.
 */
export const tourIngestTask = task({
  id: "tour.ingest",
  maxDuration: 120,
  run: async (payload: { jobId: string }) => {
    const supabase = getSupabase();

    const { data: job, error } = await supabase
      .from("tour_processing_jobs")
      .select("id, org_id, tour_id, scene_id, status, source_s3_key")
      .eq("id", payload.jobId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!job) throw new Error(`Tour job not found: ${payload.jobId}`);
    if (job.status !== "queued") {
      return { skipped: true as const, status: job.status };
    }

    await supabase
      .from("tour_processing_jobs")
      .update({ status: "processing", progress_pct: 5, stage: "dispatch" })
      .eq("id", job.id);

    const modalPayload = {
      jobId: job.id,
      sceneId: job.scene_id,
      orgId: job.org_id,
      tourId: job.tour_id,
      sourceKey: job.source_s3_key,
    };

    try {
      const resp = await fetch(getModalEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modalPayload),
      });
      if (!resp.ok) {
        const detail = (await resp.text().catch(() => "")).slice(0, 500);
        await markFailed(supabase, job.id, job.scene_id, `Modal dispatch failed (${resp.status}): ${detail}`);
        return { failed: true as const, status: resp.status };
      }
      const workerRunId = resp.headers.get("x-modal-run-id") ?? undefined;
      if (workerRunId) {
        await supabase.from("tour_processing_jobs").update({ worker_run_id: workerRunId }).eq("id", job.id);
      }
      return { dispatched: true as const };
    } catch (err) {
      await markFailed(supabase, job.id, job.scene_id, err instanceof Error ? err.message : "dispatch error");
      throw err;
    }
  },
});
