/**
 * POST /api/site-walk/sessions/[id]/quick-deliverable
 *
 * One-tap, light-lift deliverable generation for the mobile app + desktop.
 * Body: { type: "punchlist" | "photo_log" | "field_report" }
 *
 * Scans the session's items and creates a draft deliverable whose `content` is
 * a templated `ViewerItem[]` block array (the hosted token viewer renders real
 * photos). No image bytes are fetched/embedded in-request — this stays
 * lightweight, mirroring the `status-report` endpoint.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import type { StatusReportSourceItem } from "@/lib/site-walk/status-report";
import {
  buildQuickDeliverableContent,
  isQuickDeliverableType,
  QUICK_DELIVERABLE_CONFIG,
  QUICK_DELIVERABLE_LABELS,
  QUICK_DELIVERABLE_TYPES,
} from "@/lib/site-walk/quick-deliverables";

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id: sessionId } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as { type?: string; include_voice?: boolean };
    if (!isQuickDeliverableType(body.type)) {
      return badRequest(`type must be one of: ${QUICK_DELIVERABLE_TYPES.join(", ")}`);
    }
    const type = body.type;
    const includeVoice = body.include_voice === true;

    const { data: session } = await admin
      .from("site_walk_sessions")
      .select("id, title, project_id")
      .eq("id", sessionId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!session) return notFound("Session not found");

    // audio_s3_key + metadata.transcript are only needed when voice is attached,
    // but they're cheap to select and keep the mapping uniform.
    let itemsQuery = admin
      .from("site_walk_items")
      .select("id, item_type, title, description, s3_key, audio_s3_key, metadata, item_status, priority, created_at")
      .eq("session_id", sessionId)
      .eq("org_id", orgId);
    itemsQuery = excludeDeletedSiteWalkItems(itemsQuery);

    const { data: rows, error } = await itemsQuery
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) return serverError(error.message);

    const items: StatusReportSourceItem[] = (rows ?? []).map((r) => {
      const meta = (r.metadata as Record<string, unknown> | null) ?? null;
      const transcript = meta && typeof meta.transcript === "string" ? meta.transcript : null;
      return {
        id: r.id as string,
        item_type: r.item_type as string,
        title: (r.title as string | null) ?? null,
        description: (r.description as string | null) ?? null,
        s3_key: (r.s3_key as string | null) ?? null,
        audio_s3_key: (r.audio_s3_key as string | null) ?? null,
        transcript,
        item_status: (r.item_status as string | null) ?? null,
        priority: (r.priority as string | null) ?? null,
        created_at: r.created_at as string,
      };
    });

    const content = buildQuickDeliverableContent(type, session.title ?? "", items, { includeVoice });
    const title = `${QUICK_DELIVERABLE_LABELS[type]} — ${session.title || "Untitled walk"} — ${new Date().toLocaleDateString()}`;
    const config = QUICK_DELIVERABLE_CONFIG[type];

    const { data: deliverable, error: insertErr } = await admin
      .from("site_walk_deliverables")
      .insert({
        session_id: sessionId,
        org_id: orgId,
        project_id: session.project_id ?? null,
        created_by: user.id,
        title,
        deliverable_type: config.deliverableType,
        status: "draft",
        content,
        output_mode: config.outputMode,
      })
      .select("id")
      .single();

    if (insertErr || !deliverable) {
      return serverError(insertErr?.message ?? "Failed to create deliverable");
    }

    return ok({ deliverable_id: deliverable.id, item_count: items.length });
  });
