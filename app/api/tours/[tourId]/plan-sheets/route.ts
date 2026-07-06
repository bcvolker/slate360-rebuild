import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, notFound, serverError, unauthorized } from "@/lib/server/api-response";
import { listProjectPlanSets } from "@/lib/tours/plan-sheets";

export const runtime = "nodejs";

// GET /api/tours/[tourId]/plan-sheets — the tour's project's available plan
// sets/sheets (for anchoring a plan-sheet tour), plus the tour's current
// plan_set_id if already anchored. Gated on tour_builder, not punchwalk —
// plan sheets are project-level assets any subscribed app can reference.
export const GET = async (req: NextRequest, { params }: { params: Promise<{ tourId: string }> }) => {
  const { tourId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const { data: tour } = await admin
        .from("project_tours")
        .select("id, project_id, plan_set_id")
        .eq("id", tourId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!tour) return notFound("Tour not found");

      const planSets = tour.project_id ? await listProjectPlanSets(admin, tour.project_id) : [];
      return ok({ planSetId: tour.plan_set_id, planSets });
    } catch (err) {
      console.error("[GET /api/tours/:tourId/plan-sheets] Error:", err);
      return serverError("Failed to load plan sheets");
    }
  });
};
