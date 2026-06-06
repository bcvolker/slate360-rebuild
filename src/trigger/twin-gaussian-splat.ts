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
  const url = process.env.MODAL_TWIN_ENDPOINT?.trim();
  if (!url) throw new Error("MODAL_TWIN_ENDPOINT is not configured");
  return url;
}

async function markJobFailed(
  supabase: ReturnType<typeof getSupabase>,
  jobId: string,
  message: string,
) {
  await supabase
    .from("digital_twin_processing_jobs")
    .update({
      status: "failed",
      error_text: message,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

export const twinGaussianSplatTask = task({
  id: "twin.gaussian_splat",
  maxDuration: 120,
  run: async (payload: { jobId: string }) => {
    const { jobId } = payload;
    const supabase = getSupabase();

    const { data: job, error: jobError } = await supabase
      .from("digital_twin_processing_jobs")
      .select("id, org_id, space_id, capture_id, input_asset_ids, output_format, job_type, status")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) throw new Error(jobError.message);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    if (job.status !== "queued") {
      console.log(`[twin.gaussian_splat] Job ${jobId} status=${job.status}, skipping dispatch`);
      return { skipped: true, status: job.status };
    }

    const { data: assets, error: assetsError } = await supabase
      .from("digital_twin_capture_assets")
      .select("id, storage_key, asset_kind")
      .in("id", job.input_asset_ids ?? [])
      .eq("org_id", job.org_id)
      .is("deleted_at", null);

    if (assetsError) throw new Error(assetsError.message);

    const readyAssets = (assets ?? []).filter((row) => row.storage_key);
    if (!readyAssets.length) {
      await markJobFailed(supabase, jobId, "No ready assets with storage keys");
      return { failed: true, reason: "missing_storage_keys" };
    }

    await supabase
      .from("digital_twin_processing_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        progress_pct: 5,
      })
      .eq("id", jobId);

    const dispatchPayload = {
      jobId: job.id,
      orgId: job.org_id,
      spaceId: job.space_id,
      captureId: job.capture_id,
      sourceKeys: readyAssets.map((row) => row.storage_key as string),
      is360Flags: readyAssets.map((row) => row.asset_kind === "panorama_360"),
      quality: "standard",
      speed: "standard",
      modelType: job.job_type ?? "gaussian_splat",
      newAssetIds: readyAssets.map((row) => row.id),
    };

    try {
      const response = await fetch(getModalEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dispatchPayload),
      });

      if (!response.ok) {
        const detail = (await response.text().catch(() => "")).slice(0, 500);
        await markJobFailed(
          supabase,
          jobId,
          `Modal dispatch failed (${response.status}): ${detail || response.statusText}`,
        );
        return { failed: true, status: response.status };
      }

      const workerRunId = response.headers.get("x-modal-run-id") ?? undefined;
      if (workerRunId) {
        await supabase
          .from("digital_twin_processing_jobs")
          .update({ worker_run_id: workerRunId })
          .eq("id", jobId);
      }

      console.log(`[twin.gaussian_splat] Dispatched job ${jobId} to Modal`);
      return { dispatched: true, jobId, assetCount: readyAssets.length };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markJobFailed(supabase, jobId, `Modal dispatch error: ${message}`);
      throw err;
    }
  },
});
