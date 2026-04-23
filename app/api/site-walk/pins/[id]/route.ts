/**
 * PATCH  /api/site-walk/pins/[id] — move / restyle / re-markup a pin
 * DELETE /api/site-walk/pins/[id] — remove a pin from a plan
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, notFound } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import type { UpdatePinPayload } from "@/lib/types/site-walk";
import { isMarkupData } from "@/lib/site-walk/markup-types";

export const PATCH = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const body = (await req.json()) as UpdatePinPayload;
    const update: Record<string, unknown> = {};

    if (body.x_pct !== undefined) {
      if (typeof body.x_pct !== "number" || body.x_pct < 0 || body.x_pct > 100) {
        return badRequest("x_pct must be a number between 0 and 100");
      }
      update.x_pct = body.x_pct;
    }
    if (body.y_pct !== undefined) {
      if (typeof body.y_pct !== "number" || body.y_pct < 0 || body.y_pct > 100) {
        return badRequest("y_pct must be a number between 0 and 100");
      }
      update.y_pct = body.y_pct;
    }
    if (body.pin_number !== undefined) update.pin_number = body.pin_number;
    if (body.pin_color !== undefined) update.pin_color = body.pin_color;
    if (body.markup_data !== undefined) {
      if (!isMarkupData(body.markup_data)) {
        return badRequest("markup_data must match the MarkupData v1 schema");
      }
      update.markup_data = body.markup_data;
    }

    if (Object.keys(update).length === 0) {
      return badRequest("No updatable fields provided");
    }

    const { data, error } = await admin
      .from("site_walk_pins")
      .update(update)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Pin not found");
    return ok({ pin: data });
  });

export const DELETE = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { error } = await admin
      .from("site_walk_pins")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) return serverError(error.message);
    return ok({ deleted: true });
  });
