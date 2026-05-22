/**
 * GET /api/site-walk/items/timeline
 *
 * Chronological item feed for Ghost Mode location history (Prompt 6).
 * Query: session_id | project_id | plan_sheet_id (at least one required)
 * Optional: limit (default 50, max 100), include_authors=true
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { enrichNearbyItemsWithAuthors } from "@/lib/site-walk/enrich-nearby-items";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";

export const GET = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    const projectId = searchParams.get("project_id");
    const planSheetId = searchParams.get("plan_sheet_id");
    const includeAuthors = searchParams.get("include_authors") === "true";
    const limit = Math.min(Number(searchParams.get("limit") ?? "50") || 50, 100);

    if (!sessionId && !projectId && !planSheetId) {
      return badRequest("Provide session_id, project_id, or plan_sheet_id");
    }

    try {
      if (planSheetId) {
        const { data: pins, error: pinError } = await admin
          .from("site_walk_pins")
          .select("item_id")
          .eq("org_id", orgId)
          .eq("plan_sheet_id", planSheetId)
          .not("item_id", "is", null);

        if (pinError) return serverError(pinError.message);

        const itemIds = Array.from(
          new Set((pins ?? []).map((p) => p.item_id).filter((id): id is string => Boolean(id))),
        );

        if (itemIds.length === 0) return ok({ items: [], count: 0 });

        let query = admin.from("site_walk_items").select("*").eq("org_id", orgId).in("id", itemIds);
        query = excludeDeletedSiteWalkItems(query);
        if (sessionId) query = query.eq("session_id", sessionId);
        if (projectId) query = query.eq("project_id", projectId);

        const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
        if (error) return serverError(error.message);

        const items = includeAuthors ? await enrichNearbyItemsWithAuthors(admin, data ?? []) : (data ?? []);
        return ok({ items, count: items.length });
      }

      let query = admin.from("site_walk_items").select("*").eq("org_id", orgId);
      query = excludeDeletedSiteWalkItems(query);
      if (sessionId) query = query.eq("session_id", sessionId);
      if (projectId) query = query.eq("project_id", projectId);

      const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
      if (error) return serverError(error.message);

      const items = includeAuthors ? await enrichNearbyItemsWithAuthors(admin, data ?? []) : (data ?? []);
      return ok({ items, count: items.length });
    } catch (e: unknown) {
      return serverError(e instanceof Error ? e.message : "Failed to load timeline");
    }
  });
