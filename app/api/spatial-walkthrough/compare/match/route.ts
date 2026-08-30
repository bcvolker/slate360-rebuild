import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, serverError } from "@/lib/server/api-response";
import { parseCompareLocator } from "@/lib/spatial-walkthrough/compare-locator";
import { matchCandidates } from "@/lib/spatial-walkthrough/compare-match";
import { toChapter } from "@/lib/spatial-walkthrough/chapters";
import { toWaypoint } from "@/lib/spatial-walkthrough/waypoints";

export const runtime = "nodejs";

export const POST = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const source = parseCompareLocator(body?.source);
    const destId = typeof body?.destWalkthroughId === "string" ? body.destWalkthroughId : "";
    if (!source || !destId) return badRequest("source locator and destWalkthroughId required");
    const [srcCh, srcWp, destCh, destWp, destClips] = await Promise.all([
      admin.from("spatial_chapters").select("*").eq("walkthrough_id", source.walkthroughId).eq("org_id", orgId),
      admin.from("spatial_waypoints").select("*").eq("walkthrough_id", source.walkthroughId).eq("org_id", orgId),
      admin.from("spatial_chapters").select("*").eq("walkthrough_id", destId).eq("org_id", orgId),
      admin.from("spatial_waypoints").select("*").eq("walkthrough_id", destId).eq("org_id", orgId),
      admin.from("spatial_clips").select("id, duration_s").eq("walkthrough_id", destId).eq("org_id", orgId),
    ]);
    const err = srcCh.error ?? srcWp.error ?? destCh.error ?? destWp.error ?? destClips.error;
    if (err) return serverError(err.message);
    const asRow = (row: object) => row as Record<string, unknown>;
    const candidates = matchCandidates({
      source,
      sourceChapters: (srcCh.data ?? []).map(asRow).map(toChapter),
      sourceWaypoints: (srcWp.data ?? []).map(asRow).map(toWaypoint),
      destWalkthroughId: destId,
      destClips: (destClips.data ?? []).map((c) => ({ id: String(c.id), durationS: Number(c.duration_s ?? 0) })),
      destChapters: (destCh.data ?? []).map(asRow).map(toChapter),
      destWaypoints: (destWp.data ?? []).map(asRow).map(toWaypoint),
    });
    return ok({ candidates });
  }, "author");
