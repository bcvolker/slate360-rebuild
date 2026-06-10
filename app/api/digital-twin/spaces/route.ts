import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/server/api-response";
import { resolveDigitalTwinEntitlement } from "@/lib/twin/processing-entitlement";
import { resolveOrCreateQuickScanProject } from "@/lib/digital-twin/resolve-quick-scan-project";

export const runtime = "nodejs";

type CreateBody = {
  title: string;
  project_id?: string;
  quick_scan?: boolean;
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
    const quickScan = body?.quick_scan === true;
    const projectIdInput = body?.project_id?.trim();
    if (!title) return badRequest("title is required");
    if (!quickScan && !projectIdInput) return badRequest("project_id is required");

    let project: { id: string; name: string };
    if (quickScan) {
      project = await resolveOrCreateQuickScanProject(admin, orgId, user.id);
    } else {
      const { data: resolved, error: projectError } = await admin
        .from("projects")
        .select("id, name, org_id, status")
        .eq("id", projectIdInput!)
        .eq("org_id", orgId)
        .eq("status", "active")
        .maybeSingle();

      if (projectError) return serverError(projectError.message);
      if (!resolved) return notFound("Project not found");
      project = { id: resolved.id, name: resolved.name };
    }

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
