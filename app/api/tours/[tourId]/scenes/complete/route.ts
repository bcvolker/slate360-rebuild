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
      const { title, s3Key, size } = body as {
        title: string;
        s3Key: string;
        size: number;
      };

      if (!title || !s3Key || typeof size !== "number") {
        return badRequest("Missing required fields");
      }

      // Insert the scene into the database
      const newScene = await createScene(admin, {
        tourId,
        title,
        panoramaPath: s3Key,
        fileSizeBytes: size,
      });

      // Increment storage quota using our RPC
      const { error: rpcError } = await admin.rpc("increment_org_storage", {
        target_org_id: orgId,
        bytes_delta: size,
      });

      if (rpcError) {
        console.error("[POST /api/tours/:id/scenes/complete] Failed to increment quota:", rpcError);
        // We don't fail the request if quota tracking fails, but we log it.
      }

      return ok(newScene);
    } catch (err: any) {
      console.error("[POST /api/tours/:id/scenes/complete] Error:", err);
      return serverError("Failed to complete scene upload");
    }
  });
};
