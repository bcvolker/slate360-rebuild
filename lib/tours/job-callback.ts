import type { SupabaseClient } from "@supabase/supabase-js";

export type TourWorkerDerivative = {
  type: "thumbnail" | "normalized" | "tiles_manifest";
  key: string;
  width?: number;
  height?: number;
};

export type TourWorkerCallbackPayload = {
  jobId: string;
  sceneId: string;
  status: "progress" | "completed" | "failed";
  progressPct?: number;
  stage?: string;
  width?: number;
  height?: number;
  derivatives?: TourWorkerDerivative[];
  errorLog?: string;
};

export type TourJobCallbackResult = { ok: boolean; status?: number; error?: string; idempotent?: boolean };

/**
 * Applies a Modal tour-ingest worker callback: records derivatives and flips the scene
 * from processing -> ready (or failed). Idempotent on completed jobs.
 */
export async function handleTourJobCallback(
  admin: SupabaseClient,
  body: TourWorkerCallbackPayload,
): Promise<TourJobCallbackResult> {
  const { data: job } = await admin
    .from("tour_processing_jobs")
    .select("id, tour_id, scene_id, status")
    .eq("id", body.jobId)
    .maybeSingle();
  if (!job) return { ok: false, status: 404, error: "Job not found" };

  if (body.status === "progress") {
    await admin
      .from("tour_processing_jobs")
      .update({ status: "processing", progress_pct: body.progressPct ?? 0, stage: body.stage ?? null })
      .eq("id", job.id);
    return { ok: true };
  }

  if (body.status === "failed") {
    await admin
      .from("tour_processing_jobs")
      .update({ status: "failed", error_log: body.errorLog ?? "Ingest failed", progress_pct: 0 })
      .eq("id", job.id);
    if (job.scene_id) {
      await admin
        .from("tour_scenes")
        .update({ status: "failed", processing_error: body.errorLog ?? "Ingest failed" })
        .eq("id", job.scene_id);
    }
    return { ok: true };
  }

  // completed
  if (job.status === "ready") return { ok: true, idempotent: true };

  const sceneId = job.scene_id ?? body.sceneId;
  const derivs = body.derivatives ?? [];

  if (sceneId && derivs.length) {
    const types = derivs.map((d) => d.type);
    await admin
      .from("tour_scene_derivatives")
      .delete()
      .eq("scene_id", sceneId)
      .in("derivative_type", types);

    await admin.from("tour_scene_derivatives").insert(
      derivs.map((d) => ({
        scene_id: sceneId,
        tour_id: job.tour_id,
        derivative_type: d.type,
        storage_key: d.key,
        width: d.width ?? null,
        height: d.height ?? null,
        format: d.type === "tiles_manifest" ? "application/json" : "image/jpeg",
      })),
    );

    const thumb = derivs.find((d) => d.type === "thumbnail");
    const tiles = derivs.find((d) => d.type === "tiles_manifest");
    await admin
      .from("tour_scenes")
      .update({
        status: "ready",
        processing_error: null,
        ...(thumb ? { thumbnail_path: thumb.key } : {}),
        ...(tiles ? { multires_manifest_path: tiles.key } : {}),
      })
      .eq("id", sceneId);
  }

  await admin
    .from("tour_processing_jobs")
    .update({ status: "ready", progress_pct: 100, stage: "complete" })
    .eq("id", job.id);

  return { ok: true };
}
