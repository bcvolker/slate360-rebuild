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
    .from("project_budgets")
    .select("id, cost_code, description, budget_amount, spent_amount, category, change_order_amount, forecast_amount, notes, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ budgetRows: data ?? [] });
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

  const body = (await req.json().catch(() => ({}))) as {
    costCode?: string;
    description?: string;
    budgetAmount?: number;
    spentAmount?: number;
    category?: string;
    changeOrderAmount?: number;
    forecastAmount?: number;
    notes?: string;
  };

  const costCode = String(body.costCode ?? "").trim();
  const description = String(body.description ?? "").trim();
  const budgetAmount = Number(body.budgetAmount ?? 0);
  const spentAmount = Number(body.spentAmount ?? 0);

  if (!costCode) {
    return NextResponse.json({ error: "Cost code is required" }, { status: 400 });
  }

  const category = String(body.category ?? "").trim();
  const changeOrderAmount = Number(body.changeOrderAmount ?? 0);
  const forecastAmount = Number(body.forecastAmount ?? 0);
  const notes = String(body.notes ?? "").trim();

  const { data, error } = await admin
    .from("project_budgets")
    .insert({
      project_id: projectId,
      cost_code: costCode,
      description: description || null,
      budget_amount: Number.isFinite(budgetAmount) ? budgetAmount : 0,
      spent_amount: Number.isFinite(spentAmount) ? spentAmount : 0,
      category: category || null,
      change_order_amount: Number.isFinite(changeOrderAmount) ? changeOrderAmount : 0,
      forecast_amount: Number.isFinite(forecastAmount) ? forecastAmount : 0,
      notes: notes || null,
    })
    .select("id, cost_code, description, budget_amount, spent_amount, category, change_order_amount, forecast_amount, notes, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, budgetRow: data });
}

/* ── PATCH – update a budget line item ────────────────────────── */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Row id is required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.costCode !== undefined) updates.cost_code = String(body.costCode).trim();
  if (body.description !== undefined) updates.description = body.description ? String(body.description).trim() : null;
  if (body.budgetAmount !== undefined) updates.budget_amount = Number(body.budgetAmount) || 0;
  if (body.spentAmount !== undefined) updates.spent_amount = Number(body.spentAmount) || 0;
  if (body.category !== undefined) updates.category = body.category ? String(body.category).trim() : null;
  if (body.changeOrderAmount !== undefined) updates.change_order_amount = Number(body.changeOrderAmount) || 0;
  if (body.forecastAmount !== undefined) updates.forecast_amount = Number(body.forecastAmount) || 0;
  if (body.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : null;

  const { data, error } = await admin
    .from("project_budgets")
    .update(updates)
    .eq("id", id)
    .eq("project_id", projectId)
    .select("id, cost_code, description, budget_amount, spent_amount, category, change_order_amount, forecast_amount, notes, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, budgetRow: data });
}

/* ── DELETE – remove a budget line item ───────────────────────── */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Row id is required" }, { status: 400 });

  const { error } = await admin
    .from("project_budgets")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
