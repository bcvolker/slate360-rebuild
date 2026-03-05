import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

type Ctx = { params: Promise<{ eventId: string }> };

export const PATCH = (req: NextRequest, ctx: Ctx) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("No organization found");
    const { eventId } = await ctx.params;

    const body = await req.json() as {
      title?: string;
      date?: string;
      start_time?: string | null;
      end_time?: string | null;
      color?: string;
      description?: string | null;
      location?: string | null;
      project_id?: string | null;
      all_day?: boolean;
    };

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.date !== undefined) updates.date = body.date;
    if (body.start_time !== undefined) updates.start_time = body.start_time;
    if (body.end_time !== undefined) updates.end_time = body.end_time;
    if (body.color !== undefined) updates.color = body.color;
    if (body.description !== undefined) updates.description = body.description;
    if (body.location !== undefined) updates.location = body.location;
    if (body.project_id !== undefined) updates.project_id = body.project_id;
    if (body.all_day !== undefined) updates.all_day = body.all_day;

    const { data, error } = await admin
      .from("calendar_events")
      .update(updates)
      .eq("id", eventId)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return serverError(error.message);
    return ok({ event: data });
  });

export const DELETE = (req: NextRequest, ctx: Ctx) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("No organization found");
    const { eventId } = await ctx.params;

    const { error } = await admin
      .from("calendar_events")
      .delete()
      .eq("id", eventId)
      .eq("org_id", orgId);

    if (error) return serverError(error.message);
    return ok({ deleted: true });
  });
