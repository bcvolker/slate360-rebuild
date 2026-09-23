import "server-only";

import { mapJobStatus, planStage, statusLabel, workerProgress, type ProcessingRow } from "./processing-model";

type Admin = any;

const LOAD_ERROR = "Some processing records could not be loaded.";

export async function loadProcessingQueue(
  admin: Admin,
  projects: readonly { id: string; name: string }[],
): Promise<{ rows: ProcessingRow[]; error: string | null }> {
  const names = new Map(projects.map((project) => [project.id, project.name]));
  const ids = projects.map((project) => project.id);
  if (ids.length === 0) return { rows: [], error: null };
  let error: string | null = null;
  const rows: ProcessingRow[] = [];

  const spaces = await admin.from("digital_twin_spaces").select("id, project_id").in("project_id", ids).is("deleted_at", null);
  if (spaces.error) error = LOAD_ERROR;
  const spaceRows = asRows(spaces.data);
  const spaceProject = new Map(spaceRows.map((row) => [String(row.id), String(row.project_id)]));
  const spaceIds = [...spaceProject.keys()];
  if (spaceIds.length > 0) {
    const jobs = await admin
      .from("digital_twin_processing_jobs")
      .select("id, space_id, capture_id, job_type, status, stage, error_text, progress_pct, created_at, started_at, output_model_id")
      .in("space_id", spaceIds)
      .order("created_at", { ascending: false })
      .limit(80);
    if (jobs.error) error = LOAD_ERROR;
    for (const job of asRows(jobs.data)) {
      const status = mapJobStatus(String(job.status ?? ""));
      const projectId = spaceProject.get(String(job.space_id ?? ""));
      if (!status || !projectId) continue;
      rows.push({
        id: `twin-${job.id}`,
        projectId,
        projectName: names.get(projectId) ?? "Project",
        source: String(job.capture_id ?? job.id),
        kind: String(job.job_type ?? "reconstruction"),
        stage: typeof job.stage === "string" && job.stage ? job.stage : null,
        status,
        statusLabel: statusLabel(status),
        occurredAt: stringOrNull(job.started_at) ?? stringOrNull(job.created_at),
        error: status === "failed" ? concise(job.error_text) : null,
        progressPct: workerProgress(job.progress_pct),
        output: stringOrNull(job.output_model_id),
      });
    }
  }

  const plans = await admin
    .from("site_walk_plan_sets")
    .select("id, project_id, title, processing_status, created_at, updated_at")
    .in("project_id", ids)
    .order("updated_at", { ascending: false })
    .limit(80);
  if (plans.error) error = LOAD_ERROR;
  for (const plan of asRows(plans.data)) {
    const status = mapJobStatus(String(plan.processing_status ?? ""));
    const projectId = String(plan.project_id ?? "");
    if (!status || !names.has(projectId)) continue;
    rows.push({
      id: `plan-${plan.id}`,
      projectId,
      projectName: names.get(projectId) ?? "Project",
      source: String(plan.title ?? "Plan set"),
      kind: "Plans",
      stage: planStage(String(plan.processing_status ?? "")),
      status,
      statusLabel: statusLabel(status),
      occurredAt: stringOrNull(plan.updated_at) ?? stringOrNull(plan.created_at),
      error: status === "failed" ? "Plan preparation failed" : null,
      progressPct: null,
      output: status === "completed" ? String(plan.title ?? "Plan set") : null,
    });
  }

  const sessions = await admin.from("thermal_analysis_sessions").select("id, project_id, name").in("project_id", ids).is("deleted_at", null);
  if (sessions.error) error = LOAD_ERROR;
  const sessionProject = new Map(asRows(sessions.data).map((row) => [String(row.id), { projectId: String(row.project_id), name: String(row.name ?? "Thermal") }]));
  const sessionIds = [...sessionProject.keys()];
  if (sessionIds.length > 0) {
    const jobs = await admin
      .from("thermal_processing_jobs")
      .select("id, session_id, job_type, status, stage, error_log, created_at, started_at")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false })
      .limit(80);
    if (jobs.error) error = LOAD_ERROR;
    for (const job of asRows(jobs.data)) {
      const status = mapJobStatus(String(job.status ?? ""));
      const session = sessionProject.get(String(job.session_id ?? ""));
      if (!status || !session || !names.has(session.projectId)) continue;
      rows.push({
        id: `thermal-${job.id}`,
        projectId: session.projectId,
        projectName: names.get(session.projectId) ?? "Project",
        source: session.name,
        kind: String(job.job_type ?? "thermal"),
        stage: typeof job.stage === "string" && job.stage ? job.stage : null,
        status,
        statusLabel: statusLabel(status),
        occurredAt: stringOrNull(job.started_at) ?? stringOrNull(job.created_at),
        error: status === "failed" ? concise(job.error_log) : null,
        progressPct: null,
        output: null,
      });
    }
  }

  const completed = rows.filter((row) => row.status === "completed").sort(byTime).slice(0, 20);
  const active = rows.filter((row) => row.status !== "completed").sort(byTime);
  return { rows: [...active, ...completed], error };
}

function asRows(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}
function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}
function concise(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 180) : null;
}
function byTime(a: ProcessingRow, b: ProcessingRow): number {
  return (b.occurredAt ?? "").localeCompare(a.occurredAt ?? "");
}
