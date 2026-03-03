import { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { ProjectRouteContext } from "@/lib/types/api";

const SELECT =
  "id, project_id, number, title, description, sentiment, category, location_area, priority, status, photos, notes, observed_at, resolved_at, created_by, created_at, updated_at";

export const GET = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const { data, error } = await admin
      .from("project_observations")
      .select(SELECT)
      .eq("project_id", projectId)
      .order("observed_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok({ observations: data ?? [] });
  });

export const POST = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId, user }) => {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const title = String(body.title ?? "").trim();
    if (!title) return badRequest("Title is required");

    const sentiment = String(body.sentiment ?? "neutral");
    if (!["positive", "negative", "neutral"].includes(sentiment)) {
      return badRequest("Sentiment must be positive, negative, or neutral");
    }

    const { data, error } = await admin
      .from("project_observations")
      .insert({
        project_id: projectId,
        title,
        description: body.description ? String(body.description) : null,
        sentiment,
        category: body.category ? String(body.category) : null,
        location_area: body.location_area ? String(body.location_area) : null,
        priority: body.priority ? String(body.priority) : "Medium",
        status: "Open",
        photos: body.photos ?? [],
        notes: body.notes ? String(body.notes) : null,
        observed_at: body.observed_at ? String(body.observed_at) : new Date().toISOString(),
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok({ ok: true, observation: data });
  });

export const PATCH = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    if (!id) return badRequest("Observation id is required");

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.sentiment !== undefined) updates.sentiment = body.sentiment;
    if (body.category !== undefined) updates.category = body.category;
    if (body.location_area !== undefined) updates.location_area = body.location_area;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === "Resolved" || body.status === "Closed") {
        updates.resolved_at = new Date().toISOString();
      }
    }
    if (body.photos !== undefined) updates.photos = body.photos;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.observed_at !== undefined) updates.observed_at = body.observed_at;

    const { data, error } = await admin
      .from("project_observations")
      .update(updates)
      .eq("id", id)
      .eq("project_id", projectId)
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok({ ok: true, observation: data });
  });

export const DELETE = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const body = (await req.json().catch(() => ({}))) as { id?: string };
    const id = String(body.id ?? "").trim();
    if (!id) return badRequest("Observation id is required");

    const { error } = await admin
      .from("project_observations")
      .delete()
      .eq("id", id)
      .eq("project_id", projectId);

    if (error) return serverError(error.message);
    return ok({ ok: true });
  });
