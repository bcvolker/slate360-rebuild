import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, serverError } from "@/lib/server/api-response";
import { datePairs } from "@/lib/spatial-walkthrough/compare-dates";

export const runtime = "nodejs";

export const GET = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) return badRequest("projectId required");
    const { data, error } = await admin
      .from("spatial_walkthroughs")
      .select("id, title, captured_at, status")
      .eq("org_id", orgId)
      .eq("project_id", projectId)
      .in("status", ["ready", "published"])
      .order("captured_at", { ascending: true });
    if (error) return serverError(error.message);
    const captures = (data ?? []).map((row) => ({
      walkthroughId: String(row.id),
      title: String(row.title),
      capturedAt: String(row.captured_at),
    }));
    return ok({ captures, pairs: datePairs(captures) });
  }, "view");
