/**
 * Client-side calls for the phone's twin list actions. Each returns the parsed
 * body or throws an Error with the server's message, so screens can toast it.
 */

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export async function createTwinSpace(input: {
  title: string;
  projectId: string | null;
}): Promise<{ id: string; projectId: string | null }> {
  const body = input.projectId ? { title: input.title, project_id: input.projectId } : { title: input.title, quick_scan: true };
  const data = await call<{ space?: { id: string; projectId: string | null } }>("/api/digital-twin/spaces", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!data.space?.id) throw new Error("Could not create the twin");
  return { id: data.space.id, projectId: data.space.projectId ?? null };
}

export async function renameTwin(spaceId: string, title: string): Promise<string> {
  const data = await call<{ title: string }>(`/api/digital-twin/spaces/${encodeURIComponent(spaceId)}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
  return data.title;
}

export async function moveTwin(spaceId: string, projectId: string): Promise<{ projectName: string }> {
  return call<{ projectName: string }>(`/api/digital-twin/spaces/${encodeURIComponent(spaceId)}/project`, {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });
}

export async function deleteTwin(spaceId: string): Promise<void> {
  await call<{ deleted: boolean }>(`/api/digital-twin/spaces/${encodeURIComponent(spaceId)}`, { method: "DELETE" });
}

const LAST_PROJECT_KEY = "twin360.lastProjectId";

/** Decision 1 (2026-09-09): Scan defaults to the last project used; "" means Quick Scans. */
export function readLastProjectId(): string | null {
  try {
    return window.localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function writeLastProjectId(projectId: string | null): void {
  try {
    window.localStorage.setItem(LAST_PROJECT_KEY, projectId ?? "");
  } catch {
    /* private mode — the default falls back to the newest project */
  }
}
