import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase service configuration is required");
  return createClient(url, key);
};

function getModalEndpoint(): string {
  const url = process.env.MODAL_PHOTOGRAMMETRY_ENDPOINT?.trim();
  if (!url) throw new Error("MODAL_PHOTOGRAMMETRY_ENDPOINT is not configured");
  return url;
}

async function failJob(supabase: ReturnType<typeof getSupabase>, jobId: string, message: string) {
  await supabase
    .from("digital_twin_processing_jobs")
    .update({
      status: "failed",
      error_text: message,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

export const twinPhotogrammetryTask = task({
  id: "twin.photogrammetry_mesh",
  maxDuration: 900,
  run: async (payload: { jobId: string; quality?: string }) => {
    const supabase = getSupabase();
    const quality = payload.quality === "high" ? "high" : "standard";
    const { data: job, error: jobError } = await supabase
      .from("digital_twin_processing_jobs")
      .select("id, org_id, space_id, capture_id, input_asset_ids, job_type, status")
      .eq("id", payload.jobId)
      .maybeSingle();

    if (jobError) throw new Error(jobError.message);
    if (!job) throw new Error(`Job not found: ${payload.jobId}`);
    if (job.job_type !== "photogrammetry_mesh") {
      await failJob(supabase, payload.jobId, `Unsupported exterior job type: ${job.job_type}`);
      return { failed: true, reason: "unsupported_job_type" };
    }
    if (job.status !== "queued") {
      return { skipped: true, status: job.status };
    }

    const { data: assets, error: assetsError } = await supabase
      .from("digital_twin_capture_assets")
      .select("id, storage_key, asset_kind, status")
      .in("id", job.input_asset_ids ?? [])
      .eq("org_id", job.org_id)
      .is("deleted_at", null);
    if (assetsError) throw new Error(assetsError.message);

    const mediaAssets = (assets ?? []).filter(
      (asset) =>
        Boolean(asset.storage_key) &&
        asset.status === "ready" &&
        (asset.asset_kind === "drone_photo" || asset.asset_kind === "photo"),
    );
    if (mediaAssets.length < 3) {
      await failJob(
        supabase,
        payload.jobId,
        "Exterior photogrammetry requires at least three ready photo assets",
      );
      return { failed: true, reason: "insufficient_photo_assets" };
    }

    const { data: claimedJob, error: claimError } = await supabase
      .from("digital_twin_processing_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        progress_pct: 5,
      })
      .eq("id", payload.jobId)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimedJob) return { skipped: true, status: "already_claimed" };

    const dispatchPayload = {
      jobId: job.id,
      orgId: job.org_id,
      spaceId: job.space_id,
      captureId: job.capture_id,
      sourceKeys: mediaAssets.map((asset) => asset.storage_key as string),
      newAssetIds: mediaAssets.map((asset) => asset.id),
      quality,
      sourceRole: mediaAssets.some((asset) => asset.asset_kind === "drone_photo")
        ? "drone"
        : "photogrammetry",
    };

    try {
      const token = process.env.GPU_WORKER_SECRET_KEY?.trim();
      const response = await fetch(getModalEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-dispatch-token": token } : {}),
        },
        body: JSON.stringify(dispatchPayload),
      });
      if (!response.ok) {
        const detail = (await response.text().catch(() => "")).slice(0, 500);
        await failJob(supabase, payload.jobId, `Exterior Modal dispatch failed: ${detail}`);
        return { failed: true, status: response.status };
      }

      const workerRunId = response.headers.get("x-modal-run-id");
      if (workerRunId) {
        await supabase
          .from("digital_twin_processing_jobs")
          .update({ worker_run_id: workerRunId })
          .eq("id", payload.jobId);
      }
      return { dispatched: true, jobId: payload.jobId, assetCount: mediaAssets.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await failJob(supabase, payload.jobId, `Exterior Modal dispatch error: ${message}`);
      throw error;
    }
  },
});
