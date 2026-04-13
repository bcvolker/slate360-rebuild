/**
 * POST /api/site-walk/deliverables/[id]/snapshot — create immutable history snapshot
 * GET  /api/site-walk/deliverables/[id]/snapshot — list snapshots
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data: del, error: dErr } = await admin
      .from("site_walk_deliverables")
      .select("title, content, status, deliverable_type")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (dErr || !del) return notFound("Deliverable not found");

    const { data, error } = await admin
      .from("site_walk_deliverable_snapshots")
      .insert({
        deliverable_id: id,
        org_id: orgId,
        snapshot_title: del.title,
        snapshot_content: del.content ?? [],
        snapshot_status: del.status,
        snapshot_type: del.deliverable_type,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return serverError(error.message);
    return ok({ snapshot: data });
  });

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data, error } = await admin
      .from("site_walk_deliverable_snapshots")
      .select("id, snapshot_title, snapshot_status, snapshot_type, created_by, created_at")
      .eq("deliverable_id", id)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok({ snapshots: data ?? [] });
  });
