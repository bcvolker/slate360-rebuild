/**
 * POST /api/digital-twin/spaces/[spaceId]/project
 *
 * Move a twin workspace (and every capture in it) to another project — the
 * "save this Quick Scan into a real project" action on the review screen.
 * Non-destructive: only project_id changes on the space and its captures; raw
 * files keep their SlateDrop home.
 *
 * Body: { projectId: string } — an active project in the same org.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";

type Ctx = { params: Promise<{ spaceId: string }> };

export const POST = (req: NextRequest, ctx: Ctx) =>
  withAppAuth("digital_twin", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { spaceId } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as { projectId?: string };
    if (!body.projectId) return badRequest("projectId is required");

    const { data: space } = await admin
      .from("digital_twin_spaces")
      .select("id, project_id")
      .eq("id", spaceId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!space) return notFound("Workspace not found");

    const { data: project } = await admin
      .from("projects")
      .select("id, name, status")
      .eq("id", body.projectId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!project) return notFound("Project not found");
    if (project.status !== "active") return badRequest("Project is not active");

    if (space.project_id === project.id) {
      return ok({ moved: false, projectId: project.id, projectName: project.name });
    }

    const { error: spaceError } = await admin
      .from("digital_twin_spaces")
      .update({ project_id: project.id })
      .eq("id", space.id)
      .eq("org_id", orgId);
    if (spaceError) return serverError(spaceError.message);

    const { error: captureError } = await admin
      .from("digital_twin_captures")
      .update({ project_id: project.id })
      .eq("space_id", space.id)
      .eq("org_id", orgId);
    if (captureError) return serverError(captureError.message);

    return ok({ moved: true, projectId: project.id, projectName: project.name });
  });
