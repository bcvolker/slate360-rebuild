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
    .select("id, cost_code, description, budget_amount, spent_amount, created_at")
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
  };

  const costCode = String(body.costCode ?? "").trim();
  const description = String(body.description ?? "").trim();
  const budgetAmount = Number(body.budgetAmount ?? 0);
  const spentAmount = Number(body.spentAmount ?? 0);

  if (!costCode) {
    return NextResponse.json({ error: "Cost code is required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("project_budgets")
    .insert({
      project_id: projectId,
      cost_code: costCode,
      description: description || null,
      budget_amount: Number.isFinite(budgetAmount) ? budgetAmount : 0,
      spent_amount: Number.isFinite(spentAmount) ? spentAmount : 0,
    })
    .select("id, cost_code, description, budget_amount, spent_amount, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, budgetRow: data });
}
