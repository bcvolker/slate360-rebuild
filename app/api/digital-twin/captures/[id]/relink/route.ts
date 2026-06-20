/**
 * POST /api/digital-twin/captures/[id]/relink
 *
 * Re-point an unsubmitted (draft/uploaded) capture to a different twin
 * workspace so its model lands in the right project. Safe / non-destructive:
 * only the capture's space_id + project_id change. Already-uploaded raw files
 * keep their original SlateDrop home (no files are moved or deleted).
 *
 * Body: { spaceId: string }  — an existing twin workspace in the same org.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, conflict, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("digital_twin", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as { spaceId?: string };
    if (!body.spaceId) return badRequest("spaceId is required");

    const { data: capture } = await admin
      .from("digital_twin_captures")
      .select("id, capture_status, space_id")
      .eq("id", id)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!capture) return notFound("Capture not found");
    if (!["draft", "uploaded"].includes(capture.capture_status ?? "")) {
      return conflict("Only unsubmitted captures can be moved to another workspace.");
    }

    const { data: space } = await admin
      .from("digital_twin_spaces")
      .select("id, project_id")
      .eq("id", body.spaceId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!space) return notFound("Target workspace not found");
    if (space.id === capture.space_id) return ok({ moved: false });

    const { error } = await admin
      .from("digital_twin_captures")
      .update({ space_id: space.id, project_id: space.project_id })
      .eq("id", id)
      .eq("org_id", orgId);
    if (error) return serverError(error.message);

    return ok({ moved: true, spaceId: space.id, projectId: space.project_id });
  });
