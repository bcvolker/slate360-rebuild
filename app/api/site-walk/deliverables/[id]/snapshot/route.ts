/**
 * POST /api/site-walk/deliverables/[id]/snapshot — create immutable history snapshot
 * GET  /api/site-walk/deliverables/[id]/snapshot — list snapshots
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { createDeliverableSnapshot } from "@/lib/site-walk/deliverable-snapshots";
import type { IdRouteContext } from "@/lib/types/api";

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const snapshot = await createDeliverableSnapshot(admin, {
      deliverableId: id,
      orgId,
      userId: user.id,
    });
    if (!snapshot) return serverError("Could not snapshot deliverable");

    return ok({ snapshot });
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
