import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized, notFound } from "@/lib/server/api-response";
import { getTourById, updateTour, deleteTour } from "@/lib/tours/queries";
import { deleteS3Objects, recoverOrgStorage } from "@/lib/s3-utils";

export const runtime = "nodejs";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ tourId: string }> }) => {
  const { tourId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const tour = await getTourById(admin, tourId, { orgId });
      if (!tour) return notFound("Not Found");

      return ok(tour);
    } catch (err: any) {
      console.error("[GET /api/tours/:id] Error:", err);
      return serverError("Failed to fetch tour");
    }
  });
};

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ tourId: string }> }) => {
  const { tourId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const body = await req.json();
      if (!body || Object.keys(body).length === 0) {
        return badRequest("Empty update body");
      }

      const updated = await updateTour(admin, tourId, body, { orgId });
      return ok(updated);
    } catch (err: any) {
      console.error("[PATCH /api/tours/:id] Error:", err);
      return serverError("Failed to update tour");
    }
  });
};

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ tourId: string }> }) => {
  const { tourId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      // Step 1: Delete from Database (Returns assets that need physical deletion)
      const { scenes, tour } = await deleteTour(admin, tourId, { orgId });

      // Step 2: Physically delete files from S3 to plug the margin leak
      const s3KeysToDelete: string[] = [];
      let bytesRecovered = 0;
      
      // Add logo (we'll estimate 1MB for now as tour row doesn't store logo size)
      if (tour?.logo_asset_path) {
        s3KeysToDelete.push(tour.logo_asset_path);
        bytesRecovered += 1048576;
      }
      
      // Add panoramas and thumbnails
      if (scenes && scenes.length > 0) {
        for (const scene of scenes) {
          if (scene.panorama_path) s3KeysToDelete.push(scene.panorama_path);
          if (scene.thumbnail_path) s3KeysToDelete.push(scene.thumbnail_path);
          bytesRecovered += (Number(scene.file_size_bytes) || 0);
        }
      }

      if (s3KeysToDelete.length > 0) {
        await deleteS3Objects(s3KeysToDelete);
        
        // Step 3: Exact Quota Recovery based on exact scene sizes!
        await recoverOrgStorage(orgId, bytesRecovered);
      }

      return ok({ success: true, deletedScenes: scenes?.length || 0 });
    } catch (err: any) {
      console.error("[DELETE /api/tours/:id] Error:", err);
      return serverError("Failed to delete tour");
    }
  });
};
