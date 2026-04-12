/**
 * GET  /api/site-walk/items?session_id=...  — list items for a session
 * POST /api/site-walk/items                 — create a new item
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { CreateItemPayload, SiteWalkItemType } from "@/lib/types/site-walk";

const VALID_ITEM_TYPES: SiteWalkItemType[] = [
  "photo",
  "video",
  "text_note",
  "voice_note",
  "annotation",
];

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) return badRequest("session_id is required");
    if (!orgId) return badRequest("Organization context required");

    const { data, error } = await admin
      .from("site_walk_items")
      .select("*")
      .eq("session_id", sessionId)
      .eq("org_id", orgId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return serverError(error.message);
    return ok({ items: data });
  });

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json()) as CreateItemPayload;
    if (!body.session_id) return badRequest("session_id is required");
    if (!body.item_type || !VALID_ITEM_TYPES.includes(body.item_type)) {
      return badRequest(`item_type must be one of: ${VALID_ITEM_TYPES.join(", ")}`);
    }

    // Verify the session exists and belongs to this org
    const { data: session } = await admin
      .from("site_walk_sessions")
      .select("id")
      .eq("id", body.session_id)
      .eq("org_id", orgId)
      .single();

    if (!session) return badRequest("Session not found or access denied");

    // Get next sort_order
    const { data: lastItem } = await admin
      .from("site_walk_items")
      .select("sort_order")
      .eq("session_id", body.session_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (lastItem?.sort_order ?? -1) + 1;

    const { data, error } = await admin
      .from("site_walk_items")
      .insert({
        session_id: body.session_id,
        org_id: orgId,
        created_by: user.id,
        item_type: body.item_type,
        title: body.title?.trim() ?? "",
        description: body.description ?? null,
        file_id: body.file_id ?? null,
        s3_key: body.s3_key ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        location_label: body.location_label ?? null,
        weather: body.weather ?? null,
        metadata: body.metadata ?? {},
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) return serverError(error.message);
    return ok({ item: data });
  });
