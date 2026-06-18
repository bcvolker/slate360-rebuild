/**
 * Start-walk helpers — shared by the project Plans tab "Start walk" button and
 * the Site Walk home "Walk from project" door. Keeps the create-session +
 * quick-create-project sequences in one place so every door behaves the same.
 */

import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";

export class StartWalkError extends Error {}

/** Short "Mon D" date used in the default walk title. */
function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Creates a walk session bound to a project and returns the capture URL to push.
 * Launches WITHOUT `quick`, so capture shows the walk-start sheet when the
 * project has ready plans (and falls through to camera otherwise).
 */
export async function startProjectWalk(
  projectId: string,
  projectName: string,
  startedFrom: string,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/site-walk/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${projectName} — ${todayLabel()}`,
        session_type: "general",
        project_id: projectId,
        metadata: { started_at: new Date().toISOString(), started_from: startedFrom },
      }),
    });
  } catch {
    throw new StartWalkError("Could not reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    throw new StartWalkError("Could not start the walk session. Try again.");
  }
  const body = (await res.json().catch(() => null)) as { session?: { id?: string } } | null;
  if (!body?.session?.id) {
    throw new StartWalkError("Walk session was created but could not be opened. Try again.");
  }
  return buildCaptureLaunchUrl({ session: body.session.id });
}

/**
 * Quick-create a project from just a name (everything else filled in later in
 * the project section), returning its id + name. Used when "Walk from project"
 * runs with no project yet.
 */
export async function quickCreateProject(name: string): Promise<{ id: string; name: string }> {
  const trimmed = name.trim();
  if (!trimmed) throw new StartWalkError("Enter a project name.");
  let res: Response;
  try {
    res = await fetch("/api/projects/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, metadata: { quickCreated: true } }),
    });
  } catch {
    throw new StartWalkError("Could not reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new StartWalkError(err?.error ?? "Could not create the project. Try again.");
  }
  const body = (await res.json()) as { project?: { id?: string; name?: string } };
  if (!body.project?.id) {
    throw new StartWalkError("Project was created but could not be opened. Try again.");
  }
  return { id: body.project.id, name: body.project.name ?? trimmed };
}
