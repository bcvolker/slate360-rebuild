import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/server/rate-limit";
import {
  loadProjectShareRow,
  shareDenied,
  projectSharePasswordOk,
  recordProjectShareView,
  recordPortalAudit,
} from "@/lib/spatial-walkthrough/project-share";
import { sessionUnlocksShare } from "@/lib/spatial-walkthrough/share-session";
import { publicShareDenial } from "@/lib/spatial-walkthrough/share-token";
import { loadPortalData } from "@/lib/spatial-walkthrough/portal-data";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string }> };

const checkRateLimit = createRateLimiter("portal:resolve", 30, 60);

function passwordFrom(req: NextRequest): string | null {
  return req.headers.get("x-portal-pass") || req.nextUrl.searchParams.get("code");
}

/**
 * Public client-portal resolver. Same denial shape on "not found", "expired",
 * "revoked" and "wrong password" (bar the explicit needsPassword flag) so a
 * guesser cannot distinguish a dead link from a live one by response shape.
 */
export const GET = async (req: NextRequest, ctx: Ctx) => {
  const limited = await checkRateLimit(req);
  if (limited) return limited;
  const { token } = await ctx.params;
  const { admin, row, grants } = await loadProjectShareRow(token);
  if (shareDenied(row) || !row) return NextResponse.json(publicShareDenial(), { status: 404 });

  const unlocked = sessionUnlocksShare({ req, tokenHash: row.token_hash, passwordHash: row.password_hash });
  if (!unlocked && !projectSharePasswordOk(row, passwordFrom(req))) {
    return NextResponse.json({ ...publicShareDenial(), needsPassword: true }, { status: 401 });
  }

  const data = await loadPortalData(row.project_id, row.org_id, {
    mediaBase: (wt, clip) => `/api/portal/${token}/media?wt=${wt}&clip=${clip}&kind=poster`,
    visibleTo: { visibilities: grants.visible_item_visibilities, includeInternal: grants.can_see_internal_items },
  });
  if (!grants.can_see_documents) data.documents = [];

  await recordProjectShareView(admin, row.id, row.view_count);
  await recordPortalAudit(admin, { orgId: row.org_id, projectId: row.project_id, shareId: row.id, event: "portal_opened" });

  return NextResponse.json({
    project: data.project,
    brand: data.brand,
    companyName: data.companyName,
    hero: data.hero,
    epochs: data.epochs,
    twin: data.twin,
    compareAvailable: data.compareAvailable && data.epochs.length >= 2,
    items: data.items,
    documents: data.documents,
    permissions: {
      canComment: grants.can_comment,
      canCreateItems: grants.can_create_items,
      canSeeDocuments: grants.can_see_documents,
      canMeasure: grants.can_measure,
      allowDownload: row.allow_download,
    },
  });
};
