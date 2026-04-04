import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, serverError, unauthorized } from "@/lib/server/api-response";
import { getTourScenes } from "@/lib/tours/queries";

export const runtime = "nodejs";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ tourId: string }> }) => {
  const { tourId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const scenes = await getTourScenes(admin, tourId);
      return ok(scenes);
    } catch (err: unknown) {
      console.error("[GET /api/tours/:id/scenes] Error:", err);
      return serverError("Failed to fetch scenes");
    }
  });
};
