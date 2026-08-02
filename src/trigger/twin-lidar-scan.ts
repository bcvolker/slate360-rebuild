import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase service configuration is required");
  return createClient(url, key);
};

function getModalEndpoint(): string {
  const url = process.env.MODAL_LIDAR_ENDPOINT?.trim();
  if (!url) throw new Error("MODAL_LIDAR_ENDPOINT is not configured");
  return url;
}

async function failJob(
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

  const { data: job } = await supabase
    .from("digital_twin_processing_jobs")
    .select("capture_id")
    .eq("id", jobId)
    .maybeSingle();
  if (job?.capture_id) {
    await supabase
      .from("digital_twin_captures")
      .update({ capture_status: "failed", error_text: message })
      .eq("id", job.capture_id)
      .eq("capture_status", "processing");
  }
}

export const twinLidarScanTask = task({
  id: "twin.lidar_scan",
  maxDuration: 900,
  run: async (payload: { jobId: string }) => {
    const supabase = getSupabase();
    const { data: job, error: jobError } = await supabase
      .from("digital_twin_processing_jobs")
      .select("id, org_id, space_id, capture_id, input_asset_ids, output_format, job_type, status")
      .eq("id", payload.jobId)
      .maybeSingle();

    if (jobError) throw new Error(jobError.message);
    if (!job) throw new Error(`Job not found: ${payload.jobId}`);
    if (job.job_type !== "lidar_scan" || job.output_format !== "lidar_octree") {
      await failJob(
        supabase,
        payload.jobId,
        `Unsupported LiDAR job contract: ${job.job_type}/${job.output_format}`,
      );
      return { failed: true, reason: "unsupported_job_contract" };
    }
    if (job.status !== "queued") return { skipped: true, status: job.status };

    const { data: assets, error: assetsError } = await supabase
      .from("digital_twin_capture_assets")
      .select("id, storage_key, asset_kind, status")
      .in("id", job.input_asset_ids ?? [])
      .eq("org_id", job.org_id)
      .is("deleted_at", null);
    if (assetsError) throw new Error(assetsError.message);

    const scanAssets = (assets ?? []).filter(
      (asset) =>
        asset.asset_kind === "lidar_scan" &&
        asset.status === "ready" &&
        Boolean(asset.storage_key),
    );
    if (!scanAssets.length) {
      await failJob(supabase, payload.jobId, "No ready lidar_scan assets with storage keys");
      return { failed: true, reason: "missing_lidar_scan_assets" };
    }

    const { data: claimedJob, error: claimError } = await supabase
      .from("digital_twin_processing_jobs")
      .update({ status: "processing", started_at: new Date().toISOString(), progress_pct: 5 })
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
      sourceKeys: scanAssets.map((asset) => asset.storage_key as string),
      newAssetIds: scanAssets.map((asset) => asset.id),
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
        await failJob(supabase, payload.jobId, `LiDAR Modal dispatch failed: ${detail}`);
        return { failed: true, status: response.status };
      }

      const workerRunId = response.headers.get("x-modal-run-id");
      if (workerRunId) {
        await supabase
          .from("digital_twin_processing_jobs")
          .update({ worker_run_id: workerRunId })
          .eq("id", payload.jobId);
      }
      return { dispatched: true, jobId: payload.jobId, assetCount: scanAssets.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await failJob(supabase, payload.jobId, `LiDAR Modal dispatch error: ${message}`);
      throw error;
    }
  },
});
