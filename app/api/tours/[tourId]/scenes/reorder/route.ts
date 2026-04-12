import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized } from "@/lib/server/api-response";

export const runtime = "nodejs";

/** PATCH /api/tours/[tourId]/scenes/reorder — bulk update sort_order */
export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) => {
  const { tourId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const body = await req.json();
      const { sceneIds } = body as { sceneIds: string[] };

      if (!Array.isArray(sceneIds) || sceneIds.length === 0) {
        return badRequest("sceneIds must be a non-empty array");
      }

      // Verify all scenes belong to this tour
      const { data: existing } = await admin
        .from("tour_scenes")
        .select("id")
        .eq("tour_id", tourId);

      const existingIds = new Set((existing ?? []).map((s) => s.id));
      for (const id of sceneIds) {
        if (!existingIds.has(id)) return badRequest(`Scene ${id} not found in tour`);
      }

      // Update sort_order for each scene sequentially
      for (let i = 0; i < sceneIds.length; i++) {
        const { error } = await admin
          .from("tour_scenes")
          .update({ sort_order: i + 1 })
          .eq("id", sceneIds[i])
          .eq("tour_id", tourId);
        if (error) throw error;
      }

      return ok({ success: true });
    } catch (err: unknown) {
      console.error("[PATCH /api/tours/:id/scenes/reorder] Error:", err);
      return serverError("Failed to reorder scenes");
    }
  });
};
