import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getScopedProjectForUser, resolveProjectScope } from "@/lib/projects/access";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { data, error } = await admin
    .from("project_daily_logs")
    .select("id, project_id, log_date, summary, weather_temp, weather_condition, weather_wind, weather_precip, crew_counts, equipment, visitors, safety_observations, delays, photos, created_by, created_at, updated_at")
    .eq("project_id", projectId)
    .order("log_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const log_date = String(body.log_date ?? "").trim();
  if (!log_date) return NextResponse.json({ error: "Log date is required" }, { status: 400 });

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, log: data });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Log id is required" }, { status: 400 });

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, log: data });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Log id is required" }, { status: 400 });

  const { error } = await admin.from("project_daily_logs").delete().eq("id", id).eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
