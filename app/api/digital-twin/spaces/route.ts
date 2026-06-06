import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/server/api-response";
import { resolveDigitalTwinEntitlement } from "@/lib/twin/processing-entitlement";

export const runtime = "nodejs";

type CreateBody = {
  title: string;
  project_id: string;
};

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const entitlement = await resolveDigitalTwinEntitlement(admin, {
      userId: user.id,
      userEmail: user.email,
      orgId,
    });
    if (!entitlement.allowed) return forbidden("Digital Twin access required");

    const body = (await req.json().catch(() => null)) as CreateBody | null;
    const title = body?.title?.trim();
    const projectId = body?.project_id?.trim();
    if (!title || !projectId) return badRequest("title and project_id are required");

    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id, name, org_id, status")
      .eq("id", projectId)
      .eq("org_id", orgId)
      .eq("status", "active")
      .maybeSingle();

    if (projectError) return serverError(projectError.message);
    if (!project) return notFound("Project not found");

    const { data: space, error: insertError } = await admin
      .from("digital_twin_spaces")
      .insert({
        org_id: orgId,
        project_id: project.id,
        created_by: user.id,
        title,
        status: "draft",
      })
      .select("id, title, status, project_id, updated_at")
      .single();

    if (insertError || !space) {
      return serverError(insertError?.message ?? "Failed to create twin workspace");
    }

    return ok({
      space: {
        id: space.id,
        title: space.title,
        status: space.status,
        projectId: space.project_id,
        projectName: project.name,
        updatedAt: space.updated_at,
      },
    });
  });
