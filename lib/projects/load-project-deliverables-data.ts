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
  unansweredCount: number;
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

  const rows = (data as Row[] | null) ?? [];

  // Tally unanswered viewer questions (is_owner_reply=false, status='new') per
  // deliverable so the tab can badge ones that need a reply.
  const unanswered = new Map<string, number>();
  const ids = rows.map((r) => r.id);
  if (ids.length > 0) {
    const { data: questions } = await admin
      .from("site_walk_deliverable_questions")
      .select("deliverable_id")
      .in("deliverable_id", ids)
      .eq("is_owner_reply", false)
      .eq("status", "new");
    for (const q of (questions as { deliverable_id: string }[] | null) ?? []) {
      unanswered.set(q.deliverable_id, (unanswered.get(q.deliverable_id) ?? 0) + 1);
    }
  }

  const deliverables: ProjectDeliverableRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title ?? "Untitled deliverable",
    deliverableType: r.deliverable_type ?? "report",
    outputMode: r.output_mode ?? "hosted",
    status: r.status ?? "draft",
    shareToken: r.share_revoked ? null : r.share_token,
    createdAt: r.created_at,
    unansweredCount: unanswered.get(r.id) ?? 0,
  }));

  return { projectId, deliverables };
}
