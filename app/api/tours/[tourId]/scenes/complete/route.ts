import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized } from "@/lib/server/api-response";
import { finalizeSceneUpload } from "@/lib/tours/finalize-scene";

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

      const { scene, ingestQueued } = await finalizeSceneUpload(admin, { tourId, orgId, title, s3Key, size });

      return ok({ ...scene, ingestQueued });
    } catch (err: unknown) {
      console.error("[POST /api/tours/:id/scenes/complete] Error:", err);
      return serverError("Failed to complete scene upload");
    }
  });
};
