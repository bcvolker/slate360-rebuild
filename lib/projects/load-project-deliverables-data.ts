import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { getScopedProjectForUser } from "@/lib/projects/access";

export type ProjectDeliverableRow = {
  id: string;
  title: string;
  deliverableType: string;
  outputMode: string;
  status: string;
  shareToken: string | null;
  createdAt: string;
};

export type ProjectDeliverablesTabData = {
  projectId: string;
  deliverables: ProjectDeliverableRow[];
};

type Row = {
  id: string;
  title: string | null;
  deliverable_type: string | null;
  output_mode: string | null;
  status: string | null;
  share_token: string | null;
  share_revoked: boolean | null;
  created_at: string;
};

export async function loadProjectDeliverablesTabData(projectId: string): Promise<ProjectDeliverablesTabData> {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) return { projectId, deliverables: [] };

  // Ensure the caller can see this project (RLS-safe access check).
  const { project } = await getScopedProjectForUser(ctx.user.id, projectId, "id");
  if (!project) return { projectId, deliverables: [] };

  const admin = createAdminClient();
  const { data } = await admin
    .from("site_walk_deliverables")
    .select("id, title, deliverable_type, output_mode, status, share_token, share_revoked, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const deliverables: ProjectDeliverableRow[] = ((data as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    title: r.title ?? "Untitled deliverable",
    deliverableType: r.deliverable_type ?? "report",
    outputMode: r.output_mode ?? "hosted",
    status: r.status ?? "draft",
    shareToken: r.share_revoked ? null : r.share_token,
    createdAt: r.created_at,
  }));

  return { projectId, deliverables };
}
