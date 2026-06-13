import "server-only";

import { notFound } from "next/navigation";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export type ProjectWalkRow = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  startedAt: string | null;
};

export type ProjectWalksTabData = {
  projectId: string;
  walks: ProjectWalkRow[];
};

function formatStatusLabel(status: string | null | undefined): string {
  const raw = (status ?? "active").trim();
  if (!raw) return "Active";
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function loadProjectWalksTabData(projectId: string): Promise<ProjectWalksTabData> {
  const context = await resolveServerOrgContext();
  if (!context.user) notFound();

  const { project } = await getScopedProjectForUser(context.user.id, projectId, "id");
  if (!project) notFound();

  const admin = createAdminClient();
  const { data } = await admin
    .from("site_walk_sessions")
    .select("id, title, status, updated_at, started_at")
    .eq("project_id", projectId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(100);

  return {
    projectId,
    walks: (data ?? []).map((row) => ({
      id: row.id,
      title: row.title || "Site Walk",
      status: formatStatusLabel(row.status),
      updatedAt: row.updated_at,
      startedAt: row.started_at,
    })),
  };
}
