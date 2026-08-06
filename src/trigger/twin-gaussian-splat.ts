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

  // The API set the capture to "processing" at enqueue; failing only the job
  // leaves the capture spinning forever (stale recovery touches jobs, not
  // captures, once the job is terminal).
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

export const twinGaussianSplatTask = task({
  id: "twin.gaussian_splat",
  maxDuration: 120,
  run: async (payload: {
    jobId: string;
    quality?: string;
    forceColmap?: boolean;
    alignBackend?: "colmap_vanilla" | "colmap_pose_prior";
    /** B1: worker.py TRAIN_PROFILE override for an A/B run (baseline is the
     * promoted default — pose-prior-style promotions require the human
     * R7.5 visual gate, this never auto-promotes anything). */
    trainProfile?: "baseline" | "quality" | "visual";
  }) => {
    const { jobId } = payload;
    const quality = payload.quality === "high" ? "high" : "standard";
    // Diagnostic-only option (see scripts/ops/diagnose-twin-poses.mjs R3): skips the
    // ARKit pose bypass worker-side and forces the standard COLMAP path even when
    // lidarPosesKey/lidarPlyKey are present, for A/B comparison against the bypass.
    const forceColmap = payload.forceColmap === true;
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
      .select("id, storage_key, asset_kind, status")
      .in("id", job.input_asset_ids ?? [])
      .eq("org_id", job.org_id)
      .is("deleted_at", null);

    if (assetsError) throw new Error(assetsError.message);

    const allReadyAssets = (assets ?? []).filter(
      (row) => row.storage_key && row.status === "ready",
    );
    if (!allReadyAssets.length) {
      await markJobFailed(supabase, jobId, "No ready assets with storage keys");
      return { failed: true, reason: "missing_storage_keys" };
    }

    // Only photo/video kinds go into sourceKeys — PLY and poses assets are not
    // processable by COLMAP/ffmpeg image pipelines and must be passed separately.
    const MEDIA_KINDS = new Set([
      "photo", "video", "panorama_360", "drone_photo", "drone_video",
    ]);
    const mediaAssets = allReadyAssets.filter((row) => MEDIA_KINDS.has(row.asset_kind ?? ""));
    const posesAssets = allReadyAssets.filter((row) => row.asset_kind === "lidar_poses");
    const plyAssets = allReadyAssets.filter((row) => row.asset_kind === "ply_lidar");
    const depthAssets = allReadyAssets.filter((row) => row.asset_kind === "lidar_depth");
    if (posesAssets.length > 1 || plyAssets.length > 1 || depthAssets.length > 1) {
      const message =
        "Multiple LiDAR evidence assets are present, but multi-clip merge is not enabled yet; " +
        "refusing to silently process only the first asset.";
      await markJobFailed(supabase, jobId, message);
      return { failed: true, reason: "multiple_lidar_assets_not_supported" };
    }
    const posesAsset = posesAssets[0];
    const plyAsset = plyAssets[0];

    if (!mediaAssets.length) {
      await markJobFailed(supabase, jobId, "No photo or video assets ready for processing");
      return { failed: true, reason: "no_media_assets" };
    }

    const { data: claimedJob, error: claimError } = await supabase
      .from("digital_twin_processing_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        progress_pct: 5,
      })
      .eq("id", jobId)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimedJob) {
      console.log(`[twin.gaussian_splat] Job ${jobId} was claimed by another run`);
      return { skipped: true, status: "already_claimed" };
    }

    const dispatchPayload = {
      jobId: job.id,
      orgId: job.org_id,
      spaceId: job.space_id,
      captureId: job.capture_id,
      sourceKeys: mediaAssets.map((row) => row.storage_key as string),
      is360Flags: mediaAssets.map((row) => row.asset_kind === "panorama_360"),
      quality,
      speed: "standard",
      modelType: job.job_type ?? "gaussian_splat",
      newAssetIds: mediaAssets.map((row) => row.id),
      lidarPosesKey: posesAsset?.storage_key ?? null,
      lidarPlyKey: plyAsset?.storage_key ?? null,
      lidarDepthKey: depthAssets[0]?.storage_key ?? null,
      forceColmap,
      alignBackend: payload.alignBackend ?? null,
      trainProfile: payload.trainProfile ?? null,
    };

    try {
      // The Modal endpoint sits on a public *.modal.run URL with no gateway auth, so the
      // dispatch has to identify itself or anyone who learns the URL can spawn GPU jobs.
      // Reuses GPU_WORKER_SECRET_KEY — the same secret the worker signs its callbacks with —
      // so there is nothing extra to provision. Trigger reads its env at DEPLOY time
      // (syncEnvVars in trigger.config.ts), so this needs a Trigger redeploy, not just Vercel.
      const dispatchToken = process.env.GPU_WORKER_SECRET_KEY?.trim();
      if (!dispatchToken) {
        console.warn(
          "[twin dispatch] GPU_WORKER_SECRET_KEY missing — dispatching unauthenticated. " +
            "The worker still accepts this during phase-1 rollout but will reject it once " +
            "MODAL_DISPATCH_AUTH_REQUIRED is set.",
        );
      }

      const response = await fetch(getModalEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(dispatchToken ? { "x-dispatch-token": dispatchToken } : {}),
        },
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
      return { dispatched: true, jobId, assetCount: mediaAssets.length };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markJobFailed(supabase, jobId, `Modal dispatch error: ${message}`);
      throw err;
    }
  },
});
