import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, serverError } from "@/lib/server/api-response";
import { DEFAULT_OPERATOR_PATCH } from "@/lib/spatial-walkthrough/types";
import { shareStatusFromRows } from "@/lib/spatial-walkthrough/share-status";
import { toChapter } from "@/lib/spatial-walkthrough/chapters";
import { spaceLibraryCards } from "@/lib/spatial-walkthrough/space-cards";

export const runtime = "nodejs";

export const GET = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const projectId = req.nextUrl.searchParams.get("projectId");
    let q = admin
      .from("spatial_walkthroughs")
      .select("id, project_id, title, captured_at, building, floor, zone, walkthrough_type, status, duration_s, created_at")
      .eq("org_id", orgId)
      .order("captured_at", { ascending: false });
    if (projectId) q = q.eq("project_id", projectId);
    const { data, error } = await q;
    if (error) return serverError(error.message);

    const ids = (data ?? []).map((w) => w.id);
    const [{ data: wps }, { data: pins }, { data: shares }, { data: chapterRows }] = await Promise.all([
      ids.length
        ? admin.from("spatial_waypoints").select("walkthrough_id").in("walkthrough_id", ids)
        : Promise.resolve({ data: [] as { walkthrough_id: string }[] }),
      ids.length
        ? admin.from("spatial_pins").select("walkthrough_id").in("walkthrough_id", ids)
        : Promise.resolve({ data: [] as { walkthrough_id: string }[] }),
      ids.length
        ? admin.from("spatial_share_tokens").select("walkthrough_id, is_revoked, expires_at").in("walkthrough_id", ids)
        : Promise.resolve({ data: [] as { walkthrough_id: string; is_revoked: boolean; expires_at: string | null }[] }),
      ids.length
        ? admin.from("spatial_chapters").select("*").in("walkthrough_id", ids).order("sort_order")
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);
    const wpCount = new Map<string, number>();
    const pinCount = new Map<string, number>();
    const shareRows = new Map<string, Array<{ is_revoked: boolean; expires_at: string | null }>>();
    for (const row of wps ?? []) wpCount.set(row.walkthrough_id, (wpCount.get(row.walkthrough_id) ?? 0) + 1);
    for (const row of pins ?? []) {
      if (row.walkthrough_id) pinCount.set(row.walkthrough_id, (pinCount.get(row.walkthrough_id) ?? 0) + 1);
    }
    for (const row of shares ?? []) {
      const list = shareRows.get(row.walkthrough_id) ?? [];
      list.push({ is_revoked: row.is_revoked, expires_at: row.expires_at });
      shareRows.set(row.walkthrough_id, list);
    }

    const walkthroughs = (data ?? []).map((w) => ({
      ...w,
      waypointCount: wpCount.get(w.id) ?? 0,
      pinCount: pinCount.get(w.id) ?? 0,
      shareStatus: shareStatusFromRows(shareRows.get(w.id) ?? []),
    }));
    return ok({
      walkthroughs,
      spaces: spaceLibraryCards(walkthroughs, (chapterRows ?? []).map(toChapter)),
    });
  }, "view");

export const POST = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("Organization required");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const projectId = typeof body?.projectId === "string" ? body.projectId : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!projectId || !title) return badRequest("projectId and title are required");

    const { data: project } = await admin
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!project) return badRequest("Project not found");

    const { data, error } = await admin
      .from("spatial_walkthroughs")
      .insert({
        org_id: orgId,
        project_id: projectId,
        created_by: user.id,
        title,
        captured_at: typeof body?.capturedAt === "string" ? body.capturedAt : new Date().toISOString(),
        building: typeof body?.building === "string" ? body.building : null,
        floor: typeof body?.floor === "string" ? body.floor : null,
        zone: typeof body?.zone === "string" ? body.zone : null,
        walkthrough_type: body?.walkthroughType ?? "interior",
        operator_patch: DEFAULT_OPERATOR_PATCH,
      })
      .select("*")
      .single();
    if (error) return serverError(error.message);
    return ok({ walkthrough: data }, 201);
  }, "author");
