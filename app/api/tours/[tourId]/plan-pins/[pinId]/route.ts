import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError, unauthorized } from "@/lib/server/api-response";

export const runtime = "nodejs";

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string; pinId: string }> },
) => {
  const { tourId, pinId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const body = await req.json();
      const updates: Record<string, unknown> = {};
      if (typeof body.xPct === "number") updates.x_pct = body.xPct;
      if (typeof body.yPct === "number") updates.y_pct = body.yPct;
      if (typeof body.title === "string") updates.title = body.title.trim() || null;
      if (typeof body.sceneId === "string") updates.scene_id = body.sceneId;
      if (Object.keys(updates).length === 0) return badRequest("No updatable fields provided");

      const { data: pin, error } = await admin
        .from("tour_plan_pins")
        .update(updates)
        .eq("id", pinId)
        .eq("tour_id", tourId)
        .eq("org_id", orgId)
        .select("*")
        .maybeSingle();
      if (error) return serverError(error.message);
      if (!pin) return notFound("Plan pin not found");

      return ok(pin);
    } catch (err) {
      console.error("[PATCH /api/tours/:tourId/plan-pins/:pinId] Error:", err);
      return serverError("Failed to update plan pin");
    }
  });
};

export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string; pinId: string }> },
) => {
  const { tourId, pinId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const { error } = await admin
        .from("tour_plan_pins")
        .delete()
        .eq("id", pinId)
        .eq("tour_id", tourId)
        .eq("org_id", orgId);
      if (error) return serverError(error.message);
      return ok({ success: true });
    } catch (err) {
      console.error("[DELETE /api/tours/:tourId/plan-pins/:pinId] Error:", err);
      return serverError("Failed to delete plan pin");
    }
  });
};
