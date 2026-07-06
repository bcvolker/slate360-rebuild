import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { provisionProjectFolders } from "@/lib/slatedrop/provisioning";
import { resolveEntitledAppsForProvisioning } from "@/lib/slatedrop/entitled-apps";

export const SYSTEM_PROJECT_MARKER = "360_library";
const SYSTEM_PROJECT_NAME = "360 Library";

/**
 * Finds or creates a hidden, per-org project that serves as the SlateDrop
 * destination for project-less tours (the "org-level 360 Library inbox" in
 * the locked plan, §8.1). `project_tours.project_id` is NOT NULL in
 * production (migration 20260407000001) so every tour needs a real project
 * row; this satisfies that constraint by reusing the existing project ->
 * SlateDrop provisioning pipeline unchanged, rather than introducing a
 * parallel non-project storage concept.
 *
 * Tagged via `metadata.system_project` (NOT `project_type`, which has a
 * CHECK('field'|'full') constraint we don't want to widen) so normal
 * project pickers can filter it out — see `EXCLUDE_SYSTEM_PROJECTS_FILTER`.
 */
export async function findOrCreate360LibraryProject(
  admin: SupabaseClient,
  orgId: string,
  userId: string,
  opts?: { isSlateCeo?: boolean },
): Promise<string> {
  const { data: existing } = await admin
    .from("projects")
    .select("id")
    .eq("org_id", orgId)
    .filter("metadata->>system_project", "eq", SYSTEM_PROJECT_MARKER)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await admin
    .from("projects")
    .insert({
      org_id: orgId,
      name: SYSTEM_PROJECT_NAME,
      description: "Auto-created holding area for 360 tours not yet assigned to a project.",
      status: "active",
      created_by: userId,
      project_type: "field",
      metadata: { system_project: SYSTEM_PROJECT_MARKER },
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create 360 Library project: ${error?.message ?? "unknown error"}`);
  }

  const { error: memberError } = await admin.from("project_members").insert({
    project_id: created.id,
    user_id: userId,
    role_id: "owner",
    status: "active",
  });
  if (memberError) {
    // Non-fatal: the project still works for tour attachment; membership just
    // affects the project's own member-scoped queries, which nothing routes
    // through for this hidden project today.
    console.error("[system-project] project_members insert failed:", memberError.message);
  }

  try {
    const enabledApps = await resolveEntitledAppsForProvisioning(admin, orgId, opts);
    await provisionProjectFolders(created.id, SYSTEM_PROJECT_NAME, orgId, userId, enabledApps);
  } catch (provisionError) {
    // Non-fatal: the project row (which is all project_tours.project_id needs)
    // already exists. A missing SlateDrop folder just means scenes fall back
    // to their signed-URL path with no auto-file destination yet; safe to retry
    // on the next project-less tour creation (provisioning is idempotent).
    console.error("[system-project] folder provisioning failed:", provisionError);
  }

  return created.id;
}

/**
 * PostgREST OR-filter that excludes the 360 Library project from a project
 * list/picker query. Must be an OR of (key absent) and (key present but
 * different) — a plain `.filter(..., "neq", ...)` alone silently excludes
 * EVERY row including normal ones, because `NULL <> 'value'` is unknown/false
 * in SQL, not true (verified empirically against the live table).
 */
export const EXCLUDE_SYSTEM_PROJECTS_FILTER =
  `metadata->>system_project.is.null,metadata->>system_project.neq.${SYSTEM_PROJECT_MARKER}`;
