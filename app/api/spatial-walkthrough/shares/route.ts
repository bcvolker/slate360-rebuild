import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, unauthorized, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

export const GET = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) return ok({ shares: [] });

    const { data: walkthroughs, error: wtError } = await admin
      .from("spatial_walkthroughs")
      .select("id, title")
      .eq("org_id", orgId)
      .eq("project_id", projectId);
    if (wtError) return serverError(wtError.message);

    const ids = (walkthroughs ?? []).map((w) => w.id);
    if (ids.length === 0) return ok({ shares: [] });

    const titles = new Map((walkthroughs ?? []).map((w) => [w.id, w.title as string]));
    const { data, error } = await admin
      .from("spatial_share_tokens")
      .select("id, walkthrough_id, token, policy, is_revoked, allow_download, expires_at")
      .eq("org_id", orgId)
      .in("walkthrough_id", ids)
      .order("created_at", { ascending: false });
    if (error) return serverError(error.message);

    return ok({
      shares: (data ?? []).map((row) => ({
        ...row,
        walkthroughTitle: titles.get(row.walkthrough_id) ?? "Walkthrough",
      })),
    });
  }, "view");
