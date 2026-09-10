import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { parseTwinCaptureSummary, type TwinCaptureSummary } from "@/lib/twin/capture-summary-pure";
import { readPosterRef } from "@/lib/twin/capture-summary";

export type TwinSavedCapture = {
  id: string;
  createdAt: string;
  status: string;
  errorText: string | null;
  summary: TwinCaptureSummary | null;
};

export type TwinSavedState = {
  spaceId: string;
  title: string;
  projectId: string | null;
  projectName: string | null;
  hasPoster: boolean;
  captures: TwinSavedCapture[];
};

/**
 * S6 data for a twin that has captures but no processed model: every capture
 * with its receipt, newest first. The receipt is written at upload-complete
 * (lib/twin/capture-summary.ts); older captures may carry none.
 */
export async function loadTwinSavedState(spaceId: string, orgId: string | null): Promise<TwinSavedState | null> {
  if (!orgId) return null;
  const admin = createAdminClient();
  const { data: space } = await admin
    .from("digital_twin_spaces")
    .select("id, title, project_id, settings, projects(name)")
    .eq("id", spaceId)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!space) return null;
  const project = Array.isArray(space.projects) ? space.projects[0] : space.projects;

  const { data: captures } = await admin
    .from("digital_twin_captures")
    .select("id, created_at, capture_status, error_text, capture_metadata")
    .eq("space_id", spaceId)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    spaceId: space.id,
    title: space.title,
    projectId: space.project_id ?? null,
    projectName: (project as { name?: string | null } | null)?.name ?? null,
    hasPoster: readPosterRef(space.settings) !== null,
    captures: (captures ?? []).map((c) => ({
      id: c.id,
      createdAt: c.created_at,
      status: c.capture_status ?? "draft",
      errorText: c.error_text ?? null,
      summary: parseTwinCaptureSummary(c.capture_metadata),
    })),
  };
}
