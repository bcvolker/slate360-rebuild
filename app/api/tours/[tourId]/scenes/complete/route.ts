import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized } from "@/lib/server/api-response";
import { createScene } from "@/lib/tours/queries";

export const runtime = "nodejs";

export const POST = async (req: NextRequest, { params }: { params: Promise<{ tourId: string }> }) => {
  const { tourId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const body = await req.json();
      const { title, s3Key, size } = body as { title: string; s3Key: string; size: number };
      if (!title || !s3Key || typeof size !== "number") {
        return badRequest("Missing required fields");
      }

      const newScene = await createScene(admin, { tourId, title, panoramaPath: s3Key, fileSizeBytes: size });

      // Quota tracking (non-fatal).
      const { error: rpcError } = await admin.rpc("increment_org_storage", {
        target_org_id: orgId,
        bytes_delta: size,
      });
      if (rpcError) {
        console.error("[tours/scenes/complete] quota increment failed:", rpcError);
      }

      // Enqueue cloud ingest (thumbnail + normalized derivatives) when configured. The
      // scene is fully usable meanwhile; if ingest isn't wired the scene stays 'ready'
      // and the viewer falls back to the original upload.
      let ingestQueued = false;
      if (process.env.MODAL_TOUR_ENDPOINT?.trim()) {
        try {
          await admin.from("tour_scenes").update({ status: "processing" }).eq("id", newScene.id);
          const { data: job } = await admin
            .from("tour_processing_jobs")
            .insert({
              tour_id: tourId,
              scene_id: newScene.id,
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
          console.error("[tours/scenes/complete] ingest enqueue failed:", err);
          await admin
            .from("tour_scenes")
            .update({ status: "ready", processing_error: null })
            .eq("id", newScene.id);
        }
      }

      return ok({ ...newScene, ingestQueued });
    } catch (err: unknown) {
      console.error("[POST /api/tours/:id/scenes/complete] Error:", err);
      return serverError("Failed to complete scene upload");
    }
  });
};
