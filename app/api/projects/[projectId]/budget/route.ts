import { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { ProjectRouteContext } from "@/lib/types/api";
import { logProjectActivity } from "@/lib/projects/activity-log";

const SELECT =
  "id, cost_code, description, budget_amount, spent_amount, category, change_order_amount, forecast_amount, notes, created_at, updated_at";

export const GET = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const { data, error } = await admin
      .from("project_budgets")
      .select(SELECT)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok({ budgetRows: data ?? [] });
  });

export const POST = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId, orgId, user }) => {
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

    if (!costCode) return badRequest("Cost code is required");

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
      .select(SELECT)
      .single();

    if (error) return serverError(error.message);

    await logProjectActivity({
      projectId,
      orgId,
      actorId: user.id,
      action: "project.budget.created",
      entityType: "budget",
      entityId: data.id,
      metadata: {
        costCode: data.cost_code,
      },
    });

    return ok({ ok: true, budgetRow: data });
  });

/* ── PATCH – update a budget line item ────────────────────────── */
export const PATCH = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId, orgId, user }) => {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    if (!id) return badRequest("Row id is required");

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
      .select(SELECT)
      .single();

    if (error) return serverError(error.message);

    await logProjectActivity({
      projectId,
      orgId,
      actorId: user.id,
      action: "project.budget.updated",
      entityType: "budget",
      entityId: data.id,
      metadata: {
        costCode: data.cost_code,
      },
    });

    return ok({ ok: true, budgetRow: data });
  });

/* ── DELETE – remove a budget line item ───────────────────────── */
export const DELETE = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId, orgId, user }) => {
    const body = (await req.json().catch(() => ({}))) as { id?: string };
    const id = String(body.id ?? "").trim();
    if (!id) return badRequest("Row id is required");

    const { error } = await admin
      .from("project_budgets")
      .delete()
      .eq("id", id)
      .eq("project_id", projectId);

    if (error) return serverError(error.message);

    await logProjectActivity({
      projectId,
      orgId,
      actorId: user.id,
      action: "project.budget.deleted",
      entityType: "budget",
      entityId: id,
    });

    return ok({ ok: true });
  });
