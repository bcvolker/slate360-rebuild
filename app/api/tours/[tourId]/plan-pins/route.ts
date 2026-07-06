import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError, unauthorized } from "@/lib/server/api-response";

export const runtime = "nodejs";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ tourId: string }> }) => {
  const { tourId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const { data: pins, error } = await admin
        .from("tour_plan_pins")
        .select("*")
        .eq("tour_id", tourId)
        .eq("org_id", orgId)
        .order("sort_order", { ascending: true });
      if (error) return serverError(error.message);
      return ok(pins ?? []);
    } catch (err) {
      console.error("[GET /api/tours/:tourId/plan-pins] Error:", err);
      return serverError("Failed to load plan pins");
    }
  });
};

export const POST = async (req: NextRequest, { params }: { params: Promise<{ tourId: string }> }) => {
  const { tourId } = await params;
  return withAppAuth("tour_builder", req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("User has no organization");

    try {
      const body = await req.json();
      const { planSheetId, sceneId, xPct, yPct, title } = body as {
        planSheetId: string; sceneId: string; xPct: number; yPct: number; title?: string;
      };
      if (!planSheetId || !sceneId || typeof xPct !== "number" || typeof yPct !== "number") {
        return badRequest("planSheetId, sceneId, xPct, and yPct are required");
      }

      const { data: tour } = await admin
        .from("project_tours")
        .select("id")
        .eq("id", tourId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!tour) return notFound("Tour not found");

      const { data: scene } = await admin
        .from("tour_scenes")
        .select("id")
        .eq("id", sceneId)
        .eq("tour_id", tourId)
        .maybeSingle();
      if (!scene) return badRequest("scene does not belong to this tour");

      const { data: maxPin } = await admin
        .from("tour_plan_pins")
        .select("pin_number, sort_order")
        .eq("plan_sheet_id", planSheetId)
        .order("pin_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextPinNumber = (maxPin?.pin_number ?? 0) + 1;
      const nextSortOrder = (maxPin?.sort_order ?? -1) + 1;

      const { data: pin, error } = await admin
        .from("tour_plan_pins")
        .insert({
          org_id: orgId,
          tour_id: tourId,
          plan_sheet_id: planSheetId,
          scene_id: sceneId,
          x_pct: xPct,
          y_pct: yPct,
          pin_number: nextPinNumber,
          sort_order: nextSortOrder,
          title: title?.trim() || null,
        })
        .select("*")
        .single();
      if (error) return serverError(error.message);

      return ok(pin, 201);
    } catch (err) {
      console.error("[POST /api/tours/:tourId/plan-pins] Error:", err);
      return serverError("Failed to create plan pin");
    }
  });
};
