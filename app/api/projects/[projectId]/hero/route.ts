import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, unauthorized } from "@/lib/server/api-response";
import { loadPortalData } from "@/lib/spatial-walkthrough/portal-data";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

/** Creator-side project hero: same PortalData shape the client portal uses,
 * unfiltered (creator sees internal items too), posters served through the
 * authed media route rather than a token. */
export const GET = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId } = await ctx.params;
    const data = await loadPortalData(projectId, orgId, {
      mediaBase: (wt, clip) => `/api/spatial-walkthrough/${wt}/media?clip=${clip}&kind=poster`,
    });
    return ok(data);
  }, "view");
