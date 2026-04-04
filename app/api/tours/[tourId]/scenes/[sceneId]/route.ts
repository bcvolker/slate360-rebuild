import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, serverError, unauthorized } from "@/lib/server/api-response";
import { deleteScene, getSceneForDeletion } from "@/lib/tours/queries";
import { deleteS3Objects, recoverOrgStorage } from "@/lib/s3-utils";

export const runtime = "nodejs";

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
