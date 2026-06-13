import "server-only";

import { notFound } from "next/navigation";
import { APP_STORE_MODE } from "@/lib/app-store-mode";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTwinHubStatusChip } from "@/lib/digital-twin/twin-hub-status";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export type ProjectTwinRow = {
  id: string;
  title: string;
  statusLabel: string;
  updatedAt: string;
};

export type ProjectTwinsTabData = {
  projectId: string;
  twins: ProjectTwinRow[];
  moduleVisible: boolean;
};

export async function loadProjectTwinsTabData(projectId: string): Promise<ProjectTwinsTabData> {
  const context = await resolveServerOrgContext();
  if (!context.user) notFound();

  const { project } = await getScopedProjectForUser(context.user.id, projectId, "id");
  if (!project) notFound();

  if (APP_STORE_MODE) {
    return { projectId, twins: [], moduleVisible: false };
  }

  const admin = createAdminClient();
  const [{ data: spaces }, { data: jobs }] = await Promise.all([
    admin
      .from("digital_twin_spaces")
      .select("id, title, status, updated_at")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(50),
    admin
      .from("digital_twin_processing_jobs")
      .select("space_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const latestJobBySpace = new Map<string, string>();
  for (const job of jobs ?? []) {
    if (!latestJobBySpace.has(job.space_id)) {
      latestJobBySpace.set(job.space_id, job.status);
    }
  }

  return {
    projectId,
    moduleVisible: true,
    twins: (spaces ?? []).map((space) => ({
      id: space.id,
      title: space.title || "Digital Twin",
      statusLabel: resolveTwinHubStatusChip(space.status, latestJobBySpace.get(space.id) ?? null),
      updatedAt: space.updated_at,
    })),
  };
}
