/**
 * POST /api/site-walk/sessions/[id]/status-report
 *
 * One-click: scans every item in the session and creates a draft
 * `status_report` deliverable. Idempotent? No — a fresh draft is created on
 * each call so the user can iterate.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import { buildStatusReportContent, type StatusReportSourceItem } from "@/lib/site-walk/status-report";

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

    const { data: rows, error } = await admin
      .from("site_walk_items")
      .select("id, item_type, title, description, s3_key, item_status, priority, created_at")
      .eq("session_id", sessionId)
      .eq("org_id", orgId)
      .order("sort_order", { ascending: true });

    if (error) return serverError(error.message);

    const items: StatusReportSourceItem[] = (rows ?? []).map((r) => ({
      id: r.id as string,
      item_type: r.item_type as string,
      title: (r.title as string | null) ?? null,
      description: (r.description as string | null) ?? null,
      s3_key: (r.s3_key as string | null) ?? null,
      item_status: (r.item_status as string | null) ?? null,
      priority: (r.priority as string | null) ?? null,
      created_at: r.created_at as string,
    }));

    const content = buildStatusReportContent(session.title ?? "", items);
    const title = `Status report — ${session.title || "Untitled walk"} — ${new Date().toLocaleDateString()}`;

    const { data: deliverable, error: insertErr } = await admin
      .from("site_walk_deliverables")
      .insert({
        session_id: sessionId,
        org_id: orgId,
        created_by: user.id,
        title,
        deliverable_type: "status_report",
        status: "draft",
        content,
      })
      .select("id")
      .single();

    if (insertErr || !deliverable) return serverError(insertErr?.message ?? "Failed to create deliverable");

    return ok({ deliverable_id: deliverable.id, item_count: items.length });
  });
