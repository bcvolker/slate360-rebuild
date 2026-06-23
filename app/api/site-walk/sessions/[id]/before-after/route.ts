/**
 * POST /api/site-walk/sessions/[id]/before-after
 *
 * Builds a Before/After (progression) deliverable from the walk's Ghost-mode
 * pairs. "After" anchors are items in this session with item_relationship in
 * ('after','progress') and a before_item_id; the referenced "before" item may
 * live in a different (earlier) walk, so it's fetched org-scoped by id.
 *
 * Produces a click-through Before → After deck (templated ViewerItem[]); no
 * image bytes are embedded in-request, consistent with the other light-lift
 * generators.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import {
  buildBeforeAfterContent,
  type BeforeAfterItem,
  type BeforeAfterPair,
} from "@/lib/site-walk/before-after";

const ITEM_FIELDS =
  "id, title, description, s3_key, item_type, created_at, location_label, before_item_id, item_relationship";

function toItem(r: Record<string, unknown>): BeforeAfterItem {
  return {
    id: r.id as string,
    title: (r.title as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    s3_key: (r.s3_key as string | null) ?? null,
    item_type: r.item_type as string,
    created_at: r.created_at as string,
    location_label: (r.location_label as string | null) ?? null,
  };
}

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id: sessionId } = await ctx.params;

    const { data: session } = await admin
      .from("site_walk_sessions")
      .select("id, title, project_id")
      .eq("id", sessionId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!session) return notFound("Session not found");

    // "After" anchors captured in this walk.
    let anchorQuery = admin
      .from("site_walk_items")
      .select(ITEM_FIELDS)
      .eq("session_id", sessionId)
      .eq("org_id", orgId)
      .in("item_relationship", ["after", "progress"])
      .not("before_item_id", "is", null);
    anchorQuery = excludeDeletedSiteWalkItems(anchorQuery);

    const { data: anchorRows, error: anchorErr } = await anchorQuery.order("created_at", {
      ascending: true,
    });
    if (anchorErr) return serverError(anchorErr.message);

    const anchors = (anchorRows ?? []) as Array<Record<string, unknown>>;
    const beforeIds = Array.from(
      new Set(anchors.map((r) => r.before_item_id as string).filter(Boolean)),
    );

    if (beforeIds.length === 0) {
      return badRequest(
        "No before/after pairs in this walk yet. Use Ghost mode to re-capture a prior photo, then generate this again.",
      );
    }

    // "Before" items may be in earlier walks — fetch org-scoped by id.
    let beforeQuery = admin
      .from("site_walk_items")
      .select(ITEM_FIELDS)
      .eq("org_id", orgId)
      .in("id", beforeIds);
    beforeQuery = excludeDeletedSiteWalkItems(beforeQuery);

    const { data: beforeRows, error: beforeErr } = await beforeQuery;
    if (beforeErr) return serverError(beforeErr.message);

    const beforeById = new Map<string, BeforeAfterItem>();
    for (const r of (beforeRows ?? []) as Array<Record<string, unknown>>) {
      beforeById.set(r.id as string, toItem(r));
    }

    const pairs: BeforeAfterPair[] = [];
    for (const r of anchors) {
      const before = beforeById.get(r.before_item_id as string);
      if (!before) continue;
      pairs.push({
        before,
        after: toItem(r),
        relationship: (r.item_relationship as string) ?? "after",
      });
    }

    if (pairs.length === 0) {
      return badRequest("Before/after links were found, but the prior items are no longer available.");
    }

    const content = buildBeforeAfterContent(session.title ?? "", pairs);
    const title = `Before / after — ${session.title || "Untitled walk"} — ${new Date().toLocaleDateString()}`;

    const { data: deliverable, error: insertErr } = await admin
      .from("site_walk_deliverables")
      .insert({
        session_id: sessionId,
        org_id: orgId,
        project_id: session.project_id ?? null,
        created_by: user.id,
        title,
        deliverable_type: "report",
        status: "draft",
        content,
        output_mode: "presentation",
      })
      .select("id")
      .single();

    if (insertErr || !deliverable) {
      return serverError(insertErr?.message ?? "Failed to create deliverable");
    }

    return ok({ deliverable_id: deliverable.id, pair_count: pairs.length });
  });
