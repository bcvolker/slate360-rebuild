/**
 * GET    /api/site-walk/sessions/[id]  — get a single session
 * PATCH  /api/site-walk/sessions/[id]  — update session title/status/metadata
 * DELETE /api/site-walk/sessions/[id]  — archive a session (soft)
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import type { UpdateSessionPayload, SiteWalkSessionStatus } from "@/lib/types/site-walk";

const VALID_STATUSES: SiteWalkSessionStatus[] = [
  "draft",
  "in_progress",
  "completed",
  "archived",
];

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data, error } = await admin
      .from("site_walk_sessions")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (error || !data) return notFound("Session not found");
    return ok({ session: data });
  });

export const PATCH = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const body = (await req.json()) as UpdateSessionPayload;
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      if (!body.title.trim()) return badRequest("title cannot be empty");
      updates.title = body.title.trim();
    }
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
      }
      updates.status = body.status;
      if (body.status === "in_progress") updates.started_at = new Date().toISOString();
      if (body.status === "completed") updates.completed_at = new Date().toISOString();
    }
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    if (Object.keys(updates).length === 0) {
      return badRequest("No valid fields to update");
    }

    const { data, error } = await admin
      .from("site_walk_sessions")
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Session not found");
    return ok({ session: data });
  });

/**
 * DELETE /api/site-walk/sessions/[id]
 *
 * Two behaviours:
 *   - body.permanent !== true → soft archive (sets status='archived').
 *   - body.permanent === true → hard delete. Requires double-confirmation:
 *       body.confirmText === "DELETE" AND body.confirmName === session.title
 *     This mirrors DELETE /api/projects/[projectId] so the universal
 *     <DoubleDeleteModal> works against both endpoints unchanged.
 *
 * Access is org-scoped via withAppAuth + .eq("org_id", orgId).
 */
export const DELETE = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as {
      permanent?: boolean;
      confirmText?: string;
      confirmName?: string;
    };

    if (body.permanent === true) {
      const { data: existing } = await admin
        .from("site_walk_sessions")
        .select("id, title")
        .eq("id", id)
        .eq("org_id", orgId)
        .maybeSingle();

      if (!existing) return notFound("Session not found");

      if (body.confirmText !== "DELETE") {
        return badRequest("Type DELETE to confirm");
      }
      if ((body.confirmName ?? "").trim() !== (existing.title ?? "").trim()) {
        return badRequest("Session title confirmation does not match");
      }

      const { error: delErr } = await admin
        .from("site_walk_sessions")
        .delete()
        .eq("id", id)
        .eq("org_id", orgId);

      if (delErr) return serverError(delErr.message);
      return ok({ deleted: true });
    }

    // Default: soft archive.
    const { data, error } = await admin
      .from("site_walk_sessions")
      .update({ status: "archived" })
      .eq("id", id)
      .eq("org_id", orgId)
      .select("id")
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Session not found");
    return ok({ archived: true });
  });
