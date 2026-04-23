/**
 * GET  /api/site-walk/pins?plan_id=... — list pins for a plan
 * POST /api/site-walk/pins — place a pin on a plan for an item
 *
 * The POST payload is the unified "long-press drop" body:
 *   { plan_id, item_id, x_pct, y_pct, pin_number?, pin_color?, markup_data? }
 *
 * The associated `item_id` is created separately via POST /api/site-walk/items
 * (which carries the title, notes, attachments). This route only places the
 * pin on the plan and stores any vector overlay data in `markup_data`.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { CreatePinPayload } from "@/lib/types/site-walk";
import { isMarkupData } from "@/lib/site-walk/markup-types";

export const GET = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const planId = req.nextUrl.searchParams.get("plan_id");
    if (!planId) return badRequest("plan_id is required");

    const { data, error } = await admin
      .from("site_walk_pins")
      .select("*")
      .eq("plan_id", planId)
      .eq("org_id", orgId)
      .order("pin_number", { ascending: true });

    if (error) return serverError(error.message);
    return ok({ pins: data ?? [] });
  });

export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json()) as CreatePinPayload;
    if (!body.plan_id || !body.item_id) {
      return badRequest("plan_id and item_id are required");
    }
    if (
      typeof body.x_pct !== "number" ||
      typeof body.y_pct !== "number" ||
      body.x_pct < 0 ||
      body.x_pct > 100 ||
      body.y_pct < 0 ||
      body.y_pct > 100
    ) {
      return badRequest("x_pct and y_pct must be numbers between 0 and 100");
    }
    if (body.markup_data !== undefined && !isMarkupData(body.markup_data)) {
      return badRequest("markup_data must match the MarkupData v1 schema");
    }

    const { data, error } = await admin
      .from("site_walk_pins")
      .insert({
        plan_id: body.plan_id,
        item_id: body.item_id,
        org_id: orgId,
        x_pct: body.x_pct,
        y_pct: body.y_pct,
        pin_number: body.pin_number ?? null,
        pin_color: body.pin_color ?? "blue",
        markup_data: body.markup_data ?? {},
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return badRequest("Item already pinned to this plan");
      return serverError(error.message);
    }
    return ok({ pin: data }, 201);
  });
