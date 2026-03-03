import { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { ProjectRouteContext } from "@/lib/types/api";
import { logProjectActivity } from "@/lib/projects/activity-log";

const SELECT =
  "id, project_id, log_date, summary, weather_temp, weather_condition, weather_wind, weather_precip, crew_counts, equipment, visitors, safety_observations, delays, photos, created_by, created_at, updated_at";

export const GET = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const { data, error } = await admin
      .from("project_daily_logs")
      .select(SELECT)
      .eq("project_id", projectId)
      .order("log_date", { ascending: false });

    if (error) return serverError(error.message);
    return ok({ logs: data ?? [] });
  });

export const POST = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId, orgId, user }) => {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const log_date = String(body.log_date ?? "").trim();
    if (!log_date) return badRequest("Log date is required");

    const { data, error } = await admin
      .from("project_daily_logs")
      .insert({
        project_id: projectId,
        log_date,
        summary: body.summary ? String(body.summary) : null,
        weather_temp: body.weather_temp ? Number(body.weather_temp) : null,
        weather_condition: body.weather_condition ? String(body.weather_condition) : null,
        weather_wind: body.weather_wind ? String(body.weather_wind) : null,
        weather_precip: body.weather_precip ? String(body.weather_precip) : null,
        crew_counts: body.crew_counts ?? null,
        equipment: body.equipment ?? null,
        visitors: body.visitors ? String(body.visitors) : null,
        safety_observations: body.safety_observations ? String(body.safety_observations) : null,
        delays: body.delays ? String(body.delays) : null,
        photos: body.photos ?? null,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);

    await logProjectActivity({
      projectId,
      orgId,
      actorId: user.id,
      action: "project.daily_log.created",
      entityType: "daily_log",
      entityId: data.id,
      metadata: {
        logDate: data.log_date,
      },
    });

    return ok({ ok: true, log: data });
  });

export const PATCH = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId, orgId, user }) => {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    if (!id) return badRequest("Log id is required");

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.log_date !== undefined) updates.log_date = body.log_date;
    if (body.summary !== undefined) updates.summary = body.summary;
    if (body.weather_temp !== undefined) updates.weather_temp = body.weather_temp;
    if (body.weather_condition !== undefined) updates.weather_condition = body.weather_condition;
    if (body.weather_wind !== undefined) updates.weather_wind = body.weather_wind;
    if (body.weather_precip !== undefined) updates.weather_precip = body.weather_precip;
    if (body.crew_counts !== undefined) updates.crew_counts = body.crew_counts;
    if (body.equipment !== undefined) updates.equipment = body.equipment;
    if (body.visitors !== undefined) updates.visitors = body.visitors;
    if (body.safety_observations !== undefined) updates.safety_observations = body.safety_observations;
    if (body.delays !== undefined) updates.delays = body.delays;
    if (body.photos !== undefined) updates.photos = body.photos;

    const { data, error } = await admin
      .from("project_daily_logs")
      .update(updates)
      .eq("id", id)
      .eq("project_id", projectId)
      .select("*")
      .single();

    if (error) return serverError(error.message);

    await logProjectActivity({
      projectId,
      orgId,
      actorId: user.id,
      action: "project.daily_log.updated",
      entityType: "daily_log",
      entityId: data.id,
      metadata: {
        logDate: data.log_date,
      },
    });

    return ok({ ok: true, log: data });
  });

export const DELETE = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId, orgId, user }) => {
    const body = (await req.json().catch(() => ({}))) as { id?: string };
    const id = String(body.id ?? "").trim();
    if (!id) return badRequest("Log id is required");

    const { error } = await admin.from("project_daily_logs").delete().eq("id", id).eq("project_id", projectId);
    if (error) return serverError(error.message);

    await logProjectActivity({
      projectId,
      orgId,
      actorId: user.id,
      action: "project.daily_log.deleted",
      entityType: "daily_log",
      entityId: id,
    });

    return ok({ ok: true });
  });
