import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createScene } from "@/lib/tours/queries";

export type FinalizeSceneParams = {
  tourId: string;
  orgId: string;
  title: string;
  s3Key: string;
  size: number;
};

export type FinalizeSceneResult = {
  scene: Awaited<ReturnType<typeof createScene>>;
  ingestQueued: boolean;
};

/**
 * Creates the tour_scenes row for a just-uploaded panorama, meters org storage,
 * and enqueues the cloud ingest (tiling) job. Shared by the desktop single-shot
 * upload (`/scenes/complete`) and the mobile multipart upload (`/scenes/upload/
 * multipart/complete`) — both flows presign/upload first, then call this once
 * the bytes are actually in R2, exactly mirroring the original single-shot
 * sequencing (scene row doesn't exist until the upload is confirmed complete).
 */
export async function finalizeSceneUpload(
  admin: SupabaseClient,
  { tourId, orgId, title, s3Key, size }: FinalizeSceneParams,
): Promise<FinalizeSceneResult> {
  const scene = await createScene(admin, { tourId, title, panoramaPath: s3Key, fileSizeBytes: size });

  const { error: rpcError } = await admin.rpc("increment_org_storage", {
    target_org_id: orgId,
    bytes_delta: size,
  });
  if (rpcError) {
    console.error("[finalize-scene] quota increment failed:", rpcError);
  }

  // Enqueue cloud ingest (tiles + thumbnail + normalized derivatives) when
  // configured. The scene is fully usable meanwhile; if ingest isn't wired the
  // scene stays 'ready' and the viewer falls back to the original upload.
  let ingestQueued = false;
  if (process.env.MODAL_TOUR_ENDPOINT?.trim()) {
    try {
      await admin.from("tour_scenes").update({ status: "processing" }).eq("id", scene.id);
      const { data: job } = await admin
        .from("tour_processing_jobs")
        .insert({
          tour_id: tourId,
          scene_id: scene.id,
          org_id: orgId,
          job_type: "ingest",
          status: "queued",
          source_s3_key: s3Key,
        })
        .select("id")
        .single();

      if (job?.id) {
        const { tasks } = await import("@trigger.dev/sdk/v3");
        await tasks.trigger("tour.ingest", { jobId: job.id });
        ingestQueued = true;
      }
    } catch (err) {
      // Don't fail the upload — revert to a usable 'ready' scene.
      console.error("[finalize-scene] ingest enqueue failed:", err);
      await admin
        .from("tour_scenes")
        .update({ status: "ready", processing_error: null })
        .eq("id", scene.id);
    }
  }

  return { scene, ingestQueued };
}
