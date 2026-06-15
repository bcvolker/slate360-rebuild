import { notFound } from "next/navigation";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanProcessingStatus } from "@/lib/types/site-walk";

/** A plan set as the Plans tab needs it — identity + sheet count + status. */
export type PlansTabPlanSet = {
  id: string;
  title: string;
  pageCount: number;
  status: PlanProcessingStatus;
  processingError: string | null;
  createdAt: string;
};

export type ProjectPlansTabData = {
  projectId: string;
  projectName: string;
  planSets: PlansTabPlanSet[];
};

export async function loadProjectPlansTabData(projectId: string): Promise<ProjectPlansTabData> {
  const context = await resolveServerOrgContext();
  if (!context.user) notFound();

  const { project: scopedProject } = await getScopedProjectForUser(
    context.user.id,
    projectId,
    "id, name, org_id",
  );
  if (!scopedProject) notFound();

  const project = scopedProject as unknown as { id: string; name: string; org_id?: string | null };
  const orgId = project.org_id ?? context.orgId;

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("site_walk_plan_sets")
    .select("id, title, page_count, processing_status, processing_error, created_at")
    .eq("project_id", projectId)
    .eq("org_id", orgId ?? "")
    .neq("processing_status", "archived")
    .order("created_at", { ascending: false });

  const planSets: PlansTabPlanSet[] = ((rows ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    title: typeof r.title === "string" && r.title.trim() ? r.title : "Untitled plan set",
    pageCount: Math.max(1, Number(r.page_count ?? 1)),
    status: (r.processing_status as PlanProcessingStatus) ?? "pending",
    processingError: typeof r.processing_error === "string" ? r.processing_error : null,
    createdAt: String(r.created_at ?? ""),
  }));

  return { projectId: project.id, projectName: project.name, planSets };
}
