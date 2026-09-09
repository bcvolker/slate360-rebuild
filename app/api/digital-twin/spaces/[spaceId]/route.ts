/**
 * PATCH  /api/digital-twin/spaces/[spaceId]   { title }   — rename a twin.
 * DELETE /api/digital-twin/spaces/[spaceId]               — soft-delete a twin
 *        and its captures (blobs stay; the R2 cleanup cron owns those).
 *
 * The title is the one name every surface shows (home, project list, twin
 * page, share header), so renaming here is the only rename there is.
 */
import { NextRequest } from "next/server";

import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { normalizeTwinTitle, TWIN_TITLE_MAX } from "@/lib/twin/twin-title";

type Ctx = { params: Promise<{ spaceId: string }> };

export const PATCH = (req: NextRequest, ctx: Ctx) =>
  withAppAuth("digital_twin", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { spaceId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    const title = normalizeTwinTitle(body.title);
    if (!title) return badRequest(`title is required (1–${TWIN_TITLE_MAX} characters)`);

    const { data: space } = await admin
      .from("digital_twin_spaces")
      .select("id, title")
      .eq("id", spaceId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!space) return notFound("Twin not found");
    if (space.title === title) return ok({ renamed: false, title });

    const { error } = await admin
      .from("digital_twin_spaces")
      .update({ title })
      .eq("id", space.id)
      .eq("org_id", orgId);
    if (error) return serverError(error.message);
    return ok({ renamed: true, title });
  });

export const DELETE = (req: NextRequest, ctx: Ctx) =>
  withAppAuth("digital_twin", req, async ({ admin, orgId, user }) => {
    if (!orgId) return badRequest("Organization context required");
    const { spaceId } = await ctx.params;

    const { data: space } = await admin
      .from("digital_twin_spaces")
      .select("id")
      .eq("id", spaceId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!space) return notFound("Twin not found");

    const { count: activeJobs } = await admin
      .from("digital_twin_processing_jobs")
      .select("id", { count: "exact", head: true })
      .eq("space_id", space.id)
      .eq("org_id", orgId)
      .in("status", ["queued", "processing"]);
    if ((activeJobs ?? 0) > 0) return badRequest("This twin is being processed. Wait for it to finish, then delete.");

    const stamp = { deleted_at: new Date().toISOString(), deleted_by: user.id };
    const { error: captureError } = await admin
      .from("digital_twin_captures")
      .update(stamp)
      .eq("space_id", space.id)
      .eq("org_id", orgId)
      .is("deleted_at", null);
    if (captureError) return serverError(captureError.message);

    const { error: spaceError } = await admin
      .from("digital_twin_spaces")
      .update({ ...stamp, status: "archived" })
      .eq("id", space.id)
      .eq("org_id", orgId);
    if (spaceError) return serverError(spaceError.message);
    return ok({ deleted: true });
  });
