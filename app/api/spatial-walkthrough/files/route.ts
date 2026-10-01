import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, unauthorized, badRequest, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

export const GET = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) return badRequest("projectId required");
    const { data, error } = await admin
      .from("slatedrop_uploads")
      .select("id, file_name, file_type, file_size, created_at, s3_key")
      .eq("org_id", orgId)
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return serverError(error.message);
    return ok({ files: data ?? [] });
  }, "view");
