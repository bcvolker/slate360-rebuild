import { NextRequest } from "next/server";
import { withAuth, type AuthedContext } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { enrichNearbyItemsWithAuthors } from "@/lib/site-walk/enrich-nearby-items";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";

type ItemRow = Record<string, unknown> & { id: string };

/**
 * GET /api/site-walk/nearby
 *
 * GPS mode: lat + lng + radius → get_nearby_photos RPC
 * Fallback mode: project_id | session_id | plan_sheet_id (no GPS) → scoped item list
 *
 * Query params:
 *   lat, lng, radius (meters, default 50)
 *   org_id (optional override)
 *   project_id, session_id, plan_sheet_id (optional scope)
 *   include_authors=true (add author_name on each row)
 *   limit (fallback mode, default 40)
 */
export const GET = async (req: NextRequest) =>
  withAuth(req, async ({ orgId, admin }: AuthedContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const lat = searchParams.get("lat");
      const lng = searchParams.get("lng");
      const radius = searchParams.get("radius") ?? "50";
      const targetOrgId = searchParams.get("org_id") || orgId;
      const projectId = searchParams.get("project_id");
      const sessionId = searchParams.get("session_id");
      const planSheetId = searchParams.get("plan_sheet_id");
      const includeAuthors = searchParams.get("include_authors") === "true";
      const limit = Math.min(Number(searchParams.get("limit") ?? "40") || 40, 100);

      if (!targetOrgId) {
        return badRequest("Organization context required");
      }

      let items: ItemRow[] = [];

      if (lat && lng) {
        const { data, error } = await admin.rpc("get_nearby_photos", {
          p_lat: parseFloat(lat),
          p_lng: parseFloat(lng),
          p_radius_meters: parseFloat(radius),
          p_org_id: targetOrgId,
          p_project_id: projectId || null,
          p_session_id: sessionId || null,
        });

        if (error) return serverError(error.message);
        items = (data ?? []) as ItemRow[];
      } else if (planSheetId) {
        const { data: pins, error: pinError } = await admin
          .from("site_walk_pins")
          .select("item_id")
          .eq("org_id", targetOrgId)
          .eq("plan_sheet_id", planSheetId)
          .not("item_id", "is", null);

        if (pinError) return serverError(pinError.message);

        const itemIds = Array.from(
          new Set((pins ?? []).map((pin) => pin.item_id).filter((id): id is string => Boolean(id))),
        );

        if (itemIds.length === 0) {
          items = [];
        } else {
          let query = admin
            .from("site_walk_items")
            .select("*")
            .eq("org_id", targetOrgId)
            .in("id", itemIds);
          query = excludeDeletedSiteWalkItems(query);
          if (projectId) query = query.eq("project_id", projectId);
          if (sessionId) query = query.eq("session_id", sessionId);

          const { data, error } = await query
            .order("created_at", { ascending: false })
            .limit(limit);
          if (error) return serverError(error.message);
          items = (data ?? []) as ItemRow[];
        }
      } else if (sessionId || projectId) {
        let query = admin.from("site_walk_items").select("*").eq("org_id", targetOrgId);
        query = excludeDeletedSiteWalkItems(query);
        if (sessionId) query = query.eq("session_id", sessionId);
        if (projectId) query = query.eq("project_id", projectId);

        const { data, error } = await query
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) return serverError(error.message);
        items = (data ?? []) as ItemRow[];
      } else {
        return badRequest(
          "Provide lat+lng for GPS lookup, or project_id / session_id / plan_sheet_id for scoped fallback",
        );
      }

      const payload = includeAuthors ? await enrichNearbyItemsWithAuthors(admin, items) : items;
      return ok({ items: payload, count: payload.length });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to fetch nearby photos";
      return serverError(message);
    }
  });
