import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/server/api-response";
import { resolveDigitalTwinEntitlement } from "@/lib/twin/processing-entitlement";

export const runtime = "nodejs";

type PatchBody = { title?: string; project_id?: string };

/**
 * Rename a twin (space) and/or move it to another job. Moving only re-points
 * `digital_twin_spaces.project_id`; captures and models stay attached to the space.
 */
export const PATCH = (
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { spaceId } = await params;
    if (!spaceId) return badRequest("spaceId is required");

    const entitlement = await resolveDigitalTwinEntitlement(admin, {
      userId: user.id,
      userEmail: user.email,
      orgId,
    });
    if (!entitlement.allowed) return forbidden("Digital Twin access required");

    const body = (await req.json().catch(() => null)) as PatchBody | null;
    const title = body?.title?.trim();
    const projectId = body?.project_id?.trim();
    if (title !== undefined && (!title || title.length > 80)) return badRequest("title must be 1–80 characters");
    if (!title && !projectId) return badRequest("title or project_id is required");

    const patch: { title?: string; project_id?: string } = {};
    if (title) patch.title = title;

    let projectName: string | null = null;
    if (projectId) {
      const { data: project, error: projectError } = await admin
        .from("projects")
        .select("id, name")
        .eq("id", projectId)
        .eq("org_id", orgId)
        .eq("status", "active")
        .maybeSingle();
      if (projectError) return serverError(projectError.message);
      if (!project) return notFound("Project not found");
      patch.project_id = project.id;
      projectName = project.name;
    }

    const { data: space, error } = await admin
      .from("digital_twin_spaces")
      .update(patch)
      .eq("id", spaceId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .select("id, title, project_id")
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!space) return notFound("Space not found");
    return ok({ space: { id: space.id, title: space.title, projectId: space.project_id, projectName } });
  });
