import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { isProjectDocumentType, toProjectDocument } from "@/lib/spatial-walkthrough/project-documents";

export const runtime = "nodejs";

export const GET = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) return badRequest("projectId required");
    const { data } = await admin.from("spatial_project_documents").select("*").eq("org_id", orgId).eq("project_id", projectId).order("created_at", { ascending: false });
    return ok({ documents: (data ?? []).map((row) => toProjectDocument(row as Record<string, unknown>)) });
  });

export const POST = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("Organization required");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const projectId = typeof body?.projectId === "string" ? body.projectId : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!projectId || !title) return badRequest("projectId and title required");
    const { data: project } = await admin.from("projects").select("id").eq("id", projectId).eq("org_id", orgId).maybeSingle();
    if (!project) return notFound("Project not found");
    const type = typeof body?.type === "string" && isProjectDocumentType(body.type) ? body.type : "other";
    const source = body?.sourceProvider === "procore" || body?.sourceProvider === "url" ? body.sourceProvider : "slatedrop";
    const { data: row, error } = await admin.from("spatial_project_documents").insert({
      org_id: orgId,
      project_id: projectId,
      type,
      title,
      slatedrop_id: typeof body?.slatedropId === "string" ? body.slatedropId : null,
      source_provider: source,
      source_external_id: typeof body?.sourceExternalId === "string" ? body.sourceExternalId : null,
      source_url: typeof body?.sourceUrl === "string" ? body.sourceUrl : null,
      created_by: user.id,
    }).select("*").single();
    if (error || !row) return serverError(error?.message ?? "document failed");
    return ok({ document: toProjectDocument(row as Record<string, unknown>) }, 201);
  }, "author");
