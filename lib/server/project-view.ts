import "server-only";

import { cookies } from "next/headers";

export const PROJECT_VIEW_MODES = ["my", "owner", "leadership"] as const;
export type ProjectViewMode = (typeof PROJECT_VIEW_MODES)[number];

export const PROJECT_VIEW_COOKIE = "slate360.projectView";

export function isProjectViewMode(value: unknown): value is ProjectViewMode {
  return typeof value === "string" && (PROJECT_VIEW_MODES as readonly string[]).includes(value);
}

/** Reads the active view mode from cookies, defaulting to "my". */
export async function readProjectViewMode(): Promise<ProjectViewMode> {
  const store = await cookies();
  const raw = store.get(PROJECT_VIEW_COOKIE)?.value;
  return isProjectViewMode(raw) ? raw : "my";
}
