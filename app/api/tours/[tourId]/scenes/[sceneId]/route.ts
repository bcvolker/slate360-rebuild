import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError, unauthorized } from "@/lib/server/api-response";
import { deleteScene, getSceneForDeletion } from "@/lib/tours/queries";
import { deleteS3Objects, recoverOrgStorage } from "@/lib/s3-utils";

export const runtime = "nodejs";

// Columns the author may set per scene (start view, keep-out limits, camera, title).
const SCENE_PATCH_FIELDS = [
  "title", "sort_order",
  "initial_yaw", "initial_pitch", "initial_fov", "default_zoom",
  "min_fov", "max_fov", "autorotate", "view_limits", "scene_kind",
] as const;

// PATCH /api/tours/[tourId]/scenes/[sceneId] — save start view / restrict view / title.
export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ tourId: string; sceneId: string }> }) => {
  const { tourId, sceneId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");
    try {
      const { data: tour } = await admin
        .from("project_tours").select("id").eq("id", tourId).eq("org_id", orgId).maybeSingle();
      if (!tour) return notFound("Tour not found");

      const body = (await req.json()) as Record<string, unknown>;
      const updates: Record<string, unknown> = {};
      for (const k of SCENE_PATCH_FIELDS) {
        if (k in body) updates[k] = body[k];
      }
      if (Object.keys(updates).length === 0) return badRequest("No updatable fields provided");

      const { data, error } = await admin
        .from("tour_scenes").update(updates).eq("id", sceneId).eq("tour_id", tourId).select("*").maybeSingle();
      if (error) return serverError(error.message);
      if (!data) return notFound("Scene not found");
      return ok(data);
    } catch (err: unknown) {
      console.error("[PATCH /api/tours/:tourId/scenes/:sceneId] Error:", err);
      return serverError("Failed to update scene");
    }
  });
};

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ tourId: string; sceneId: string }> }) => {
  const { tourId, sceneId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      // Step 1: Collect asset paths (query only)
      const scene = await getSceneForDeletion(admin, sceneId, tourId);

      // Step 2: Delete from S3 BEFORE touching the DB
      const s3KeysToDelete: string[] = [];
      if (scene.panoramaPath) s3KeysToDelete.push(scene.panoramaPath);
      if (scene.thumbnailPath) s3KeysToDelete.push(scene.thumbnailPath);
      
      if (s3KeysToDelete.length > 0) {
        await deleteS3Objects(s3KeysToDelete);
      }

      // Step 3: S3 succeeded — safe to delete DB row
      await deleteScene(admin, sceneId, tourId);

      // Step 4: Recover quota
      const recoveredBytes = Number(scene.fileSizeBytes) || 0;
      if (recoveredBytes > 0) {
        await recoverOrgStorage(orgId, recoveredBytes);
      }

      return ok({ success: true, sceneId: scene.id });
    } catch (err: unknown) {
      console.error("[DELETE /api/tours/:tourId/scenes/:sceneId] Error:", err);
      return serverError("Failed to delete scene");
    }
  });
};
