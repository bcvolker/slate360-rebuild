import { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { ProjectRouteContext } from "@/lib/types/api";

const SELECT =
  "id, number, title, description, status, priority, assignee, location_area, trade_category, due_date, photos, created_by, created_at, updated_at, completed_at";

/* ── GET – list all punch items for a project ───────────────────── */
export const GET = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const { data, error } = await admin
      .from("project_punch_items")
      .select(SELECT)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok({ items: data ?? [] });
  });

/* ── POST – create a new punch item ─────────────────────────────── */
export const POST = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId, user }) => {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const title = String(body.title ?? "").trim();
    if (!title) return badRequest("Title is required");

    const { data, error } = await admin
      .from("project_punch_items")
      .insert({
        project_id: projectId,
        title,
        description: body.description ? String(body.description).trim() : null,
        status: body.status ? String(body.status) : "Open",
        priority: body.priority ? String(body.priority) : "Medium",
        assignee: body.assignee ? String(body.assignee).trim() : null,
        location_area: body.location_area ? String(body.location_area).trim() : null,
        trade_category: body.trade_category ? String(body.trade_category).trim() : null,
        due_date: body.due_date ? String(body.due_date) : null,
        photos: Array.isArray(body.photos) ? body.photos : [],
        created_by: user.id,
      })
      .select(SELECT)
      .single();

    if (error) return serverError(error.message);
    return ok({ ok: true, item: data });
  });

/* ── PATCH – update a punch item ────────────────────────────────── */
export const PATCH = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const itemId = String(body.id ?? "").trim();
    if (!itemId) return badRequest("Item id is required");

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.description !== undefined) updates.description = body.description ? String(body.description).trim() : null;
    if (body.status !== undefined) {
      updates.status = String(body.status);
      if (body.status === "Closed") updates.completed_at = new Date().toISOString();
      else updates.completed_at = null;
    }
    if (body.priority !== undefined) updates.priority = String(body.priority);
    if (body.assignee !== undefined) updates.assignee = body.assignee ? String(body.assignee).trim() : null;
    if (body.location_area !== undefined) updates.location_area = body.location_area ? String(body.location_area).trim() : null;
    if (body.trade_category !== undefined) updates.trade_category = body.trade_category ? String(body.trade_category).trim() : null;
    if (body.due_date !== undefined) updates.due_date = body.due_date ? String(body.due_date) : null;
    if (body.photos !== undefined && Array.isArray(body.photos)) updates.photos = body.photos;

    const { data, error } = await admin
      .from("project_punch_items")
      .update(updates)
      .eq("id", itemId)
      .eq("project_id", projectId)
      .select(SELECT)
      .single();

    if (error) return serverError(error.message);
    return ok({ ok: true, item: data });
  });

/* ── DELETE – remove a punch item ───────────────────────────────── */
export const DELETE = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const body = (await req.json().catch(() => ({}))) as { id?: string };
    const itemId = String(body.id ?? "").trim();
    if (!itemId) return badRequest("Item id is required");

    const { error } = await admin
      .from("project_punch_items")
      .delete()
      .eq("id", itemId)
      .eq("project_id", projectId);

    if (error) return serverError(error.message);
    return ok({ ok: true });
  });
