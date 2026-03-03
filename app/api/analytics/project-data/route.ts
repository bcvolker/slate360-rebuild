import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

export type Section =
  | "overview"
  | "rfi"
  | "submittal"
  | "budget"
  | "schedule"
  | "daily-logs"
  | "punch-list"
  | "observations"
  | "team"
  | "contracts"
  | "photos"
  | "activity";

function dateFloor(range: string): string {
  const now = new Date();
  switch (range) {
    case "last-7":  now.setDate(now.getDate() - 7); break;
    case "last-30": now.setDate(now.getDate() - 30); break;
    case "last-90": now.setDate(now.getDate() - 90); break;
    case "this-year": now.setMonth(0, 1); now.setHours(0, 0, 0, 0); break;
    default: return "1970-01-01T00:00:00Z"; // all-time
  }
  return now.toISOString();
}

/**
 * GET /api/analytics/project-data
 * Query params:
 *   projectId  – required
 *   sections   – comma-separated list of Section values (default: all)
 *   dateRange  – last-7 | last-30 | last-90 | this-year | all-time (default: all-time)
 */
export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization not found");
    const { searchParams } = req.nextUrl;
    const projectId = searchParams.get("projectId");
    if (!projectId) return badRequest("projectId is required");

    const requestedSections = searchParams.get("sections")
      ? (searchParams.get("sections")!.split(",") as Section[])
      : (["overview","rfi","submittal","budget","schedule","daily-logs","punch-list","observations","team","contracts","activity"] as Section[]);

    const since = dateFloor(searchParams.get("dateRange") ?? "all-time");

    // Verify project belongs to this org
    const { data: projectRow, error: projErr } = await admin
      .from("projects")
      .select("id, name, status, metadata")
      .eq("id", projectId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .single();

    if (projErr || !projectRow) return badRequest("Project not found or access denied");

    const result: Record<string, unknown> = {};

    const want = (s: Section) => requestedSections.includes(s);

    // ── Overview ────────────────────────────────────────────────────────────
    if (want("overview")) {
      const meta = (projectRow.metadata ?? {}) as Record<string, unknown>;
      const loc  = (meta.location ?? {}) as Record<string, unknown>;
      result.overview = {
        id: projectRow.id,
        name: projectRow.name,
        status: projectRow.status,
        address:    (loc.address    ?? null) as string | null,
        city:       (loc.city       ?? null) as string | null,
        state:      (loc.state      ?? null) as string | null,
        lat:        typeof loc.lat === "number" ? loc.lat : null,
        lng:        typeof loc.lng === "number" ? loc.lng : null,
        weather:    (meta.weather   ?? null),
        startDate:  (meta.startDate ?? null) as string | null,
        endDate:    (meta.endDate   ?? null) as string | null,
        description:(meta.description ?? null) as string | null,
      };
    }

    // ── RFIs ────────────────────────────────────────────────────────────────
    if (want("rfi")) {
      const { data: rfis, error: rfiErr } = await admin
        .from("project_rfis")
        .select("id, subject, status, priority, due_date, cost_impact, schedule_impact, created_at, closed_at")
        .eq("project_id", projectId)
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      if (rfiErr) return serverError(rfiErr.message);

      const rows = rfis ?? [];
      const byStatus: Record<string, number> = {};
      let totalCostImpact = 0;
      let totalScheduleImpact = 0;
      for (const r of rows) {
        byStatus[r.status as string] = (byStatus[r.status as string] ?? 0) + 1;
        totalCostImpact += (r.cost_impact as number) ?? 0;
        totalScheduleImpact += (r.schedule_impact as number) ?? 0;
      }
      result.rfi = {
        total: rows.length,
        byStatus,
        totalCostImpact,
        totalScheduleImpactDays: totalScheduleImpact,
        items: rows,
      };
    }

    // ── Submittals ──────────────────────────────────────────────────────────
    if (want("submittal")) {
      const { data: subs, error: subErr } = await admin
        .from("project_submittals")
        .select("id, title, spec_section, status, due_date, responsible_contractor, revision_number, received_date, required_date, response_decision, created_at")
        .eq("project_id", projectId)
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      if (subErr) return serverError(subErr.message);

      const rows = subs ?? [];
      const byStatus: Record<string, number> = {};
      for (const s of rows) {
        byStatus[s.status as string] = (byStatus[s.status as string] ?? 0) + 1;
      }
      result.submittal = { total: rows.length, byStatus, items: rows };
    }

    // ── Budget ──────────────────────────────────────────────────────────────
    if (want("budget")) {
      const { data: budgets, error: budgetErr } = await admin
        .from("project_budgets")
        .select("id, line_item, category, budgeted_amount, committed_amount, actual_amount, forecast_amount, status, notes, created_at, updated_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (budgetErr) return serverError(budgetErr.message);

      const rows = budgets ?? [];
      let totalBudgeted = 0, totalCommitted = 0, totalActual = 0, totalForecast = 0;
      for (const b of rows) {
        totalBudgeted   += (b.budgeted_amount   as number) ?? 0;
        totalCommitted  += (b.committed_amount  as number) ?? 0;
        totalActual     += (b.actual_amount     as number) ?? 0;
        totalForecast   += (b.forecast_amount   as number) ?? 0;
      }
      result.budget = {
        totalBudgeted,
        totalCommitted,
        totalActual,
        totalForecast,
        variance: totalBudgeted - totalActual,
        items: rows,
      };
    }

    // ── Schedule ────────────────────────────────────────────────────────────
    if (want("schedule")) {
      const { data: tasks, error: taskErr } = await admin
        .from("project_tasks")
        .select("id, name, status, start_date, end_date, progress, duration_days, assigned_to, predecessors, is_milestone, created_at")
        .eq("project_id", projectId)
        .order("start_date", { ascending: true });

      if (taskErr) return serverError(taskErr.message);

      const rows = tasks ?? [];
      const byStatus: Record<string, number> = {};
      let totalProgress = 0;
      for (const t of rows) {
        byStatus[t.status as string] = (byStatus[t.status as string] ?? 0) + 1;
        totalProgress += (t.progress as number) ?? 0;
      }
      const milestones = rows.filter((t: Record<string, unknown>) => t.is_milestone);
      result.schedule = {
        total: rows.length,
        byStatus,
        overallProgress: rows.length ? Math.round(totalProgress / rows.length) : 0,
        milestones,
        items: rows,
      };
    }

    // ── Daily Logs ──────────────────────────────────────────────────────────
    if (want("daily-logs")) {
      const { data: logs, error: logErr } = await admin
        .from("project_daily_logs")
        .select("id, log_date, weather, temperature, conditions, crew_count, notes, created_at")
        .eq("project_id", projectId)
        .gte("created_at", since)
        .order("log_date", { ascending: false })
        .limit(50);

      if (logErr) return serverError(logErr.message);

      result["daily-logs"] = { total: (logs ?? []).length, items: logs ?? [] };
    }

    // ── Punch List ──────────────────────────────────────────────────────────
    if (want("punch-list")) {
      const { data: punch, error: punchErr } = await admin
        .from("project_punch_items")
        .select("id, title, description, status, priority, location, assigned_to, due_date, created_at, resolved_at")
        .eq("project_id", projectId)
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      if (punchErr) return serverError(punchErr.message);

      const rows = punch ?? [];
      const byStatus: Record<string, number> = {};
      for (const p of rows) {
        byStatus[p.status as string] = (byStatus[p.status as string] ?? 0) + 1;
      }
      result["punch-list"] = { total: rows.length, byStatus, items: rows };
    }

    // ── Observations ────────────────────────────────────────────────────────
    if (want("observations")) {
      const { data: obs, error: obsErr } = await admin
        .from("project_observations")
        .select("id, title, body, sentiment, category, created_by, created_at")
        .eq("project_id", projectId)
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      if (obsErr) return serverError(obsErr.message);

      const rows = obs ?? [];
      const bySentiment: Record<string, number> = {};
      for (const o of rows) {
        bySentiment[o.sentiment as string] = (bySentiment[o.sentiment as string] ?? 0) + 1;
      }
      result.observations = { total: rows.length, bySentiment, items: rows };
    }

    // ── Team (project members) ───────────────────────────────────────────────
    if (want("team")) {
      const { data: members, error: teamErr } = await admin
        .from("project_members")
        .select("id, role, invited_at, user_id")
        .eq("project_id", projectId);

      if (teamErr) return serverError(teamErr.message);

      const byRole: Record<string, number> = {};
      for (const m of members ?? []) {
        byRole[m.role as string] = (byRole[m.role as string] ?? 0) + 1;
      }
      result.team = { total: (members ?? []).length, byRole };
    }

    // ── Contracts ───────────────────────────────────────────────────────────
    if (want("contracts")) {
      const { data: contracts, error: contractErr } = await admin
        .from("project_contracts")
        .select("id, title, status, contract_type, contractor_name, amount, start_date, end_date, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (contractErr) return serverError(contractErr.message);

      const rows = contracts ?? [];
      let totalValue = 0;
      for (const c of rows) {
        totalValue += (c.amount as number) ?? 0;
      }
      result.contracts = { total: rows.length, totalValue, items: rows };
    }

    // ── Recent Activity ──────────────────────────────────────────────────────
    if (want("activity")) {
      const { data: activity, error: actErr } = await admin
        .from("project_activity_log")
        .select("id, action, entity_type, entity_id, metadata, created_at, actor_user_id")
        .eq("project_id", projectId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100);

      if (actErr) return serverError(actErr.message);

      result.activity = { total: (activity ?? []).length, items: activity ?? [] };
    }

    return ok({ projectId, sections: requestedSections, data: result });
  });
